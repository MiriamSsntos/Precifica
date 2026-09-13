/**
 * Precifica+ — Sessão e perfil do usuário via Supabase Auth.
 * Toda tela privada usa <RequireAuth>; o isolamento dos dados por
 * usuário é garantido pelo RLS no banco, não pelo front.
 */
import type { Session, User } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Profile } from "../lib/supabase";
import { getDisplayName, getInitials, supabase } from "../lib/supabase";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  company: string;
  initials: string;
}

interface AuthContextValue {
  session: Session | null;
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(sessionUser: User, profile: Profile | null): AuthUser {
  const email = sessionUser.email ?? "";
  const metadata = sessionUser.user_metadata as Record<string, unknown> | undefined;
  const displayName = getDisplayName(profile, metadata, email);
  const company =
    profile?.empresa ??
    (typeof metadata?.company === "string" ? metadata.company : "Mercado Central");
  return { id: sessionUser.id, email, displayName, company, initials: getInitials(displayName) };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProfile(sessionUser: User): Promise<Profile | null> {
      const { data } = await supabase
        .from("profiles")
        .select("id, nome, empresa, plano, telefone, cidade")
        .eq("id", sessionUser.id)
        .maybeSingle();
      return data;
    }

    async function syncSession(current: Session | null) {
      if (!mounted) return;
      setSession(current);
      if (current?.user) {
        try {
          const profile = await loadProfile(current.user);
          if (mounted) setUser(toAuthUser(current.user, profile));
        } catch {
          if (mounted) setUser(toAuthUser(current.user, null));
        }
      } else {
        setUser(null);
      }
      if (mounted) setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => syncSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => syncSession(next));
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ session, user, loading, signOut }),
    [session, user, loading, signOut]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  return ctx;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="auth-loading">Carregando sessão…</div>;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

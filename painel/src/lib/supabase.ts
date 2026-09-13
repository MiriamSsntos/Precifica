/**
 * Precifica+ — Cliente Supabase (singleton) + tipos das tabelas.
 *
 * Arquitetura Supabase-only: sem backend próprio. O front chama o
 * Supabase diretamente e o isolamento por usuário é garantido pelo
 * RLS (`auth.uid() = user_id`). A anon key é pública por design.
 */
import { createClient } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  nome: string | null;
  empresa: string | null;
  plano: string | null;
  telefone: string | null;
  cidade: string | null;
}

export interface Category {
  id: string;
  nome: string;
  slug: string | null;
}

export interface Product {
  id: string;
  nome: string;
  preco_venda: number | string | null;
  custo: number | string | null;
  margem_atual: number | string | null;
  estoque_atual: number | string | null;
  estoque_min: number | string | null;
  validade: string | null;
  unidade: string | null;
  category_id: string | null;
  created_at: string;
}

export interface Promotion {
  id: string;
  status: string | null;
}

export interface AlertRow {
  id: string;
  tipo: string;
  mensagem: string;
  created_at: string;
}

interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile };
      categories: { Row: Category };
      products: { Row: Product };
      promotions: { Row: Promotion };
      alerts: { Row: AlertRow };
    };
  };
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo painel/.env (veja .env.example)."
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export function getDisplayName(
  profile: Pick<Profile, "nome"> | null,
  metadata: Record<string, unknown> | undefined,
  email: string | undefined
): string {
  const metaName =
    typeof metadata?.full_name === "string"
      ? metadata.full_name
      : typeof metadata?.name === "string"
        ? metadata.name
        : undefined;
  return profile?.nome || metaName || email?.split("@")[0] || "Gestor";
}

export function getInitials(displayName: string): string {
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return initials || "P+";
}

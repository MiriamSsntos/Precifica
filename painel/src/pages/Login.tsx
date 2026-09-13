/**
 * Precifica+ — Tela de autenticação (login, cadastro e recuperação).
 * Lógica portada do mockup estático para React + Supabase Auth.
 */

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { LogoMark } from "../components/Logo";
import { supabase } from "../lib/supabase";
import styles from "./Login.module.css";

type AuthMode = "login" | "signup";
type OAuthProvider = "google" | "azure";

export function Login() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [alert, setAlert] = useState<{ message: string; kind: "error" | "success" } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) navigate("/", { replace: true });
  }, [session, navigate]);

  function switchMode(next: AuthMode) {
    setMode(next);
    setAlert(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAlert(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setAlert({ message: "Preencha seu e-mail e senha.", kind: "error" });
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: name.trim() || cleanEmail.split("@")[0],
              company: company.trim() || "Meu Supermercado",
            },
          },
        });
        if (error) {
          setAlert({ message: error.message || "Erro ao criar conta.", kind: "error" });
          return;
        }
        if (data.session) {
          setAlert({ message: "Conta criada com sucesso! Redirecionando…", kind: "success" });
          navigate("/");
        } else {
          setAlert({
            message:
              "Conta criada! Se a confirmação de e-mail estiver ativa, verifique sua caixa de entrada.",
            kind: "success",
          });
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            setAlert({
              message:
                'E-mail ou senha incorretos. Ainda não tem conta? Clique em "Criar conta grátis" abaixo.',
              kind: "error",
            });
          } else if (error.message.includes("Email not confirmed")) {
            setAlert({ message: "Por favor, confirme seu e-mail antes de entrar.", kind: "error" });
          } else {
            setAlert({ message: error.message || "Erro ao autenticar.", kind: "error" });
          }
          return;
        }
        if (data.session) {
          setAlert({ message: "Login realizado com sucesso! Redirecionando…", kind: "success" });
          navigate("/");
        }
      }
    } catch {
      setAlert({ message: "Ocorreu um erro inesperado ao conectar ao Supabase.", kind: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: OAuthProvider) {
    setAlert(null);
    try {
      const redirectTo = new URL("/painel/", window.location.origin).href;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error)
        setAlert({ message: error.message || "Erro ao iniciar login social.", kind: "error" });
    } catch {
      setAlert({ message: "Erro ao conectar com provedor.", kind: "error" });
    }
  }

  async function handleForgotPassword() {
    setAlert(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setAlert({
        message: 'Digite seu e-mail no campo acima e clique em "Esqueci minha senha" novamente.',
        kind: "error",
      });
      return;
    }
    setLoading(true);
    try {
      const redirectTo = new URL("/painel/login", window.location.origin).href;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });
      if (error) {
        setAlert({
          message: error.message || "Não foi possível solicitar a recuperação.",
          kind: "error",
        });
      } else {
        setAlert({
          message: "E-mail de recuperação enviado! Verifique sua caixa de entrada.",
          kind: "success",
        });
      }
    } catch {
      setAlert({ message: "Erro ao enviar solicitação de recuperação.", kind: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.body}>
      <div className={`${styles.glow} ${styles.glow1}`} aria-hidden="true" />
      <div className={`${styles.glow} ${styles.glow2}`} aria-hidden="true" />

      <div className={styles.shell}>
        <div className={styles.brand}>
          <div className={styles.brandShape} aria-hidden="true" />
          <div className={styles.brandTop}>
            <div className={styles.brandLogo}>
              <LogoMark stroke="#ffffff" />
              <span className={styles.brandLogoText}>
                Precifica<span>+</span>
              </span>
            </div>
            <div className={styles.brandMark} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 8h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 8Z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
            </div>
          </div>
          <div className={styles.brandBottom}>
            <h1>
              Bem-vindo
              <br />
              de volta.
            </h1>
            <p>Entre para acompanhar margens, estoque e promoções geradas pela IA em tempo real.</p>
            <div className={styles.brandStats}>
              <div>
                <div className={styles.statVal}>−45%</div>
                <div className={styles.statLabel}>Desperdício</div>
              </div>
              <div>
                <div className={styles.statVal}>99.2%</div>
                <div className={styles.statLabel}>Precisão da IA</div>
              </div>
              <div>
                <div className={styles.statVal}>10×</div>
                <div className={styles.statLabel}>Retorno</div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.formPanel}>
          <div className={styles.heading}>
            <h2>{mode === "signup" ? "Criar conta" : "Entrar"}</h2>
            <p>
              {mode === "signup"
                ? "Comece seu teste de 14 dias grátis no Precifica+."
                : "Acesse sua conta para gerenciar margens e estoque com IA."}
            </p>
          </div>

          {alert ? (
            <div className={`${styles.alert} ${styles[alert.kind]}`} role="alert">
              {alert.message}
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <>
                <div className={styles.field}>
                  <label htmlFor="nome">Nome completo</label>
                  <input
                    type="text"
                    id="nome"
                    placeholder="Seu nome"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="empresa">Nome do Mercado / Empresa</label>
                  <input
                    type="text"
                    id="empresa"
                    placeholder="Ex: Mercado Central"
                    autoComplete="organization"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
              </>
            ) : null}
            <div className={styles.field}>
              <label htmlFor="email">E-mail corporativo</label>
              <input
                type="email"
                id="email"
                placeholder="seu@mercado.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="senha">Senha</label>
              <input
                type="password"
                id="senha"
                placeholder="Sua senha (mínimo 6 caracteres)"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {mode === "login" ? (
              <div className={styles.rowBetween}>
                <label>
                  <input type="checkbox" defaultChecked /> Manter conectado
                </label>
                <button type="button" className={styles.linkButton} onClick={handleForgotPassword}>
                  Esqueci minha senha
                </button>
              </div>
            ) : null}
            <button
              className={`${styles.continue} ${loading ? styles.loading : ""}`}
              type="submit"
              disabled={loading}
            >
              <span className={styles.btnText}>
                {loading ? "Aguarde…" : mode === "signup" ? "Criar minha conta" : "Continuar"}
              </span>
              <span className={styles.spinner} aria-hidden="true" />
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </form>

          <div className={styles.divider}>ou conecte-se com</div>

          <div className={styles.sso}>
            <button className={styles.ssoBtn} type="button" onClick={() => handleOAuth("google")}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 3.9 1.5l2.6-2.6C16.9 3.1 14.7 2.2 12 2.2 6.9 2.2 2.7 6.4 2.7 12s4.2 9.8 9.3 9.8c5.4 0 9-3.8 9-9.1 0-.6-.1-1.1-.1-1.5H12Z"
                />
              </svg>
              Entrar com Google
            </button>
            <button className={styles.ssoBtn} type="button" onClick={() => handleOAuth("azure")}>
              <svg viewBox="0 0 23 23" aria-hidden="true">
                <path fill="#F35325" d="M1 1h10v10H1z" />
                <path fill="#81BC06" d="M12 1h10v10H12z" />
                <path fill="#05A6F0" d="M1 12h10v10H1z" />
                <path fill="#FFBA08" d="M12 12h10v10H12z" />
              </svg>
              Entrar com Microsoft
            </button>
          </div>

          <p className={styles.footer}>
            {mode === "signup" ? (
              <>
                Já tem uma conta?{" "}
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => switchMode("login")}
                >
                  Entrar
                </button>
              </>
            ) : (
              <>
                Ainda não tem conta?{" "}
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => switchMode("signup")}
                >
                  Criar conta grátis
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

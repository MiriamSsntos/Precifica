/**
 * Precifica+ — Configurações: perfil (real), plano, notificações
 * (persistidas localmente), integrações e segurança.
 */

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useConfirm } from "../components/ui/ConfirmDialog";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { supabase } from "../lib/supabase";
import styles from "./Config.module.css";

type Tab = "perfil" | "plano" | "notificacoes" | "integracoes" | "seguranca";

const TABS: { id: Tab; label: string; d: string }[] = [
  {
    id: "perfil",
    label: "Perfil",
    d: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 20c0-4 4-6 8-6s8 2 8 6",
  },
  {
    id: "plano",
    label: "Conta e Plano",
    d: "M3 6h18v13H3zM3 10h18",
  },
  {
    id: "notificacoes",
    label: "Notificações",
    d: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  },
  {
    id: "integracoes",
    label: "Integrações",
    d: "M9 3v4M15 3v4M4 11h16M6 11v9a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-9",
  },
  {
    id: "seguranca",
    label: "Segurança",
    d: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z",
  },
];

const PLAN_PRICE: Record<string, string> = {
  Essencial: "R$ 199/mês",
  "Scale IA": "R$ 399/mês",
  Enterprise: "Sob consulta",
};

interface NotifyPrefs {
  estoque: boolean;
  validade: boolean;
  promocoes: boolean;
  resumo: boolean;
  whatsapp: boolean;
}

const NOTIFY_DEFAULTS: NotifyPrefs = {
  estoque: true,
  validade: true,
  promocoes: false,
  resumo: true,
  whatsapp: false,
};

function loadPrefs(): NotifyPrefs {
  try {
    const raw = localStorage.getItem("precifica_notify_prefs");
    if (raw) return { ...NOTIFY_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* mantém padrões */
  }
  return NOTIFY_DEFAULTS;
}

export function Config() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("perfil");
  const [profileLoading, setProfileLoading] = useState(true);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState("Scale IA");
  const [savingProfile, setSavingProfile] = useState(false);

  const [prefs, setPrefs] = useState<NotifyPrefs>(loadPrefs);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("nome, empresa, telefone, plano")
          .eq("id", user.id)
          .maybeSingle();
        if (!mounted) return;
        setName(data?.nome ?? user.displayName);
        setCompany(data?.empresa ?? user.company);
        setPhone(data?.telefone ?? "");
        setPlan(data?.plano ?? "Scale IA");
      } finally {
        if (mounted) setProfileLoading(false);
      }
    }
    loadProfile();
    return () => {
      mounted = false;
    };
  }, [user]);

  function togglePref(key: keyof NotifyPrefs) {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem("precifica_notify_prefs", JSON.stringify(next));
      } catch {
        /* armazenamento indisponível */
      }
      return next;
    });
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (!name.trim() || !company.trim()) {
      toast("Preencha nome e empresa.", "error");
      return;
    }
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ nome: name.trim(), empresa: company.trim(), telefone: phone.trim() || null })
        .eq("id", user.id);
      if (error) throw error;
      toast("Perfil atualizado com sucesso!");
    } catch (e) {
      console.error("Erro ao salvar perfil:", e);
      toast("Não foi possível salvar. Tente novamente.", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (newPw.length < 6) {
      toast("A nova senha deve ter pelo menos 6 caracteres.", "error");
      return;
    }
    if (newPw !== confirmPw) {
      toast("A confirmação não coincide com a nova senha.", "error");
      return;
    }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      toast("Senha atualizada com sucesso!");
    } catch (e) {
      console.error("Erro ao trocar senha:", e);
      toast("Não foi possível atualizar a senha.", "error");
    } finally {
      setSavingPw(false);
    }
  }

  async function logoutEverywhere() {
    const ok = await confirm({
      title: "Sair de todos os dispositivos",
      message: "Isso vai encerrar sua sessão em todos os dispositivos conectados. Continuar?",
      confirmLabel: "Sair de tudo",
      danger: true,
    });
    if (!ok) return;
    await supabase.auth.signOut({ scope: "global" });
    navigate("/login");
  }

  function soon(feature: string) {
    toast(`${feature} em breve nesta versão.`, "info");
  }

  const initials = user?.initials ?? "P+";

  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Gerencie seu perfil, plano, notificações e integrações do Precifica+."
      />

      <div className={styles.layout}>
        <div className={styles.tabs} role="tablist" aria-label="Seções de configuração">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? `${styles.tab} ${styles.active}` : styles.tab}
              onClick={() => setTab(t.id)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={t.d} />
              </svg>
              {t.label}
            </button>
          ))}
        </div>

        <div className={styles.panels}>
          {tab === "perfil" ? (
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <h3>Informações do Perfil</h3>
                <p>Esses dados aparecem para sua equipe dentro do painel.</p>
              </div>
              {profileLoading ? (
                <>
                  <Skeleton width="40%" height={18} />
                  <div style={{ height: 12 }} />
                  <Skeleton height={46} />
                  <div style={{ height: 12 }} />
                  <Skeleton height={46} />
                </>
              ) : (
                <form onSubmit={saveProfile}>
                  <div className={styles.profileRow}>
                    <div className={styles.avatarLg} aria-hidden="true">
                      {initials}
                    </div>
                    <div className={styles.profileActions}>
                      <button
                        type="button"
                        className={styles.btnSecondary}
                        onClick={() => soon("Upload de foto")}
                      >
                        Trocar foto
                      </button>
                      <button
                        type="button"
                        className={`${styles.btnSecondary} ${styles.danger}`}
                        onClick={() => soon("Remoção de foto")}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <label htmlFor="nomePerfil">Nome completo</label>
                      <input
                        type="text"
                        id="nomePerfil"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="emailPerfil">E-mail corporativo</label>
                      <input type="email" id="emailPerfil" value={user?.email ?? ""} disabled />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="empresaPerfil">Nome do mercado / empresa</label>
                      <input
                        type="text"
                        id="empresaPerfil"
                        autoComplete="organization"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="telefonePerfil">WhatsApp corporativo</label>
                      <input
                        type="text"
                        id="telefonePerfil"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <button type="submit" className={styles.btnPrimary} disabled={savingProfile}>
                    {savingProfile ? "Salvando…" : "Salvar alterações"}
                  </button>
                </form>
              )}
            </div>
          ) : null}

          {tab === "plano" ? (
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <h3>Plano Atual</h3>
                <p>Gerencie sua assinatura e forma de pagamento.</p>
              </div>
              <div className={styles.planCurrent}>
                <div>
                  <div className={styles.planName}>{plan}</div>
                  <div className={styles.planDesc}>
                    Cadastro ilimitado, automação total de promoções
                  </div>
                </div>
                <div className={styles.planPrice}>{PLAN_PRICE[plan] ?? plan}</div>
              </div>
              <div className={styles.profileActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={() => soon("Upgrade de plano")}
                >
                  Fazer upgrade para Enterprise
                </button>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => soon("Histórico de faturas")}
                >
                  Ver histórico de faturas
                </button>
              </div>
            </div>
          ) : null}

          {tab === "notificacoes" ? (
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <h3>Preferências de Notificação</h3>
                <p>Escolha quando a IA deve te avisar.</p>
              </div>
              <ToggleRow
                label="Estoque crítico"
                desc="Avisar quando um produto atingir estoque mínimo"
                checked={prefs.estoque}
                onChange={() => togglePref("estoque")}
              />
              <ToggleRow
                label="Validade próxima"
                desc="Avisar quando um lote estiver perto do vencimento"
                checked={prefs.validade}
                onChange={() => togglePref("validade")}
              />
              <ToggleRow
                label="Promoções aplicadas automaticamente"
                desc="Notificar toda vez que a IA disparar uma promoção"
                checked={prefs.promocoes}
                onChange={() => togglePref("promocoes")}
              />
              <ToggleRow
                label="Relatório semanal por e-mail"
                desc="Resumo de margens e desempenho toda segunda-feira"
                checked={prefs.resumo}
                onChange={() => togglePref("resumo")}
              />
              <ToggleRow
                label="Alertas via WhatsApp"
                desc="Receber alertas críticos direto no WhatsApp corporativo"
                checked={prefs.whatsapp}
                onChange={() => togglePref("whatsapp")}
              />
            </div>
          ) : null}

          {tab === "integracoes" ? (
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <h3>Integrações</h3>
                <p>Conecte o Precifica+ ao seu PDV, ERP ou fonte de dados.</p>
              </div>
              <IntegrationRow
                name="PDV / Frente de Caixa"
                desc="Sincronização automática de vendas e estoque"
                action="Conectar"
                onAction={() => soon("Integração com PDV")}
              />
              <IntegrationRow
                name="API Externa"
                desc="Gere uma chave de API para integrar sistemas próprios"
                action="Gerar chave"
                onAction={() => soon("Geração de chave de API")}
              />
              <IntegrationRow
                name="WhatsApp Business"
                desc="Enviar alertas e relatórios diretamente pelo WhatsApp"
                action="Conectar"
                onAction={() => soon("Integração com WhatsApp")}
              />
            </div>
          ) : null}

          {tab === "seguranca" ? (
            <>
              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <h3>Senha</h3>
                  <p>Recomendamos trocar sua senha periodicamente.</p>
                </div>
                <form onSubmit={changePassword}>
                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <label htmlFor="senhaAtual">Senha atual</label>
                      <input
                        type="password"
                        id="senhaAtual"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        value={currentPw}
                        onChange={(e) => setCurrentPw(e.target.value)}
                      />
                    </div>
                    <div />
                    <div className={styles.field}>
                      <label htmlFor="senhaNova">Nova senha</label>
                      <input
                        type="password"
                        id="senhaNova"
                        placeholder="Mínimo 6 caracteres"
                        autoComplete="new-password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="senhaConfirma">Confirmar nova senha</label>
                      <input
                        type="password"
                        id="senhaConfirma"
                        placeholder="Repita a nova senha"
                        autoComplete="new-password"
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                      />
                    </div>
                  </div>
                  <button type="submit" className={styles.btnPrimary} disabled={savingPw}>
                    {savingPw ? "Atualizando…" : "Atualizar senha"}
                  </button>
                </form>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <h3>Sessão</h3>
                  <p>Encerre o acesso em todos os dispositivos conectados.</p>
                </div>
                <button
                  type="button"
                  className={`${styles.btnSecondary} ${styles.danger}`}
                  onClick={logoutEverywhere}
                >
                  Sair de todos os dispositivos
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className={styles.toggleRow}>
      <div>
        <div className={styles.tLabel}>{label}</div>
        <div className={styles.tDesc}>{desc}</div>
      </div>
      <label className={styles.switch}>
        <input type="checkbox" checked={checked} onChange={onChange} aria-label={label} />
        <span className={styles.slider} aria-hidden="true" />
      </label>
    </div>
  );
}

function IntegrationRow({
  name,
  desc,
  action,
  onAction,
}: {
  name: string;
  desc: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className={styles.integrationRow}>
      <div className={styles.integrationInfo}>
        <div className={styles.iName}>{name}</div>
        <div className={styles.iDesc}>{desc}</div>
      </div>
      <button type="button" className={styles.btnSecondary} onClick={onAction}>
        {action}
      </button>
    </div>
  );
}

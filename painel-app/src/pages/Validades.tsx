import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConfirm } from "../components/ui/ConfirmDialog";
import { ErrorState } from "../components/ui/Feedback";
import { Skeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { useAlarm } from "../context/AlarmContext";
import type { Product } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import styles from "./Validades.module.css";

interface AlarmToast {
  id: string;
  codigo: string;
  nome: string;
  days: number;
  vencido: boolean;
}

function todayMid(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function diffDays(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target.getTime() - todayMid().getTime()) / 86400000);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Sem data";
  const [y, m, d] = dateStr.split("-");
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

function money(v: number | string | null): string {
  const num = typeof v === "number" ? v : Number.parseFloat(String(v ?? "0")) || 0;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function Validades() {
  const toast = useToast();
  const confirm = useConfirm();
  const {
    config,
    updateConfig,
    openProductModal,
    refreshProducts: refreshGlobalProducts,
  } = useAlarm();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatedTime, setUpdatedTime] = useState("");

  const [isRinging, setIsRinging] = useState(false);
  const [floatingToasts, setFloatingToasts] = useState<AlarmToast[]>([]);
  const alarmedBeforeRef = useRef<Set<string>>(new Set());
  const alarmSectionRef = useRef<HTMLDivElement>(null);
  const loadRef = useRef<(() => Promise<void>) | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("products")
        .select("*")
        .order("validade", { ascending: true });
      if (err) throw err;
      setProducts((data ?? []) as Product[]);

      const now = new Date();
      setUpdatedTime(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      );
    } catch (e) {
      console.error("Erro ao buscar produtos:", e);
      setError("Não foi possível carregar os dados de validade.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRef.current = fetchProducts;
    fetchProducts();
  }, [fetchProducts]);

  // Atualiza relógio e checagem de alarme a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setUpdatedTime(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      );
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Monitoramento de alarmes e emissão de toasts locais
  const alarmedProducts = useMemo(() => {
    if (!config.enabled) return [];
    return products
      .filter((p) => {
        const dd = diffDays(p.validade);
        return dd !== null && dd <= config.days;
      })
      .sort((a, b) => (diffDays(a.validade) ?? 999) - (diffDays(b.validade) ?? 999));
  }, [products, config.enabled, config.days]);

  useEffect(() => {
    if (!config.enabled || alarmedProducts.length === 0) return;

    let hasNewAlarm = false;
    const newToasts: AlarmToast[] = [];

    for (const p of alarmedProducts) {
      const code = p.sku || p.id;
      if (!alarmedBeforeRef.current.has(code)) {
        alarmedBeforeRef.current.add(code);
        hasNewAlarm = true;
        const dd = diffDays(p.validade) ?? 0;
        newToasts.push({
          id: `${p.id}-${Date.now()}`,
          codigo: p.sku || p.id.slice(0, 8),
          nome: p.nome,
          days: dd,
          vencido: dd < 0,
        });
      }
    }

    if (hasNewAlarm) {
      setIsRinging(true);
      const ringTimer = setTimeout(() => setIsRinging(false), 1400);
      if (newToasts.length > 0) {
        setFloatingToasts((prev) => [...prev, ...newToasts]);
      }
      return () => clearTimeout(ringTimer);
    }
  }, [alarmedProducts, config.enabled]);

  // Limpeza automática dos toasts flutuantes após 7s
  const removeFloatingToast = (id: string) => {
    setFloatingToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (floatingToasts.length === 0) return;
    const timer = setTimeout(() => {
      setFloatingToasts((prev) => prev.slice(1));
    }, 7000);
    return () => clearTimeout(timer);
  }, [floatingToasts]);

  // Contadores de KPIs
  const { countVencidos, count7, count30 } = useMemo(() => {
    let vencidos = 0;
    let sete = 0;
    let trinta = 0;
    for (const p of products) {
      const dd = diffDays(p.validade);
      if (dd === null) continue;
      if (dd < 0) vencidos++;
      else if (dd <= 7) sete++;
      else if (dd <= 30) trinta++;
    }
    return { countVencidos: vencidos, count7: sete, count30: trinta };
  }, [products]);

  // Filtro e ordenação da tabela
  const visibleProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = products.filter((p) => {
      if (!term) return true;
      const matchName = p.nome.toLowerCase().includes(term);
      const matchCode = (p.sku ?? "").toLowerCase().includes(term);
      return matchName || matchCode;
    });
    return filtered.sort((a, b) => (diffDays(a.validade) ?? 999) - (diffDays(b.validade) ?? 999));
  }, [products, searchTerm]);

  const handleOpenRegister = () => {
    openProductModal(null, () => {
      fetchProducts();
      refreshGlobalProducts();
    });
  };

  const handleDeleteProduct = async (p: Product) => {
    const ok = await confirm({
      title: "Excluir produto",
      message: `Deseja realmente remover o produto "${p.nome}" do estoque?`,
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;

    try {
      const { error: err } = await supabase.from("products").delete().eq("id", p.id);
      if (err) throw err;

      setProducts((prev) => prev.filter((item) => item.id !== p.id));
      alarmedBeforeRef.current.delete(p.sku || p.id);
      refreshGlobalProducts();
      toast("Produto removido do estoque.", "success");
    } catch (e) {
      console.error("Erro ao excluir produto:", e);
      toast("Não foi possível excluir o produto.", "error");
    }
  };

  const handleBellClick = () => {
    if (alarmSectionRef.current) {
      alarmSectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.topActions}>
          <div className={styles.titleArea}>
            <Skeleton width={240} height={28} />
            <Skeleton width={120} height={16} />
          </div>
        </div>
        <div className={styles.kpiGrid}>
          <Skeleton height={100} />
          <Skeleton height={100} />
          <Skeleton height={100} />
        </div>
        <Skeleton height={140} />
        <Skeleton height={260} />
      </div>
    );
  }

  if (error && products.length === 0) {
    return (
      <div className={styles.container}>
        <ErrorState message={error} onRetry={() => loadRef.current?.()} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* ===== TOASTS FLUTUANTES DO ALARME ===== */}
      <div className={styles.toastWrap}>
        {floatingToasts.map((t) => (
          <div
            key={t.id}
            className={`${styles.toastItem} ${t.vencido ? styles.toastItemVencido : ""}`}
          >
            <div className={styles.toastIcon}>{t.vencido ? "⛔" : "⏰"}</div>
            <div className={styles.toastContent}>
              <strong>{t.vencido ? "Produto vencido!" : "Produto próximo do vencimento"}</strong>
              <span>
                {t.nome} —{" "}
                {t.vencido ? `venceu há ${Math.abs(t.days)} dia(s)` : `vence em ${t.days} dia(s)`}
              </span>
            </div>
            <button
              type="button"
              className={styles.closeToast}
              onClick={() => removeFloatingToast(t.id)}
              aria-label="Fechar notificação"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* ===== CABEÇALHO & AÇÕES ===== */}
      <div className={styles.topActions}>
        <div className={styles.titleArea}>
          <h1>Alertas de vencimento</h1>
          <span className={styles.updatedAt}>
            {updatedTime ? `Atualizado ${updatedTime}` : "Atualizado recentemente"}
          </span>
        </div>

        <div className={styles.rightControls}>
          <div className={styles.searchBox}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar produtos"
            />
          </div>

          <div className={styles.bellWrap}>
            <button
              type="button"
              className={`${styles.bellBtn} ${isRinging ? styles.bellRinging : ""}`}
              onClick={handleBellClick}
              title="Ir para o Alarme de vencimento"
              aria-label="Alarme de vencimento"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {config.enabled && alarmedProducts.length > 0 && (
                <span className={styles.bellBadge}>{alarmedProducts.length}</span>
              )}
            </button>
          </div>

          <button type="button" className={styles.btnPrimary} onClick={handleOpenRegister}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Cadastrar produto
          </button>
        </div>
      </div>

      {/* ===== CARDS DE ALERTA (KPIS) ===== */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiRowTop}>
            <span className={`${styles.pill} ${styles.pillRed}`}>Vencidos</span>
            <span className={`${styles.count} ${styles.countRed}`}>{countVencidos}</span>
          </div>
          <p className={styles.kpiDesc}>Retirar da gôndola e acionar o fornecedor de reprovação.</p>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiRowTop}>
            <span className={`${styles.pill} ${styles.pillOrange}`}>Vence em 7 dias</span>
            <span className={`${styles.count} ${styles.countOrange}`}>{count7}</span>
          </div>
          <p className={styles.kpiDesc}>Priorizar giro ou aplicar promoção de queima de estoque.</p>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiRowTop}>
            <span className={`${styles.pill} ${styles.pillOk}`}>Vence em 30 dias</span>
            <span className={`${styles.count} ${styles.countOk}`}>{count30}</span>
          </div>
          <p className={styles.kpiDesc}>Monitorar reposição; sem ação imediata necessária.</p>
        </div>
      </div>

      {/* ===== ALARME DE VENCIMENTO ===== */}
      <section
        ref={alarmSectionRef}
        className={styles.alarmSection}
        aria-label="Alarme de vencimento"
      >
        <div className={styles.alarmHead}>
          <h2 className={styles.alarmTitle}>
            <span className={styles.pulsingDot} aria-hidden="true" />
            Alarme de vencimento
          </h2>

          <div className={styles.alarmControls}>
            <label className={styles.alarmControlLabel}>
              <span className={styles.switch}>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => updateConfig({ enabled: e.target.checked })}
                />
                <span className={styles.slider} />
              </span>
              Ativar alarme
            </label>

            <label className={styles.alarmControlLabel}>
              Avisar quando faltar
              <input
                type="number"
                min="1"
                max="90"
                value={config.days}
                onChange={(e) =>
                  updateConfig({ days: Math.max(1, Number.parseInt(e.target.value, 10) || 7) })
                }
                className={styles.alarmDaysInput}
                disabled={!config.enabled}
              />
              dias
            </label>

            <label className={styles.alarmControlLabel}>
              <span className={styles.switch}>
                <input
                  type="checkbox"
                  checked={config.sound}
                  onChange={(e) => updateConfig({ sound: e.target.checked })}
                  disabled={!config.enabled}
                />
                <span className={styles.slider} />
              </span>
              Som
            </label>
          </div>
        </div>

        {!config.enabled ? (
          <div className={styles.alarmEmpty}>
            Alarme desativado. Ative para monitorar produtos próximos do vencimento.
          </div>
        ) : alarmedProducts.length === 0 ? (
          <div className={styles.alarmEmpty}>
            Nenhum produto dentro da janela de alarme ({config.days} dias). Tudo tranquilo. ✅
          </div>
        ) : (
          <div className={styles.alarmList}>
            {alarmedProducts.map((p) => {
              const dd = diffDays(p.validade) ?? 0;
              const vencido = dd < 0;
              const texto = vencido
                ? `Vencido há ${Math.abs(dd)} dia${Math.abs(dd) === 1 ? "" : "s"}`
                : `Vence em ${dd} dia${dd === 1 ? "" : "s"}`;

              return (
                <div
                  key={p.id}
                  className={`${styles.alarmItem} ${vencido ? styles.alarmItemVencido : ""}`}
                >
                  <div>
                    <div className={styles.alarmItemName}>
                      🔔 {p.nome}{" "}
                      <span className={styles.alarmItemCode}>({p.sku || p.id.slice(0, 8)})</span>
                    </div>
                    <div className={styles.alarmItemInfo}>
                      {texto} — {formatDate(p.validade)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ===== TABELA DE ESTOQUE POR VALIDADE ===== */}
      <div className={styles.tableCard}>
        <div className={styles.tableHead}>
          <h3>Estoque por validade</h3>
          <span>
            {visibleProducts.length} {visibleProducts.length === 1 ? "item" : "itens"}
          </span>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Produto</th>
                <th>Qtd.</th>
                <th>Valor</th>
                <th>Validade</th>
                <th>Status</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {visibleProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyTableRow}>
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                visibleProducts.map((p) => {
                  const dd = diffDays(p.validade);
                  let statusCls = styles.badgeOk;
                  let validadeCls = styles.validadeGreen;
                  let statusLabel = "OK";

                  if (dd === null) {
                    statusLabel = "Sem data";
                    statusCls = styles.badgeOk;
                    validadeCls = "";
                  } else if (dd < 0) {
                    statusLabel = "Vencido";
                    statusCls = styles.badgeVencido;
                    validadeCls = styles.validadeRed;
                  } else if (dd <= 7) {
                    statusLabel = `${dd} dia${dd === 1 ? "" : "s"}`;
                    statusCls = styles.badgeDias7;
                    validadeCls = styles.validadeOrange;
                  } else if (dd <= 30) {
                    statusLabel = `${dd} dias`;
                    statusCls = styles.badgeDias30;
                    validadeCls = styles.validadeYellow;
                  }

                  return (
                    <tr key={p.id}>
                      <td className={styles.cellCode}>{p.sku || "—"}</td>
                      <td className={styles.cellProduct}>{p.nome}</td>
                      <td>{p.estoque_atual ?? 0}</td>
                      <td className={styles.cellValue}>{money(p.preco_venda)}</td>
                      <td className={validadeCls}>{formatDate(p.validade)}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${statusCls}`}>
                          <span className={styles.statusDot} />
                          {statusLabel}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.delBtn}
                          onClick={() => handleDeleteProduct(p)}
                          title="Excluir produto"
                          aria-label={`Excluir ${p.nome}`}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

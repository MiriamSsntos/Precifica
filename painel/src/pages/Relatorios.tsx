/**
 * Precifica+ — Relatórios a partir de dados reais.
 * Sem tabela de vendas no schema: receita é derivada do catálogo e as
 * movimentações vêm da tabela `alerts`. Exportação CSV de verdade.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState, ErrorState } from "../components/ui/Feedback";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton, TableSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { computeStatCards, formatRelativeTime, marginChartPoints } from "../lib/dashboard";
import type { AlertRow, Category, Product } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import styles from "./Relatorios.module.css";

type Period = "7" | "30" | "90";

const PERIOD_DAYS: Record<Period, number> = { "7": 7, "30": 30, "90": 90 };

const ALERT_BADGE: Record<string, string> = {
  validade_critica: "critical",
  estoque_baixo: "warn",
  margem_baixa: "ok",
  sistema: "ok",
};

const ALERT_LABEL: Record<string, string> = {
  validade_critica: "Validade",
  estoque_baixo: "Estoque",
  margem_baixa: "Margem",
  sistema: "Sistema",
};

function toCSV(rows: AlertRow[]): string {
  const header = "data;tipo;mensagem;lida";
  const lines = rows.map((r) =>
    [
      r.created_at,
      r.tipo,
      `"${(r.mensagem || "").replace(/"/g, '""')}"`,
      r.lida ? "sim" : "não",
    ].join(";")
  );
  return [header, ...lines].join("\r\n");
}

export function Relatorios() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef<(() => void) | null>(null);
  const [period, setPeriod] = useState<Period>("30");
  const [catFilter, setCatFilter] = useState("todas");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [catRes, prodRes, alertRes] = await Promise.all([
          supabase.from("categories").select("id, nome, slug").order("nome"),
          supabase.from("products").select("*").order("created_at", { ascending: false }),
          supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(100),
        ]);
        if (!mounted) return;
        const err = catRes.error ?? prodRes.error ?? alertRes.error;
        if (err) throw err;
        setCategories((catRes.data ?? []) as Category[]);
        setProducts((prodRes.data ?? []) as Product[]);
        setAlerts((alertRes.data ?? []) as AlertRow[]);
      } catch (e) {
        console.error("Erro ao carregar relatórios:", e);
        if (mounted) setError("Não foi possível carregar os relatórios. Tente novamente.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadRef.current = load;
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const scopedProducts = useMemo(
    () => (catFilter === "todas" ? products : products.filter((p) => p.category_id === catFilter)),
    [products, catFilter]
  );

  const stats = useMemo(() => computeStatCards(scopedProducts, []), [scopedProducts]);
  const cutoff = useMemo(() => Date.now() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000, [period]);
  const periodAlerts = useMemo(
    () => alerts.filter((a) => new Date(a.created_at).getTime() >= cutoff),
    [alerts, cutoff]
  );
  const marginPoints = useMemo(
    () => marginChartPoints(categories, scopedProducts),
    [categories, scopedProducts]
  );

  function handleExport() {
    if (periodAlerts.length === 0) {
      toast("Nada para exportar no período selecionado.", "info");
      return;
    }
    const blob = new Blob([`\uFEFF${toCSV(periodAlerts)}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `precifica-relatorio-${period}d.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(`Relatório exportado (${periodAlerts.length} registros).`);
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Relatórios" subtitle="Rentabilidade e movimentações do período." />
        <div className={styles.statRow}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.card}>
              <Skeleton width="60%" height={12} />
              <div style={{ height: 10 }} />
              <Skeleton width="45%" height={24} />
            </div>
          ))}
        </div>
        <div className={styles.card}>
          <TableSkeleton rows={6} cols={4} />
        </div>
      </>
    );
  }

  if (error && products.length === 0) {
    return (
      <>
        <PageHeader title="Relatórios" subtitle="Rentabilidade e movimentações do período." />
        <ErrorState message={error} onRetry={() => loadRef.current?.()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Acompanhe rentabilidade, movimentações e o impacto das decisões da IA."
        action={
          <button type="button" className={styles.btnExport} onClick={handleExport}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14"
              />
            </svg>
            Exportar relatório
          </button>
        }
      />

      <div className={styles.filterBar}>
        <select
          className={styles.filterSelect}
          aria-label="Período"
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
        >
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
        </select>
        <select
          className={styles.filterSelect}
          aria-label="Categoria"
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
        >
          <option value="todas">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.statRow}>
        <div className={`${styles.card} ${styles.statCard}`}>
          <div className={styles.statLabel}>SKUs no Catálogo</div>
          <div className={styles.statValue}>{stats.total}</div>
          <div className={`${styles.statChange} ${styles.up}`}>Base do período</div>
        </div>
        <div className={`${styles.card} ${styles.statCard}`}>
          <div className={styles.statLabel}>Margem Média</div>
          <div className={styles.statValue}>{stats.margemMedia}%</div>
          <div className={`${styles.statChange} ${styles.up}`}>{stats.margemCaption}</div>
        </div>
        <div className={`${styles.card} ${styles.statCard}`}>
          <div className={styles.statLabel}>Lotes Críticos</div>
          <div className={styles.statValue}>{stats.vencidos + stats.criticos}</div>
          <div className={`${styles.statChange} ${styles.down}`}>Vencidos + ≤ 7 dias</div>
        </div>
        <div className={`${styles.card} ${styles.statCard}`}>
          <div className={styles.statLabel}>Alertas no Período</div>
          <div className={styles.statValue}>{periodAlerts.length}</div>
          <div className={`${styles.statChange} ${styles.up}`}>
            Últimos {PERIOD_DAYS[period]} dias
          </div>
        </div>
      </div>

      <div className={`${styles.card} ${styles.chartWrap}`}>
        <div className={styles.cardHead}>
          <h3>Margem por Categoria</h3>
          <span className={styles.tag}>Dados reais</span>
        </div>
        <svg
          viewBox="0 0 560 200"
          preserveAspectRatio="none"
          className={styles.chart}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="repFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" y1="40" x2="560" y2="40" stroke="rgba(15,23,20,0.06)" />
          <line x1="0" y1="90" x2="560" y2="90" stroke="rgba(15,23,20,0.06)" />
          <line x1="0" y1="140" x2="560" y2="140" stroke="rgba(15,23,20,0.06)" />
          <polygon
            points={marginPoints ? `0,190 ${marginPoints} 560,190` : ""}
            fill="url(#repFill)"
          />
          <polyline
            points={marginPoints}
            fill="none"
            stroke="#059669"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className={styles.legend}>
          <span>
            <i style={{ background: "#059669" }} />
            Margem média por categoria
          </span>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h3>Movimentações Detalhadas</h3>
          <span className={styles.tag}>{periodAlerts.length} registros no período</span>
        </div>
        {periodAlerts.length === 0 ? (
          <EmptyState
            title="Sem movimentações no período"
            hint="Alertas gerados pelo sistema aparecem aqui automaticamente."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Alerta</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Quando</th>
                </tr>
              </thead>
              <tbody>
                {periodAlerts.map((a) => (
                  <tr key={a.id}>
                    <td>{a.mensagem}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[ALERT_BADGE[a.tipo] ?? "ok"]}`}>
                        {ALERT_LABEL[a.tipo] ?? a.tipo}
                      </span>
                    </td>
                    <td>{a.lida ? "Lida" : "Pendente"}</td>
                    <td>{formatRelativeTime(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

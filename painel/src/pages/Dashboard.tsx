/**
 * Precifica+ — Dashboard com dados reais do Supabase.
 * Busca perfil + catálogo em paralelo e calcula tudo no cliente
 * (funções puras em lib/dashboard.ts).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { LiveAlert } from "../lib/dashboard";
import {
  activeCategoryBars,
  alertColor,
  buildAlerts,
  computeStatCards,
  computeValidity,
  marginChartPoints,
  topCategoryShares,
} from "../lib/dashboard";
import type { AlertRow, Category, Product, Promotion } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import styles from "./Dashboard.module.css";

const SPARKLINES = [
  {
    id: "sparkGreen",
    color: "#059669",
    line: "0,30 25,26 50,28 75,18 100,20 125,10 150,14 175,6 200,8",
    area: "0,30 25,26 50,28 75,18 100,20 125,10 150,14 175,6 200,8 200,40 0,40",
  },
  {
    id: "sparkCyan",
    color: "#0891b2",
    line: "0,22 25,24 50,16 75,20 100,12 125,16 150,8 175,12 200,4",
    area: "0,22 25,24 50,16 75,20 100,12 125,16 150,8 175,12 200,4 200,40 0,40",
  },
  {
    id: "sparkAmber",
    color: "#dc2626",
    line: "0,12 25,18 50,14 75,22 100,10 125,24 150,16 175,28 200,8",
    area: "0,12 25,18 50,14 75,22 100,10 125,24 150,16 175,28 200,8 200,40 0,40",
  },
  {
    id: "sparkPurple",
    color: "#7c3aed",
    line: "0,18 25,10 50,20 75,14 100,24 125,16 150,22 175,12 200,18",
    area: "0,18 25,10 50,20 75,14 100,24 125,16 150,22 175,12 200,18 200,40 0,40",
  },
];

function Sparkline({
  id,
  color,
  line,
  area,
}: {
  id: string;
  color: string;
  line: string;
  area: string;
}) {
  return (
    <svg
      className={styles.spark}
      viewBox="0 0 200 40"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" />
      <polygon points={area} fill={`url(#${id})`} />
    </svg>
  );
}

interface DashboardData {
  categories: Category[];
  products: Product[];
  promotions: Promotion[];
  alerts: LiveAlert[];
}

export function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [categoriesRes, productsRes, promotionsRes, alertsRes] = await Promise.all([
          supabase.from("categories").select("id, nome, slug").order("nome"),
          supabase.from("products").select("*").order("created_at", { ascending: false }),
          supabase.from("promotions").select("id, status"),
          supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(8),
        ]);
        if (!mounted) return;
        const err =
          categoriesRes.error ?? productsRes.error ?? promotionsRes.error ?? alertsRes.error;
        if (err) throw err;
        const products = (productsRes.data ?? []) as Product[];
        setData({
          categories: (categoriesRes.data ?? []) as Category[],
          products,
          promotions: (promotionsRes.data ?? []) as Promotion[],
          alerts: buildAlerts(products, (alertsRes.data ?? []) as AlertRow[]),
        });
      } catch (e) {
        if (mounted) {
          setError("Não foi possível carregar os dados. Verifique sua conexão e recarregue.");
          console.error("Erro ao carregar dashboard:", e);
        }
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = data ? computeStatCards(data.products, data.promotions) : null;
  const validity = data ? computeValidity(data.products) : null;
  const shares = data ? topCategoryShares(data.categories, data.products) : [];
  const bars = data ? activeCategoryBars(data.categories, data.products) : [];
  const marginPoints = data ? marginChartPoints(data.categories, data.products) : "";

  return (
    <>
      <div className={styles.heading}>
        <h1>Olá{user ? `, ${user.displayName}` : ""} 👋</h1>
        <p>Resumo em tempo real do seu estoque, margens e alertas no Supabase.</p>
      </div>

      {error ? (
        <div className={`${styles.card} ${styles.errorBanner}`} role="alert">
          {error}
        </div>
      ) : null}

      {stats?.empty ? (
        <div className={`${styles.card} ${styles.emptyBanner}`}>
          <div>
            <h4>Seu catálogo de produtos ainda não possui itens no banco</h4>
            <p>Cadastre seus primeiros SKUs para visualizar estoque, margens e sugestões da IA.</p>
          </div>
          <Link to="/produtos" className={styles.btnSecondary}>
            Cadastrar Produtos →
          </Link>
        </div>
      ) : null}

      {stats && stats.vencidos > 0 ? (
        <div className={`${styles.card} ${styles.validityBanner}`}>
          <div className={styles.bannerContent}>
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h4>
                Atenção: {stats.vencidos} produto
                {stats.vencidos > 1 ? "s estão vencidos" : " está vencido"} no estoque!
              </h4>
              <p>
                {stats.vencidos} lote(s) ultrapassaram a data de validade. Verifique o catálogo
                imediatamente para descarte ou remarcação urgente.
              </p>
            </div>
          </div>
          <Link to="/produtos" className={styles.btnAlert}>
            Verificar no Catálogo →
          </Link>
        </div>
      ) : null}

      {stats && stats.vencidos === 0 && stats.criticos > 0 ? (
        <div className={`${styles.card} ${styles.validityBanner}`}>
          <div className={styles.bannerContent}>
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h4>
                Aviso: {stats.criticos} produto{stats.criticos > 1 ? "s vencem" : " vence"} nos
                próximos 7 dias!
              </h4>
              <p>Ative promoções recomendadas pela IA para liquidar os itens antes da expiração.</p>
            </div>
          </div>
          <Link to="/produtos" className={styles.btnAlert}>
            Verificar no Catálogo →
          </Link>
        </div>
      ) : null}

      <div className={styles.statRow}>
        <div className={`${styles.card} ${styles.statCard}`}>
          <div className={styles.statLabel}>Margem Média do Catálogo</div>
          <div className={styles.statValue}>{stats ? `${stats.margemMedia}%` : "…"}</div>
          <div className={`${styles.statChange} ${styles.up}`}>
            {stats ? stats.margemCaption : "Carregando dados…"}
          </div>
          <Sparkline {...SPARKLINES[0]} />
        </div>

        <div className={`${styles.card} ${styles.statCard}`}>
          <div className={styles.statLabel}>Produtos Cadastrados</div>
          <div className={styles.statValue}>{stats ? stats.total : "…"}</div>
          <div
            className={
              stats && stats.estoqueBaixo > 0
                ? styles.statChange
                : `${styles.statChange} ${styles.up}`
            }
            style={
              stats && stats.estoqueBaixo > 0
                ? { color: "var(--neon-red)" }
                : { color: "var(--primary)" }
            }
          >
            {!stats
              ? "Carregando dados…"
              : stats.estoqueBaixo > 0
                ? `⚠️ ${stats.estoqueBaixo} itens com estoque baixo`
                : "✅ Estoque sob controle"}
          </div>
          <Sparkline {...SPARKLINES[1]} />
        </div>

        <div className={`${styles.card} ${styles.statCard}`}>
          <div className={styles.statLabel}>Validade Crítica &amp; Vencidos</div>
          <div className={styles.statValue}>{stats ? stats.vencidos + stats.criticos : "…"}</div>
          <div
            className={
              stats && (stats.vencidos > 0 || stats.criticos > 0)
                ? styles.statChange
                : `${styles.statChange} ${styles.up}`
            }
            style={
              !stats
                ? undefined
                : stats.vencidos > 0
                  ? { color: "var(--neon-red)" }
                  : stats.criticos > 0
                    ? { color: "var(--neon-amber)" }
                    : { color: "var(--primary)" }
            }
          >
            {!stats
              ? "Conferindo validades…"
              : stats.vencidos > 0
                ? `🚨 ${stats.vencidos} vencido${stats.vencidos > 1 ? "s" : ""} no estoque!`
                : stats.criticos > 0
                  ? `⚠️ ${stats.criticos} a vencer em 7 dias`
                  : "✅ 100% dos lotes em dia"}
          </div>
          <Sparkline {...SPARKLINES[2]} />
        </div>

        <div className={`${styles.card} ${styles.statCard}`}>
          <div className={styles.statLabel}>Promoções Ativas</div>
          <div className={styles.statValue}>{stats ? stats.promocoesAtivas : "…"}</div>
          <div className={`${styles.statChange} ${styles.up}`}>
            {!stats
              ? "Carregando dados…"
              : stats.promocoesAtivas > 0
                ? `${stats.promocoesAtivas} ativas no catálogo`
                : "Nenhuma promoção ativa"}
          </div>
          <Sparkline {...SPARKLINES[3]} />
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3>Margem por Categoria</h3>
            <span className={styles.tag}>Supabase Real</span>
          </div>
          <svg
            viewBox="0 0 560 200"
            preserveAspectRatio="none"
            className={styles.lineChart}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="0" y1="40" x2="560" y2="40" stroke="rgba(15,23,20,0.06)" />
            <line x1="0" y1="90" x2="560" y2="90" stroke="rgba(15,23,20,0.06)" />
            <line x1="0" y1="140" x2="560" y2="140" stroke="rgba(15,23,20,0.06)" />
            <polygon
              points={marginPoints ? `0,190 ${marginPoints} 560,190` : ""}
              fill="url(#lineFill)"
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
              Margem média realizada
            </span>
            <span>
              <i style={{ background: "#0891b2" }} />
              Meta recomendada
            </span>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3>Mix de Produtos por Categoria</h3>
            <span className={styles.tag}>
              {data ? `${data.categories.length} categorias` : "…"}
            </span>
          </div>
          <div className={styles.hbarList}>
            {!data || shares.length === 0 ? (
              <div className={styles.emptyMsg}>
                <p>Nenhuma categoria com produtos.</p>
                <span>Cadastre produtos para visualizar a distribuição do seu catálogo.</span>
              </div>
            ) : (
              shares.map((item) => (
                <div className={styles.hbarRow} key={item.nome}>
                  <span className={styles.lbl}>{item.nome}</span>
                  <div className={styles.hbarTrack}>
                    <div
                      className={styles.hbarFill}
                      style={{ width: `${item.pct}%`, background: item.color }}
                    />
                  </div>
                  <span className={styles.val}>{item.pct}%</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={styles.lowerGrid}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3>Validades sob Controle</h3>
          </div>
          <div className={styles.donutWrap}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--panel-2)" strokeWidth="12" />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#059669"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray="314"
                strokeDashoffset={validity ? 314 - (314 * validity.pct) / 100 : 314}
                transform="rotate(-90 60 60)"
              />
              <text
                x="60"
                y="66"
                textAnchor="middle"
                fontFamily="Outfit, sans-serif"
                fontWeight="700"
                fontSize="22"
                fill="#0f1e18"
              >
                {validity ? `${validity.pct}%` : "0%"}
              </text>
            </svg>
            <div className={styles.donutCaption}>
              {!validity || validity.total === 0
                ? "Nenhum produto cadastrado no banco."
                : validity.expired > 0
                  ? `${validity.expired} vencido(s) e ${validity.nearExpiry} vencendo em até 7 dias (${validity.safe} em dia).`
                  : validity.nearExpiry > 0
                    ? `${validity.safe} de ${validity.total} produtos com validade segura (${validity.nearExpiry} vencendo em até 7 dias).`
                    : "100% dos seus produtos estão com validade segura acima de 7 dias."}
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3>Itens por Categoria</h3>
          </div>
          <div className={styles.barChart}>
            {bars.length === 0 ? (
              <div className={styles.emptyMsg} style={{ width: "100%" }}>
                <p>Sem dados de categorias</p>
              </div>
            ) : (
              bars.map((item) => (
                <div className={styles.barCol} key={item.nome}>
                  <div
                    className={styles.bar}
                    style={{ height: `${item.heightPct}%`, background: item.color }}
                  />
                  <span className={styles.barLbl}>{item.nome}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h3>Alertas Recentes</h3>
            <span className={styles.tag}>{data ? `${data.alerts.length} ativos` : "Supabase"}</span>
          </div>
          <div className={styles.alertList}>
            {!data || data.alerts.length === 0 ? (
              <div className={styles.emptyMsg}>
                <p>🎉 Nenhum alerta pendente</p>
                <span>Validades e estoques estão em dia no banco de dados.</span>
              </div>
            ) : (
              data.alerts.map((alerta) => (
                <div className={styles.alertItem} key={`${alerta.tipo}:${alerta.mensagem}`}>
                  <span
                    className={styles.alertDot}
                    style={{ background: alertColor(alerta.tipo) }}
                  />
                  <div>
                    <p>{alerta.mensagem}</p>
                    <span>{alerta.timeStr}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

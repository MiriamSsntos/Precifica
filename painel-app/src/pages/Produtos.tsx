/**
 * Precifica+ — Catálogo de produtos (CRUD + KPIs + filtros).
 * 100% Supabase: sem rascunho local, sem dados de demonstração.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useConfirm } from "../components/ui/ConfirmDialog";
import { EmptyState, ErrorState } from "../components/ui/Feedback";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton, TableSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { useAlarm } from "../context/AlarmContext";
import { ensureDefaultCategories } from "../lib/categories";
import { computeStatCards, productMargin } from "../lib/dashboard";
import { formatCurrency, formatDateBR, marginTone } from "../lib/format";
import type { StatusFilter } from "../lib/products";
import { filterProducts, validityBadge } from "../lib/products";
import type { Category, Product } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import styles from "./Produtos.module.css";

const BADGE_TONE_CLASS = {
  ok: "badgeOk",
  warn: "badgeWarn",
  critical: "badgeCritical",
} as const;

const MARGIN_TONE_CLASS = {
  high: "marginHigh",
  mid: "marginMid",
  low: "marginLow",
} as const;

export function Produtos() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { openProductModal } = useAlarm();
  const [searchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef<(() => void) | null>(null);

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");

  // Sincroniza busca com query string da URL (?busca=...)
  useEffect(() => {
    const q = searchParams.get("busca");
    if (q !== null) {
      setSearch(q);
    }
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [catRes, prodRes] = await Promise.all([
          supabase.from("categories").select("id, nome, slug").order("nome"),
          supabase.from("products").select("*").order("created_at", { ascending: false }),
        ]);
        if (!mounted) return;
        const err = catRes.error ?? prodRes.error;
        if (err) throw err;

        let cats = (catRes.data ?? []) as Category[];
        if (cats.length === 0 && user?.id) {
          try {
            cats = await ensureDefaultCategories(user.id);
          } catch (catErr) {
            console.warn("Não foi possível provisionar categorias padrão:", catErr);
          }
        }
        setCategories(cats);
        setProducts((prodRes.data ?? []) as Product[]);
      } catch (e) {
        console.error("Erro ao carregar produtos:", e);
        if (mounted) setError("Não foi possível carregar o catálogo. Tente novamente.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadRef.current = load;
    load();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const catNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.id, c.nome);
    return map;
  }, [categories]);

  const filtered = useMemo(
    () => filterProducts(products, search, catFilter, statusFilter),
    [products, search, catFilter, statusFilter]
  );

  const stats = useMemo(() => computeStatCards(products, []), [products]);

  const openNew = () => {
    openProductModal(null, () => loadRef.current?.());
  };

  const openEdit = (p: Product) => {
    openProductModal(p, () => loadRef.current?.());
  };

  async function handleDelete(p: Product) {
    const ok = await confirm({
      title: "Excluir produto",
      message: `Deseja realmente remover "${p.nome}" do catálogo? Essa ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    try {
      const { error: err } = await supabase.from("products").delete().eq("id", p.id);
      if (err) throw err;
      toast("Produto excluído.");
      loadRef.current?.();
    } catch (e) {
      console.error("Erro ao excluir produto:", e);
      toast("Não foi possível excluir. Tente novamente.", "error");
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Produtos" subtitle="Cadastro, precificação e estoque de perecíveis." />
        <div className={styles.statRow}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.card}>
              <Skeleton width="55%" height={12} />
              <div style={{ height: 10 }} />
              <Skeleton width="40%" height={26} />
            </div>
          ))}
        </div>
        <div className={styles.card}>
          <TableSkeleton rows={8} cols={6} />
        </div>
      </>
    );
  }

  if (error && products.length === 0) {
    return (
      <>
        <PageHeader title="Produtos" subtitle="Cadastro, precificação e estoque de perecíveis." />
        <ErrorState message={error} onRetry={() => loadRef.current?.()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Produtos"
        subtitle="Cadastro, precificação e acompanhamento de estoque de perecíveis."
        action={
          <button type="button" className={styles.btnAdd} onClick={openNew}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo Produto
          </button>
        }
      />

      <div className={styles.statRow}>
        <div className={`${styles.card} ${styles.statCard}`}>
          <div className={styles.statLabel}>Total Cadastrado</div>
          <div className={styles.statValue}>{stats.total}</div>
          <div className={styles.statDesc}>Itens ativos no catálogo</div>
        </div>
        <div className={`${styles.card} ${styles.statCard}`}>
          <div className={styles.statLabel}>Validade Crítica</div>
          <div className={styles.statValue}>{stats.criticos}</div>
          <div className={`${styles.statDesc} ${styles.alert}`}>Vencem nos próximos 7 dias</div>
        </div>
        <div className={`${styles.card} ${styles.statCard}`}>
          <div className={styles.statLabel}>Estoque Baixo</div>
          <div className={styles.statValue}>{stats.estoqueBaixo}</div>
          <div className={`${styles.statDesc} ${styles.warn}`}>Abaixo do mínimo seguro</div>
        </div>
        <div className={`${styles.card} ${styles.statCard}`}>
          <div className={styles.statLabel}>Margem Média</div>
          <div className={styles.statValue}>{stats.margemMedia}%</div>
          <div className={`${styles.statDesc} ${styles.ok}`}>Geral do catálogo</div>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <div className={styles.searchWrap}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome ou SKU…"
              aria-label="Buscar produtos"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className={styles.filterSelect}
            aria-label="Filtrar por categoria"
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
        <div className={styles.filterGroup}>
          <select
            className={styles.filterSelect}
            aria-label="Filtrar por status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="todos">Todos os status</option>
            <option value="validade">Validade próxima (≤ 7d)</option>
            <option value="estoque">Estoque baixo</option>
            <option value="margem_baixa">Margem baixa (&lt; 15%)</option>
          </select>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h3>Catálogo de Produtos</h3>
          <span className={styles.tag}>Tempo real</span>
        </div>
        {filtered.length === 0 ? (
          products.length === 0 ? (
            <EmptyState
              title="Catálogo vazio"
              hint="Cadastre seu primeiro produto para começar a acompanhar estoque e margens."
              action={
                <button type="button" className={styles.btnAdd} onClick={openNew}>
                  Novo Produto
                </button>
              }
            />
          ) : (
            <EmptyState
              title="Nenhum produto encontrado"
              hint="Tente alterar os filtros de busca ou categoria para encontrar o item."
              action={
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => {
                    setSearch("");
                    setCatFilter("todas");
                    setStatusFilter("todos");
                  }}
                >
                  Limpar filtros
                </button>
              }
            />
          )
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Custo / Venda</th>
                  <th>Margem</th>
                  <th>Estoque</th>
                  <th>Validade</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const badge = validityBadge(p.validade);
                  const margin = productMargin(p);
                  const tone = marginTone(margin ?? 0);
                  const catNome = (p.category_id && catNameById.get(p.category_id)) || "—";
                  const estoque = Number.parseInt(String(p.estoque_atual), 10) || 0;
                  const estMin = Number.parseInt(String(p.estoque_min), 10) || 5;
                  const estoqueBaixo = estoque <= estMin;

                  return (
                    <tr key={p.id}>
                      <td>
                        <div className={styles.productCell}>
                          <span className={styles.productName}>{p.nome}</span>
                          <span className={styles.productSku}>{p.sku || "—"}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.categoryTag}>{catNome}</span>
                      </td>
                      <td>
                        <div className={styles.priceCell}>
                          <span className={styles.priceVenda}>
                            {formatCurrency(Number.parseFloat(String(p.preco_venda)) || 0)}
                          </span>
                          <span className={styles.priceCusto}>
                            Custo: {formatCurrency(Number.parseFloat(String(p.custo)) || 0)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.marginTag} ${styles[MARGIN_TONE_CLASS[tone]]}`}>
                          {margin !== null ? `${margin.toFixed(1)}%` : "—"}
                        </span>
                      </td>
                      <td>
                        <div className={styles.stockCell}>
                          <span className={estoqueBaixo ? styles.stockLow : styles.stockOk}>
                            {estoque} un
                          </span>
                          {estoqueBaixo && <span className={styles.stockWarn}>Mín: {estMin}</span>}
                        </div>
                      </td>
                      <td>
                        {badge ? (
                          <span
                            className={`${styles.badge} ${styles[BADGE_TONE_CLASS[badge.tone]]}`}
                          >
                            {badge.label}
                          </span>
                        ) : (
                          <span className={styles.textDim}>{formatDateBR(p.validade)}</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.btnAction}
                            title="Editar produto"
                            aria-label={`Editar ${p.nome}`}
                            onClick={() => openEdit(p)}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              aria-hidden="true"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className={`${styles.btnAction} ${styles.btnDanger}`}
                            title="Excluir produto"
                            aria-label={`Excluir ${p.nome}`}
                            onClick={() => handleDelete(p)}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              aria-hidden="true"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

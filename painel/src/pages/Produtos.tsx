/**
 * Precifica+ — Catálogo de produtos (CRUD + KPIs + filtros).
 * 100% Supabase: sem rascunho local, sem dados de demonstração.
 */

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useConfirm } from "../components/ui/ConfirmDialog";
import { EmptyState, ErrorState } from "../components/ui/Feedback";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton, TableSkeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { computeStatCards, productMargin } from "../lib/dashboard";
import { formatCurrency, formatDateBR, marginTone } from "../lib/format";
import type { StatusFilter } from "../lib/products";
import { filterProducts, validityBadge } from "../lib/products";
import type { Category, Product } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import styles from "./Produtos.module.css";

interface ProductForm {
  nome: string;
  sku: string;
  category_id: string;
  custo: string;
  preco: string;
  estoque: string;
  estoqueMin: string;
  validade: string;
}

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

const EMPTY_FORM: ProductForm = {
  nome: "",
  sku: "",
  category_id: "",
  custo: "",
  preco: "",
  estoque: "10",
  estoqueMin: "5",
  validade: "",
};

function formFromProduct(p: Product): ProductForm {
  return {
    nome: p.nome ?? "",
    sku: p.sku && p.sku !== "—" ? p.sku : "",
    category_id: p.category_id ?? "",
    custo: String(p.custo ?? ""),
    preco: String(p.preco_venda ?? ""),
    estoque: String(p.estoque_atual ?? "0"),
    estoqueMin: String(p.estoque_min ?? "5"),
    validade: p.validade ?? "",
  };
}

export function Produtos() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef<(() => void) | null>(null);

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

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
        setCategories((catRes.data ?? []) as Category[]);
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
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    if (modalOpen) nameInputRef.current?.focus();
  }, [modalOpen]);

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
  const marginPreview = useMemo(() => {
    const custo = Number.parseFloat(form.custo) || 0;
    const preco = Number.parseFloat(form.preco) || 0;
    if (preco <= 0) return { text: "0.0% (R$ 0,00 lucro)", tone: "high" as const };
    const margin = ((preco - custo) / preco) * 100;
    const tone =
      margin >= 25 ? ("high" as const) : margin >= 15 ? ("mid" as const) : ("low" as const);
    return { text: `${margin.toFixed(1)}% (${formatCurrency(preco - custo)} lucro)`, tone };
  }, [form.custo, form.preco]);

  function setField<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm(formFromProduct(p));
    setModalOpen(true);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    const nome = form.nome.trim();
    const preco = Number.parseFloat(form.preco) || 0;
    if (!nome || preco <= 0) {
      toast("Preencha o nome do produto e um preço de venda válido.", "error");
      return;
    }
    if (!user) {
      toast("Sessão expirada. Entre novamente.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome,
        sku: form.sku.trim() || null,
        category_id: form.category_id || null,
        custo: Number.parseFloat(form.custo) || 0,
        preco_venda: preco,
        estoque_atual: Number.parseInt(form.estoque, 10) || 0,
        estoque_min: Number.parseInt(form.estoqueMin, 10) || 5,
        validade: form.validade || null,
      };
      if (editingId) {
        const { error: err } = await supabase.from("products").update(payload).eq("id", editingId);
        if (err) throw err;
        toast("Produto atualizado com sucesso!");
      } else {
        const { error: err } = await supabase
          .from("products")
          .insert([{ ...payload, user_id: user.id }]);
        if (err) throw err;
        toast("Produto cadastrado com sucesso!");
      }
      closeModal();
      loadRef.current?.();
    } catch (e) {
      console.error("Erro ao salvar produto:", e);
      toast("Não foi possível salvar. Verifique os dados e tente de novo.", "error");
    } finally {
      setSaving(false);
    }
  }

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
          <div className={styles.statLabel}>Total de SKUs</div>
          <div className={styles.statValue}>{stats.total}</div>
          <div className={styles.statDesc}>Itens ativos no catálogo</div>
        </div>
        <div className={`${styles.card} ${styles.statCard}`}>
          <div className={styles.statLabel}>Validade Crítica</div>
          <div className={styles.statValue}>{stats.vencidos + stats.criticos}</div>
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
              hint="Tente ajustar os filtros ou cadastre um novo produto acima."
            />
          )
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Produto &amp; SKU</th>
                  <th>Categoria</th>
                  <th>Custo</th>
                  <th>Venda</th>
                  <th>Margem</th>
                  <th>Estoque</th>
                  <th>Validade</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const margin = productMargin(p) ?? 0;
                  const badge = validityBadge(p.validade);
                  const estoque = Number.parseInt(String(p.estoque_atual), 10) || 0;
                  const estMin = Number.parseInt(String(p.estoque_min), 10) || 5;
                  const baixo = estoque <= estMin;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className={styles.productCell}>
                          <span className={styles.productName}>{p.nome}</span>
                          <span className={styles.productSku}>SKU: {p.sku || "—"}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.categoryPill}>
                          {(p.category_id && catNameById.get(p.category_id)) || "Geral"}
                        </span>
                      </td>
                      <td>{formatCurrency(p.custo)}</td>
                      <td>
                        <strong>{formatCurrency(p.preco_venda)}</strong>
                      </td>
                      <td>
                        <span
                          className={`${styles.marginTag} ${styles[MARGIN_TONE_CLASS[marginTone(margin)]]}`}
                        >
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <div>
                          <strong>{estoque} un</strong>
                          <span className={styles.stockMin}> (mín. {estMin})</span>
                          {baixo ? <div className={styles.stockLow}>Estoque baixo</div> : null}
                        </div>
                      </td>
                      <td>
                        {badge ? (
                          <div className={styles.validityCell}>
                            <span
                              className={`${styles.badge} ${styles[BADGE_TONE_CLASS[badge.tone]]}`}
                            >
                              {badge.label}
                            </span>
                            <span
                              className={
                                badge.expiredStyle
                                  ? `${styles.validityDate} ${styles.expired}`
                                  : styles.validityDate
                              }
                            >
                              {formatDateBR(p.validade)}
                            </span>
                          </div>
                        ) : (
                          <div className={styles.validityCell}>
                            <span className={`${styles.badge} ${styles.ok}`}>Sem data</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className={styles.actionsCell}>
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.edit}`}
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
                            className={`${styles.actionBtn} ${styles.delete}`}
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

      {modalOpen ? (
        <div className={styles.overlay} onClick={closeModal}>
          <div
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? "Editar produto" : "Cadastrar novo produto"}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>{editingId ? "Editar Produto" : "Cadastrar Novo Produto"}</h2>
              <button
                type="button"
                className={styles.btnClose}
                title="Fechar"
                aria-label="Fechar modal"
                onClick={closeModal}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="20"
                  height="20"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className={styles.modalBody}>
                <div className={styles.sectionTitle}>1. Identificação do Produto</div>
                <div className={styles.formGrid}>
                  <div className={`${styles.field} ${styles.full}`}>
                    <label htmlFor="prodNome">Nome do Produto *</label>
                    <input
                      type="text"
                      id="prodNome"
                      ref={nameInputRef}
                      placeholder="Ex: Banana Prata Climatizada"
                      required
                      value={form.nome}
                      onChange={(e) => setField("nome", e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="prodSku">SKU / Código EAN</label>
                    <input
                      type="text"
                      id="prodSku"
                      placeholder="Ex: HOR-0010 ou 789..."
                      value={form.sku}
                      onChange={(e) => setField("sku", e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="prodCategoria">Categoria *</label>
                    <select
                      id="prodCategoria"
                      required
                      value={form.category_id}
                      onChange={(e) => setField("category_id", e.target.value)}
                    >
                      <option value="">Selecione uma categoria…</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.sectionTitle}>2. Custos &amp; Precificação</div>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label htmlFor="prodCusto">Preço de Custo (R$) *</label>
                    <input
                      type="number"
                      id="prodCusto"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      required
                      value={form.custo}
                      onChange={(e) => setField("custo", e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="prodPreco">Preço de Venda (R$) *</label>
                    <input
                      type="number"
                      id="prodPreco"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      required
                      value={form.preco}
                      onChange={(e) => setField("preco", e.target.value)}
                    />
                  </div>
                  <div className={styles.marginPreview}>
                    <span>Margem Bruta Estimada:</span>
                    <span className={styles[MARGIN_TONE_CLASS[marginPreview.tone]]}>
                      {marginPreview.text}
                    </span>
                  </div>
                </div>

                <div className={styles.sectionTitle}>3. Estoque &amp; Perecibilidade</div>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label htmlFor="prodEstoque">Estoque Atual *</label>
                    <input
                      type="number"
                      id="prodEstoque"
                      min="0"
                      required
                      value={form.estoque}
                      onChange={(e) => setField("estoque", e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="prodEstoqueMin">Estoque Mínimo (Alerta) *</label>
                    <input
                      type="number"
                      id="prodEstoqueMin"
                      min="0"
                      required
                      value={form.estoqueMin}
                      onChange={(e) => setField("estoqueMin", e.target.value)}
                    />
                  </div>
                  <div className={`${styles.field} ${styles.full}`}>
                    <label htmlFor="prodValidade">Data de Validade (Lote atual) *</label>
                    <input
                      type="date"
                      id="prodValidade"
                      required
                      value={form.validade}
                      onChange={(e) => setField("validade", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnAdd} disabled={saving}>
                  {saving ? "Salvando…" : editingId ? "Salvar Alterações" : "Salvar Produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

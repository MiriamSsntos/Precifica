/**
 * Precifica+ — Promoções: regras vigentes + sugestões da IA.
 * Sugestão = regra transparente sobre validades (≤7 dias sem promo ativa).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useConfirm } from "../components/ui/ConfirmDialog";
import { EmptyState, ErrorState } from "../components/ui/Feedback";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { useToast } from "../components/ui/Toast";
import { daysUntilValidity } from "../lib/dashboard";
import { formatCurrency, formatDateBR } from "../lib/format";
import type { Category, Product, Promotion } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import styles from "./Promocoes.module.css";

interface Suggestion {
  product: Product;
  days: number;
  discount: number;
  promoPrice: number;
}

function suggestDiscount(days: number): number {
  if (days < 0) return 35;
  if (days <= 3) return 25;
  return 15;
}

function buildSuggestions(products: Product[], promotions: Promotion[]): Suggestion[] {
  const activeIds = new Set(
    promotions.filter((p) => p.status === "ativa").map((p) => p.product_id)
  );
  const out: Suggestion[] = [];
  for (const p of products) {
    const days = daysUntilValidity(p.validade);
    if (days === null || days > 7 || activeIds.has(p.id)) continue;
    const preco = Number.parseFloat(String(p.preco_venda ?? 0));
    if (preco <= 0) continue;
    const discount = suggestDiscount(days);
    out.push({ product: p, days, discount, promoPrice: preco * (1 - discount / 100) });
  }
  return out.sort((a, b) => a.days - b.days);
}

const STATUS_LABEL: Record<string, string> = {
  ativa: "Ativa",
  pausada: "Pausada",
  encerrada: "Encerrada",
};

export function Promocoes() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef<(() => void) | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [catRes, prodRes, promoRes] = await Promise.all([
          supabase.from("categories").select("id, nome, slug").order("nome"),
          supabase.from("products").select("*").order("created_at", { ascending: false }),
          supabase.from("promotions").select("*").order("created_at", { ascending: false }),
        ]);
        if (!mounted) return;
        const err = catRes.error ?? prodRes.error ?? promoRes.error;
        if (err) throw err;
        setCategories((catRes.data ?? []) as Category[]);
        setProducts((prodRes.data ?? []) as Product[]);
        setPromotions((promoRes.data ?? []) as Promotion[]);
      } catch (e) {
        console.error("Erro ao carregar promoções:", e);
        if (mounted) setError("Não foi possível carregar as promoções. Tente novamente.");
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

  const catNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.id, c.nome);
    return map;
  }, [categories]);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const suggestions = useMemo(() => buildSuggestions(products, promotions), [products, promotions]);

  async function applySuggestion(s: Suggestion) {
    if (!user) return;
    setApplyingId(s.product.id);
    try {
      const { error: err } = await supabase.from("promotions").insert([
        {
          user_id: user.id,
          product_id: s.product.id,
          desconto_pct: s.discount,
          preco_promocional: Number(s.promoPrice.toFixed(2)),
          data_fim: s.product.validade,
          status: "ativa",
        },
      ]);
      if (err) throw err;
      toast(`Promoção de ${s.discount}% aplicada em "${s.product.nome}".`);
      loadRef.current?.();
    } catch (e) {
      console.error("Erro ao aplicar promoção:", e);
      toast("Não foi possível aplicar a promoção.", "error");
    } finally {
      setApplyingId(null);
    }
  }

  async function setStatus(promo: Promotion, status: string) {
    try {
      const { error: err } = await supabase
        .from("promotions")
        .update({ status })
        .eq("id", promo.id);
      if (err) throw err;
      toast(`Promoção ${STATUS_LABEL[status]?.toLowerCase() ?? status}.`, "info");
      loadRef.current?.();
    } catch (e) {
      console.error("Erro ao atualizar promoção:", e);
      toast("Não foi possível atualizar o status.", "error");
    }
  }

  async function removePromotion(promo: Promotion) {
    const product = productById.get(promo.product_id);
    const ok = await confirm({
      title: "Encerrar promoção",
      message: `Remover a promoção de "${product?.nome ?? "produto"}"? O preço volta ao normal.`,
      confirmLabel: "Encerrar",
      danger: true,
    });
    if (!ok) return;
    try {
      const { error: err } = await supabase.from("promotions").delete().eq("id", promo.id);
      if (err) throw err;
      toast("Promoção encerrada.");
      loadRef.current?.();
    } catch (e) {
      console.error("Erro ao remover promoção:", e);
      toast("Não foi possível encerrar.", "error");
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader
          title="Promoções IA"
          subtitle="Sugestões e automações de ofertas geradas pela IA."
        />
        <div className={styles.card}>
          <Skeleton width="40%" height={18} />
          <div style={{ height: 14 }} />
          <Skeleton height={64} />
          <div style={{ height: 10 }} />
          <Skeleton height={64} />
        </div>
      </>
    );
  }

  if (error && promotions.length === 0 && products.length === 0) {
    return (
      <>
        <PageHeader
          title="Promoções IA"
          subtitle="Sugestões e automações de ofertas geradas pela IA."
        />
        <ErrorState message={error} onRetry={() => loadRef.current?.()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Promoções IA"
        subtitle="Sugestões e automações de ofertas geradas pela IA."
      />

      <section className={styles.card} aria-label="Sugestões da IA">
        <div className={styles.cardHead}>
          <h3>Sugestões da IA</h3>
          <span className={styles.tag}>{suggestions.length} pendentes</span>
        </div>
        {suggestions.length === 0 ? (
          <p className={styles.muted}>
            Nenhuma sugestão no momento — nenhum lote crítico sem promoção ativa. ✅
          </p>
        ) : (
          <ul className={styles.list}>
            {suggestions.map((s) => (
              <li key={s.product.id} className={styles.row}>
                <div>
                  <div className={styles.name}>{s.product.nome}</div>
                  <div className={styles.meta}>
                    {(s.product.category_id && catNameById.get(s.product.category_id)) || "Geral"} ·{" "}
                    {s.days < 0 ? "vencido" : s.days === 0 ? "vence hoje" : `vence em ${s.days}d`} ·{" "}
                    {formatCurrency(s.product.preco_venda)} →{" "}
                    <strong>{formatCurrency(s.promoPrice)}</strong>
                  </div>
                </div>
                <div className={styles.rowActions}>
                  <span className={`${styles.badge} ${styles.suggested}`}>
                    −{s.discount}% sugerido
                  </span>
                  <button
                    type="button"
                    className={styles.btnApply}
                    disabled={applyingId === s.product.id}
                    onClick={() => applySuggestion(s)}
                  >
                    {applyingId === s.product.id ? "Aplicando…" : "Aplicar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.card} aria-label="Promoções vigentes">
        <div className={styles.cardHead}>
          <h3>Promoções vigentes</h3>
          <span className={styles.tag}>{promotions.length} regras</span>
        </div>
        {promotions.length === 0 ? (
          <EmptyState
            title="Nenhuma promoção cadastrada"
            hint="Aplique uma sugestão da IA acima para criar a primeira."
          />
        ) : (
          <ul className={styles.list}>
            {promotions.map((promo) => {
              const product = productById.get(promo.product_id);
              const discount = Number.parseFloat(String(promo.desconto_pct)) || 0;
              return (
                <li key={promo.id} className={styles.row}>
                  <div>
                    <div className={styles.name}>{product?.nome ?? "Produto removido"}</div>
                    <div className={styles.meta}>
                      −{discount}% · {formatCurrency(promo.preco_promocional)} · até{" "}
                      {formatDateBR(promo.data_fim)}
                    </div>
                  </div>
                  <div className={styles.rowActions}>
                    <span
                      className={`${styles.badge} ${styles[promo.status ?? "ativa"] ?? styles.ativa}`}
                    >
                      {STATUS_LABEL[promo.status ?? ""] ?? promo.status}
                    </span>
                    {promo.status === "ativa" ? (
                      <button
                        type="button"
                        className={styles.btnGhost}
                        onClick={() => setStatus(promo, "pausada")}
                      >
                        Pausar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.btnGhost}
                        onClick={() => setStatus(promo, "ativa")}
                      >
                        Ativar
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.btnGhostDanger}
                      onClick={() => removePromotion(promo)}
                    >
                      Encerrar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

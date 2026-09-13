/**
 * Precifica+ — Linha do tempo de validades (agrupada por urgência).
 * Dados reais de products; sem mock.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState } from "../components/ui/Feedback";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { daysUntilValidity } from "../lib/dashboard";
import { formatDateBR } from "../lib/format";
import type { Category, Product } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import styles from "./Validades.module.css";

interface LotItem {
  product: Product;
  days: number | null;
}

interface LotGroup {
  key: string;
  title: string;
  hint: string;
  tone: "critical" | "warn" | "ok" | "muted";
  items: LotItem[];
}

function groupLots(products: Product[]): LotGroup[] {
  const expired: LotItem[] = [];
  const today: LotItem[] = [];
  const week: LotItem[] = [];
  const safe: LotItem[] = [];
  for (const p of products) {
    const days = daysUntilValidity(p.validade);
    const item = { product: p, days };
    if (days === null || days > 7) safe.push(item);
    else if (days < 0) expired.push(item);
    else if (days === 0) today.push(item);
    else week.push(item);
  }
  const byUrgency = (a: LotItem, b: LotItem) => (a.days ?? 999) - (b.days ?? 999);
  return [
    {
      key: "expired",
      title: "Vencidos",
      hint: "Descarte ou remarcação imediata.",
      tone: "critical",
      items: expired.sort(byUrgency),
    },
    {
      key: "today",
      title: "Vencem hoje",
      hint: "Prioridade máxima de giro.",
      tone: "critical",
      items: today.sort(byUrgency),
    },
    {
      key: "week",
      title: "Vencem em até 7 dias",
      hint: "Ative promoções para liquidar.",
      tone: "warn",
      items: week.sort(byUrgency),
    },
    {
      key: "safe",
      title: "Em dia",
      hint: "Validade segura acima de 7 dias.",
      tone: "ok",
      items: safe.sort(byUrgency),
    },
  ];
}

function daysLabel(days: number | null): string {
  if (days === null) return "Sem data";
  if (days < 0) return Math.abs(days) === 1 ? "Venceu ontem" : `Venceu há ${Math.abs(days)} dias`;
  if (days === 0) return "Vence hoje";
  if (days === 1) return "Vence amanhã";
  return `Vence em ${days} dias`;
}

export function Validades() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [catRes, prodRes] = await Promise.all([
          supabase.from("categories").select("id, nome, slug").order("nome"),
          supabase.from("products").select("*").order("validade", { ascending: true }),
        ]);
        if (!mounted) return;
        const err = catRes.error ?? prodRes.error;
        if (err) throw err;
        setCategories((catRes.data ?? []) as Category[]);
        setProducts((prodRes.data ?? []) as Product[]);
      } catch (e) {
        console.error("Erro ao carregar validades:", e);
        if (mounted) setError("Não foi possível carregar as validades. Tente novamente.");
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

  const groups = useMemo(() => groupLots(products), [products]);
  const critical = groups[0].items.length + groups[1].items.length + groups[2].items.length;

  if (loading) {
    return (
      <>
        <PageHeader
          title="Validades"
          subtitle="Linha do tempo das validades críticas da sua loja."
        />
        <div className={styles.card}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ marginBottom: 22 }}>
              <Skeleton width="30%" height={18} />
              <div style={{ height: 12 }} />
              <Skeleton height={54} />
              <div style={{ height: 10 }} />
              <Skeleton height={54} />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (error && products.length === 0) {
    return (
      <>
        <PageHeader
          title="Validades"
          subtitle="Linha do tempo das validades críticas da sua loja."
        />
        <ErrorState message={error} onRetry={() => loadRef.current?.()} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Validades"
        subtitle="Linha do tempo das validades críticas da sua loja."
        action={
          <Link to="/produtos" className={styles.btnSecondary}>
            Gerenciar catálogo
          </Link>
        }
      />

      {products.length === 0 ? (
        <div className={styles.card}>
          <EmptyState
            title="Nenhum produto com validade"
            hint="Cadastre produtos com data de validade para acompanhar os lotes aqui."
            action={
              <Link to="/produtos" className={styles.btnSecondary}>
                Cadastrar produtos
              </Link>
            }
          />
        </div>
      ) : critical === 0 ? (
        <div className={`${styles.card} ${styles.allOk}`}>
          <strong>✅ Tudo em dia.</strong> Nenhum lote vence nos próximos 7 dias.
        </div>
      ) : null}

      {groups.map((group) =>
        group.items.length === 0 ? null : (
          <section key={group.key} className={styles.card} aria-label={group.title}>
            <div className={styles.groupHead}>
              <h3>
                <span className={`${styles.dot} ${styles[group.tone]}`} aria-hidden="true" />
                {group.title}
                <span className={styles.count}>{group.items.length}</span>
              </h3>
              <span className={styles.hint}>{group.hint}</span>
            </div>
            <ul className={styles.list}>
              {group.items.map(({ product: p, days }) => (
                <li key={p.id} className={styles.row}>
                  <div>
                    <div className={styles.name}>{p.nome}</div>
                    <div className={styles.meta}>
                      {(p.category_id && catNameById.get(p.category_id)) || "Geral"} ·{" "}
                      {formatDateBR(p.validade)} ·{" "}
                      {Number.parseInt(String(p.estoque_atual), 10) || 0} un
                    </div>
                  </div>
                  <span className={`${styles.badge} ${styles[group.tone]}`}>{daysLabel(days)}</span>
                </li>
              ))}
            </ul>
          </section>
        )
      )}
    </>
  );
}

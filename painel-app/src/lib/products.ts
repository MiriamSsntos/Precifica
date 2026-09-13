/**
 * Precifica+ — Filtros e selos da tela de produtos (funções puras).
 */
import { daysUntilValidity, productMargin } from "./dashboard";
import type { Product } from "./supabase";

export type StatusFilter = "todos" | "validade" | "estoque" | "margem_baixa";

export function filterProducts(
  products: Product[],
  search: string,
  categoryId: string,
  status: StatusFilter
): Product[] {
  const term = search.toLowerCase().trim();
  return products.filter((p) => {
    const matchSearch =
      !term ||
      (p.nome || "").toLowerCase().includes(term) ||
      (p.sku || "").toLowerCase().includes(term);
    const matchCat = categoryId === "todas" || (p.category_id ?? "") === categoryId;

    let matchStatus = true;
    if (status === "validade") {
      const days = daysUntilValidity(p.validade);
      matchStatus = days !== null && days <= 7;
    } else if (status === "estoque") {
      const estoque = Number.parseInt(String(p.estoque_atual), 10) || 0;
      const estMin = Number.parseInt(String(p.estoque_min), 10) || 5;
      matchStatus = estoque <= estMin;
    } else if (status === "margem_baixa") {
      matchStatus = (productMargin(p) ?? 100) < 15;
    }
    return matchSearch && matchCat && matchStatus;
  });
}

export interface ValidityBadge {
  label: string;
  tone: "ok" | "warn" | "critical";
  expiredStyle: boolean;
}

export function validityBadge(validade: string | null): ValidityBadge | null {
  if (!validade) return null;
  const days = daysUntilValidity(validade);
  if (days === null) return null;
  if (days < 0) {
    const abs = Math.abs(days);
    return {
      label: abs === 1 ? "Vencido há 1 dia" : `Vencido há ${abs} dias`,
      tone: "critical",
      expiredStyle: true,
    };
  }
  if (days === 0) return { label: "Vence hoje", tone: "critical", expiredStyle: true };
  if (days === 1) return { label: "Vence amanhã", tone: "critical", expiredStyle: true };
  if (days <= 3) return { label: `Vence em ${days} dias`, tone: "critical", expiredStyle: true };
  if (days <= 7) return { label: `Vence em ${days} dias`, tone: "warn", expiredStyle: false };
  return { label: `Em dia (${days}d)`, tone: "ok", expiredStyle: false };
}

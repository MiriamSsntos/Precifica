/**
 * Precifica+ — Cálculos puros do dashboard (portado do mockup estático).
 * Funções sem efeitos colaterais: recebem linhas do Supabase e devolvem
 * números prontos para renderizar.
 */
import type { AlertRow, Category, Product, Promotion } from "./supabase";

export const CHART_COLORS = ["#059669", "#0891b2", "#7c3aed", "#d97706", "#dc2626", "#0d9488"];

const DAY_MS = 1000 * 60 * 60 * 24;

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function daysUntilValidity(validade: string | null, today = startOfToday()): number | null {
  if (!validade) return null;
  const valDate = new Date(`${validade}T00:00:00`);
  return Math.ceil((valDate.getTime() - today.getTime()) / DAY_MS);
}

export function productMargin(p: Product): number | null {
  const preco = Number.parseFloat(String(p.preco_venda ?? 0));
  const custo = Number.parseFloat(String(p.custo ?? 0));
  const stored = Number.parseFloat(String(p.margem_atual));
  if (!Number.isNaN(stored)) return stored;
  if (preco > 0) return ((preco - custo) / preco) * 100;
  return null;
}

export interface StatCards {
  total: number;
  empty: boolean;
  margemMedia: string;
  margemCaption: string;
  estoqueBaixo: number;
  vencidos: number;
  criticos: number;
  promocoesAtivas: number;
}

export function computeStatCards(products: Product[], promotions: Promotion[]): StatCards {
  let somaMargens = 0;
  let produtosComMargem = 0;
  let estoqueBaixo = 0;
  let vencidos = 0;
  let criticos = 0;
  const today = startOfToday();

  for (const p of products) {
    const margem = productMargin(p);
    if (margem !== null && Number.parseFloat(String(p.preco_venda ?? 0)) > 0) {
      somaMargens += margem;
      produtosComMargem += 1;
    }
    const estoque = Number.parseInt(String(p.estoque_atual), 10) || 0;
    const estMin = Number.parseInt(String(p.estoque_min), 10) || 5;
    if (estoque <= estMin) estoqueBaixo += 1;

    const diff = daysUntilValidity(p.validade, today);
    if (diff !== null) {
      if (diff < 0) vencidos += 1;
      else if (diff <= 7) criticos += 1;
    }
  }

  return {
    total: products.length,
    empty: products.length === 0,
    margemMedia: produtosComMargem > 0 ? (somaMargens / produtosComMargem).toFixed(1) : "0.0",
    margemCaption:
      produtosComMargem > 0
        ? `${produtosComMargem} produtos precificados`
        : "Nenhum produto cadastrado",
    estoqueBaixo,
    vencidos,
    criticos,
    promocoesAtivas: promotions.filter((p) => p.status === "ativa").length,
  };
}

export interface CategoryShare {
  nome: string;
  count: number;
  pct: number;
  color: string;
}

function countByCategory(categories: Category[], products: Product[]): CategoryShare[] {
  const counts = new Map<string, number>();
  for (const c of categories) counts.set(c.id, 0);
  for (const p of products) {
    if (p.category_id && counts.has(p.category_id)) {
      counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
    }
  }
  const total = products.length;
  return categories
    .map((c, idx) => ({
      nome: c.nome,
      count: counts.get(c.id) ?? 0,
      pct: total > 0 ? Math.round(((counts.get(c.id) ?? 0) / total) * 100) : 0,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count);
}

export function topCategoryShares(
  categories: Category[],
  products: Product[],
  limit = 5
): CategoryShare[] {
  return countByCategory(categories, products).slice(0, limit);
}

export function activeCategoryBars(
  categories: Category[],
  products: Product[],
  limit = 5
): { nome: string; count: number; heightPct: number; color: string }[] {
  const active = countByCategory(categories, products)
    .filter((c) => c.count > 0)
    .slice(0, limit);
  const max = Math.max(...active.map((c) => c.count), 1);
  return active.map((c, idx) => ({
    nome: c.nome,
    count: c.count,
    heightPct: Math.max(Math.round((c.count / max) * 90), 12),
    color: CHART_COLORS[idx % CHART_COLORS.length],
  }));
}

export interface ValidityStats {
  total: number;
  safe: number;
  expired: number;
  nearExpiry: number;
  pct: number;
}

export function computeValidity(products: Product[]): ValidityStats {
  const today = startOfToday();
  let safe = 0;
  let expired = 0;
  let nearExpiry = 0;
  for (const p of products) {
    const diff = daysUntilValidity(p.validade, today);
    if (diff === null || diff > 7) safe += 1;
    else if (diff < 0) expired += 1;
    else nearExpiry += 1;
  }
  const total = products.length;
  return {
    total,
    safe,
    expired,
    nearExpiry,
    pct: total > 0 ? Math.round((safe / total) * 100) : 0,
  };
}

export interface LiveAlert {
  tipo: string;
  mensagem: string;
  timeStr: string;
  priority: number;
}

const ALERT_COLORS: Record<string, string> = {
  validade_critica: "#dc2626",
  estoque_baixo: "#d97706",
  margem_baixa: "#059669",
  sistema: "#0891b2",
};

export function alertColor(tipo: string): string {
  return ALERT_COLORS[tipo] ?? "#0891b2";
}

export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "recentemente";
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return "agora mesmo";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH} h`;
  const diffDays = Math.floor(diffH / 24);
  if (diffDays === 1) return "ontem";
  if (diffDays < 30) return `há ${diffDays} dias`;
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export function buildAlerts(products: Product[], dbAlerts: AlertRow[], limit = 6): LiveAlert[] {
  const today = startOfToday();
  const live: LiveAlert[] = [];

  for (const p of products) {
    const unidade = p.unidade || "un";
    const estoque = Number.parseInt(String(p.estoque_atual), 10) || 0;
    const estMin = Number.parseInt(String(p.estoque_min), 10) || 5;
    const nome = p.nome || "Produto sem nome";

    const diff = daysUntilValidity(p.validade, today);
    if (diff !== null && p.validade) {
      const dataFormatada = p.validade.split("-").reverse().join("/");
      if (diff < 0) {
        const abs = Math.abs(diff);
        live.push({
          tipo: "validade_critica",
          priority: 1,
          mensagem: `${nome} venceu ${abs === 1 ? "ontem" : `há ${abs} dias`} (${dataFormatada}) — ${estoque} ${unidade} no estoque. Ação imediata requerida.`,
          timeStr: "Hoje (tempo real)",
        });
      } else if (diff === 0) {
        live.push({
          tipo: "validade_critica",
          priority: 2,
          mensagem: `${nome} vence hoje (${dataFormatada}) — ${estoque} ${unidade} restantes. Sugestão de remarcação/promoção imediata.`,
          timeStr: "Hoje (tempo real)",
        });
      } else if (diff <= 3) {
        live.push({
          tipo: "validade_critica",
          priority: 3,
          mensagem: `${nome} vence em ${diff} dias (${dataFormatada}) — desconto sugerido pela IA.`,
          timeStr: "Alerta IA",
        });
      } else if (diff <= 7) {
        live.push({
          tipo: "validade_critica",
          priority: 4,
          mensagem: `${nome} vence em ${diff} dias (${dataFormatada}). Acompanhar giro.`,
          timeStr: "Alerta IA",
        });
      }
    }

    if (estoque <= estMin) {
      live.push({
        tipo: "estoque_baixo",
        priority: 5,
        mensagem: `${nome} com estoque crítico (${estoque} restantes, mín. ${estMin}).`,
        timeStr: "Estoque",
      });
    }
  }

  const combined = [...live];
  for (const a of dbAlerts) {
    const isDup = combined.some((la) =>
      la.mensagem.toLowerCase().includes(a.mensagem.slice(0, 15).toLowerCase())
    );
    if (!isDup) {
      combined.push({
        tipo: a.tipo,
        mensagem: a.mensagem,
        timeStr: formatRelativeTime(a.created_at),
        priority: a.tipo === "sistema" ? 6 : 7,
      });
    }
  }

  return combined.sort((a, b) => a.priority - b.priority).slice(0, limit);
}

export function marginChartPoints(categories: Category[], products: Product[]): string {
  const sums = new Map<string, { sum: number; count: number }>();
  for (const c of categories) sums.set(c.id, { sum: 0, count: 0 });
  for (const p of products) {
    const entry = p.category_id ? sums.get(p.category_id) : undefined;
    if (!entry) continue;
    const margem = productMargin(p) ?? 0;
    entry.sum += margem;
    entry.count += 1;
  }
  const values = [...sums.values()]
    .filter((e) => e.count > 0)
    .map((e) => Math.max(0, Math.min(100, e.sum / e.count)));

  const points = values.length >= 2 ? values : [35, 42, 38, 48, 52, 45, 50];
  const stepX = 560 / (points.length - 1);
  return points
    .map((val, idx) => `${Math.round(idx * stepX)},${Math.round(160 - (val / 100) * 130)}`)
    .join(" ");
}

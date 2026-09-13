/** Formatação pt-BR (moeda, datas) + classes de margem. */

export function formatCurrency(value: number | string | null | undefined): string {
  return (Number(value) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.split("-").reverse().join("/");
}

export function marginTone(margin: number): "high" | "mid" | "low" {
  if (margin < 15) return "low";
  if (margin < 25) return "mid";
  return "high";
}

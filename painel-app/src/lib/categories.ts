/**
 * Precifica+ — Gestão de categorias e auto-provisionamento de categorias padrão.
 */
import type { Category } from "./supabase";
import { supabase } from "./supabase";

export const DEFAULT_CATEGORIES = [
  { nome: "Hortifruti", slug: "hortifruti" },
  { nome: "Laticínios", slug: "laticinios" },
  { nome: "Padaria", slug: "padaria" },
  { nome: "Mercearia", slug: "mercearia" },
  { nome: "Bebidas", slug: "bebidas" },
  { nome: "Açougue", slug: "acougue" },
] as const;

/**
 * Garante que a conta do usuário tenha ao menos as categorias padrão cadastradas.
 * Se o usuário não tiver nenhuma categoria, insere as padrão e retorna a lista.
 */
export async function ensureDefaultCategories(userId: string): Promise<Category[]> {
  const { data: existing, error: selectErr } = await supabase
    .from("categories")
    .select("id, nome, slug")
    .order("nome");

  if (selectErr) throw selectErr;
  if (existing && existing.length > 0) return existing as Category[];

  const toInsert = DEFAULT_CATEGORIES.map((c) => ({
    user_id: userId,
    nome: c.nome,
    slug: c.slug,
  }));

  const { data: created, error: insertErr } = await supabase
    .from("categories")
    .insert(toInsert)
    .select("id, nome, slug")
    .order("nome");

  if (insertErr) {
    console.error("Erro ao criar categorias padrão:", insertErr);
    return [];
  }
  return (created ?? []) as Category[];
}

/**
 * Cadastra uma nova categoria personalizada para o usuário atual.
 */
export async function createCategory(userId: string, nome: string): Promise<Category> {
  const trimmed = nome.trim();
  if (!trimmed) throw new Error("O nome da categoria não pode ser vazio.");

  const slug = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const { data, error } = await supabase
    .from("categories")
    .insert([{ user_id: userId, nome: trimmed, slug }])
    .select("id, nome, slug")
    .single();

  if (error) throw error;
  return data as Category;
}

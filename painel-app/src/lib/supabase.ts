/**
 * Precifica+ — Cliente Supabase (singleton) + tipos das tabelas.
 *
 * Arquitetura Supabase-only: sem backend próprio. O front chama o
 * Supabase diretamente e o isolamento por usuário é garantido pelo
 * RLS (`auth.uid() = user_id`). A anon key é pública por design.
 */
import { createClient } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  nome: string | null;
  empresa: string | null;
  plano: string | null;
  telefone: string | null;
  cidade: string | null;
};

export type Category = {
  id: string;
  user_id?: string;
  nome: string;
  slug: string | null;
};

export type CategoryInsert = {
  id?: string;
  user_id?: string;
  nome: string;
  slug?: string | null;
};

export type Product = {
  id: string;
  nome: string;
  sku: string | null;
  preco_venda: number | string | null;
  custo: number | string | null;
  margem_atual: number | string | null;
  estoque_atual: number | string | null;
  estoque_min: number | string | null;
  validade: string | null;
  category_id: string | null;
  created_at: string;
};

export type Promotion = {
  id: string;
  product_id: string;
  desconto_pct: number | string;
  preco_promocional: number | string | null;
  data_inicio: string;
  data_fim: string;
  status: string | null;
  created_at: string;
};

export type AlertRow = {
  id: string;
  tipo: string;
  mensagem: string;
  lida: boolean | null;
  created_at: string;
};

export type ProductInsert = {
  id?: string;
  user_id?: string;
  nome: string;
  sku?: string | null;
  category_id?: string | null;
  custo?: number | string | null;
  preco_venda?: number | string | null;
  margem_atual?: number | string | null;
  estoque_atual?: number | string | null;
  estoque_min?: number | string | null;
  validade?: string | null;
  created_at?: string;
};

export type ProductUpdate = {
  id?: string;
  user_id?: string;
  nome?: string;
  sku?: string | null;
  category_id?: string | null;
  custo?: number | string | null;
  preco_venda?: number | string | null;
  margem_atual?: number | string | null;
  estoque_atual?: number | string | null;
  estoque_min?: number | string | null;
  validade?: string | null;
  created_at?: string;
};

interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
        Relationships: [];
      };
      categories: {
        Row: Category;
        Insert: CategoryInsert;
        Update: Partial<CategoryInsert>;
        Relationships: [];
      };
      products: {
        Row: Product;
        Insert: ProductInsert;
        Update: ProductUpdate;
        Relationships: [];
      };
      promotions: {
        Row: Promotion;
        Insert: Partial<Promotion>;
        Update: Partial<Promotion>;
        Relationships: [];
      };
      alerts: {
        Row: AlertRow;
        Insert: Partial<AlertRow>;
        Update: Partial<AlertRow>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo painel/.env (veja .env.example)."
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export function getDisplayName(
  profile: Pick<Profile, "nome"> | null,
  metadata: Record<string, unknown> | undefined,
  email: string | undefined
): string {
  const metaName =
    typeof metadata?.full_name === "string"
      ? metadata.full_name
      : typeof metadata?.name === "string"
        ? metadata.name
        : undefined;
  return profile?.nome || metaName || email?.split("@")[0] || "Gestor";
}

export function getInitials(displayName: string): string {
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return initials || "P+";
}

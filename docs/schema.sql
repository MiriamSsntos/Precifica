-- ==========================================================
-- SCHEMA SQL: Precifica+ (Supabase PostgreSQL)
-- Executar no SQL Editor do Dashboard do Supabase
-- ==========================================================

-- 1. Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================================
-- 2. TABELA: profiles (Perfil do Usuário / Mercado)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255),
  empresa VARCHAR(255),
  plano VARCHAR(50) DEFAULT 'Scale IA',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 3. TABELA: categories (Categorias de Produtos)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 4. TABELA: products (Produtos, Estoque e Preços)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  nome VARCHAR(255) NOT NULL,
  sku VARCHAR(50),
  custo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  preco_venda DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  margem_atual DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN preco_venda > 0 THEN ((preco_venda - custo) / preco_venda) * 100 ELSE 0 END
  ) STORED,
  estoque_atual INT NOT NULL DEFAULT 0,
  estoque_min INT NOT NULL DEFAULT 5,
  validade DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 5. TABELA: price_history (Histórico de Reajustes)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preco_anterior DECIMAL(10,2) NOT NULL,
  preco_novo DECIMAL(10,2) NOT NULL,
  motivo VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 6. TABELA: promotions (Promoções e Sugestões da IA)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  desconto_pct DECIMAL(5,2) NOT NULL,
  preco_promocional DECIMAL(10,2),
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'ativa', -- ativa, pausada, encerrada
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 7. TABELA: alerts (Alertas do Dashboard)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- validade_critica, estoque_baixo, margem_baixa, sistema
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 8. ROW LEVEL SECURITY (RLS) - SEGURANÇA POR USUÁRIO
-- ==========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Policies para PROFILES
CREATE POLICY "Usuários podem ver seu próprio perfil" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Policies para CATEGORIES
CREATE POLICY "Usuários gerenciam suas próprias categorias" 
  ON public.categories FOR ALL 
  USING (auth.uid() = user_id);

-- Policies para PRODUCTS
CREATE POLICY "Usuários gerenciam seus próprios produtos" 
  ON public.products FOR ALL 
  USING (auth.uid() = user_id);

-- Policies para PRICE_HISTORY
CREATE POLICY "Usuários gerenciam seu histórico de preços" 
  ON public.price_history FOR ALL 
  USING (auth.uid() = user_id);

-- Policies para PROMOTIONS
CREATE POLICY "Usuários gerenciam suas promoções" 
  ON public.promotions FOR ALL 
  USING (auth.uid() = user_id);

-- Policies para ALERTS
CREATE POLICY "Usuários gerenciam seus alertas" 
  ON public.alerts FOR ALL 
  USING (auth.uid() = user_id);

-- ==========================================================
-- 9. TRIGGER: Criação Automática de Perfil ao Cadastrar Usuário
-- ==========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, empresa)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'company', 'Meu Supermercado')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger disparado após criação na tabela auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

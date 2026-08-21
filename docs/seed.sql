-- ==========================================================
-- SEED: dados protótipo do Precifica+ (espelha painel/dashboard.html)
--
-- ORDEM DE EXECUÇÃO (SQL Editor do Supabase):
--   1) docs/schema.sql
--   2) Authentication → Users → "Add user" → criar:
--        email: demo@precifica.app  |  senha: demo1234  (auto-confirm)
--   3) este arquivo
--
-- Seguro re-executar: limpa e reinsere os dados do usuário demo.
-- ==========================================================

DO $$
DECLARE
  uid UUID;
  c_hortifruti UUID;
  c_laticinios UUID;
  c_padaria UUID;
  c_mercearia UUID;
  c_bebidas UUID;
  c_acougue UUID;
  p_iogurte UUID;
  p_feijao UUID;
  p_oleo UUID;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'demo@precifica.app' LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Usuário demo não encontrado. Crie demo@precifica.app no Supabase Auth antes de executar o seed.';
  END IF;

  INSERT INTO public.profiles (id, nome, empresa, plano, telefone, cidade, portfolio_skus)
  VALUES (uid, 'Roberto Silva', 'Mercado Central', 'Scale IA', '(41) 9 8888-0000', 'Curitiba / PR', '300 a 1.000 produtos')
  ON CONFLICT (id) DO UPDATE
    SET nome = EXCLUDED.nome,
        empresa = EXCLUDED.empresa,
        plano = EXCLUDED.plano,
        telefone = EXCLUDED.telefone,
        cidade = EXCLUDED.cidade,
        portfolio_skus = EXCLUDED.portfolio_skus;

  DELETE FROM public.alerts WHERE user_id = uid;
  DELETE FROM public.products WHERE user_id = uid;
  DELETE FROM public.categories WHERE user_id = uid;

  INSERT INTO public.categories (user_id, nome, slug) VALUES (uid, 'Hortifruti', 'hortifruti') RETURNING id INTO c_hortifruti;
  INSERT INTO public.categories (user_id, nome, slug) VALUES (uid, 'Laticínios', 'laticinios') RETURNING id INTO c_laticinios;
  INSERT INTO public.categories (user_id, nome, slug) VALUES (uid, 'Padaria', 'padaria') RETURNING id INTO c_padaria;
  INSERT INTO public.categories (user_id, nome, slug) VALUES (uid, 'Mercearia', 'mercearia') RETURNING id INTO c_mercearia;
  INSERT INTO public.categories (user_id, nome, slug) VALUES (uid, 'Bebidas', 'bebidas') RETURNING id INTO c_bebidas;
  INSERT INTO public.categories (user_id, nome, slug) VALUES (uid, 'Açougue', 'acougue') RETURNING id INTO c_acougue;

  INSERT INTO public.products (user_id, category_id, nome, sku, custo, preco_venda, estoque_atual, estoque_min, validade)
  VALUES (uid, c_laticinios, 'Iogurte Grego 100g', 'LAT-0001', 2.20, 4.50, 40, 10, CURRENT_DATE + 4)
  RETURNING id INTO p_iogurte;

  INSERT INTO public.products (user_id, category_id, nome, sku, custo, preco_venda, estoque_atual, estoque_min, validade)
  VALUES (uid, c_mercearia, 'Feijão Preto 1kg', 'MER-0001', 4.80, 8.99, 5, 10, CURRENT_DATE + 240)
  RETURNING id INTO p_feijao;

  INSERT INTO public.products (user_id, category_id, nome, sku, custo, preco_venda, estoque_atual, estoque_min, validade)
  VALUES (uid, c_mercearia, 'Óleo de Soja 900ml', 'MER-0002', 5.30, 7.49, 36, 12, CURRENT_DATE + 150)
  RETURNING id INTO p_oleo;

  INSERT INTO public.products (user_id, category_id, nome, sku, custo, preco_venda, estoque_atual, estoque_min, validade) VALUES
    (uid, c_hortifruti, 'Banana Prata (kg)', 'HOR-0001', 3.10, 5.99, 60, 15, CURRENT_DATE + 2),
    (uid, c_hortifruti, 'Tomate Italiano (kg)', 'HOR-0002', 4.00, 7.99, 25, 12, CURRENT_DATE + 1),
    (uid, c_hortifruti, 'Alface Crespa (un)', 'HOR-0003', 1.50, 3.99, 18, 8, CURRENT_DATE + 3),
    (uid, c_padaria, 'Pão Francês (kg)', 'PAD-0001', 6.00, 12.90, 12, 10, CURRENT_DATE),
    (uid, c_laticinios, 'Leite Integral 1L', 'LAT-0002', 3.85, 5.49, 90, 24, CURRENT_DATE + 10),
    (uid, c_acougue, 'Peito de Frango (kg)', 'ACO-0001', 9.90, 15.99, 30, 10, CURRENT_DATE + 5),
    (uid, c_bebidas, 'Refrigerante Cola 2L', 'BEB-0001', 4.50, 8.99, 48, 12, CURRENT_DATE + 90);

  INSERT INTO public.promotions (product_id, user_id, desconto_pct, preco_promocional, data_inicio, data_fim, status)
  VALUES (p_iogurte, uid, 30.00, 3.15, CURRENT_DATE, CURRENT_DATE + 4, 'ativa');

  INSERT INTO public.price_history (product_id, user_id, preco_anterior, preco_novo, motivo)
  VALUES (p_oleo, uid, 7.13, 7.49, 'Margem corrigida automaticamente (+5%)');

  INSERT INTO public.alerts (user_id, product_id, tipo, mensagem) VALUES
    (uid, p_iogurte, 'validade_critica', 'Iogurte Grego 100g vence em 4 dias — desconto de 30% sugerido pela IA.'),
    (uid, p_feijao, 'estoque_baixo', 'Feijão Preto 1kg com estoque crítico (5 unidades restantes).'),
    (uid, p_oleo, 'margem_baixa', 'Margem do Óleo de Soja corrigida automaticamente (+5%).'),
    (uid, NULL, 'sistema', 'Novo relatório executivo de rentabilidade disponível para exportação.');

END $$;

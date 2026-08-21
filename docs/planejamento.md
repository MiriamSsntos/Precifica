# Planejamento — Precifica+

> Documento vivo: atualizar sempre que uma decisão mudar ou uma fase for concluída.
> Data de criação: ago/2026. Autor: Miriam (faculdade). Equipe: revisar antes de executar.
> **Mudança de direção (ago/2026):** professor aprovou uso apenas do Supabase — sem backend Python próprio.

---

## 1. Visão geral

Precifica+ é um SaaS B2B de IA para gestão de estoque e precificação de produtos perecíveis (supermercados/hortifrútis). Projeto acadêmico que futuramente será produção real; hoje usa dados protótipo. O usuário é iniciante e está aprendendo o fluxo profissional — priorize clareza e simplicidade, explicando decisões quando relevante.

**Duas partes + Supabase (monorepo):**

| Parte | URL (hoje) | Domínio futuro | Conteúdo |
|---|---|---|---|
| Landing | `precifica-rouge.vercel.app` | `precifica.com.br` | Página principal de comunicação/vendas. Foco: SEO + conversão + ads. |
| Painel | `precifica-rouge.vercel.app/painel/` | `painel.precifica.com.br` | Login + dashboard (dados do cliente). Privado, `noindex`. React + Vite + TS. |
| Supabase | `pxubluofynemndcbhjcv.supabase.co` | — | Auth (JWT), PostgreSQL + RLS, Views/RPC = engine v1. |

Público: gerentes de supermercados/hortifrútis. Idioma: pt-BR. **Custo total: R$ 0.**

---

## 2. Decisões de arquitetura (tomadas — não reverter sem perguntar)

| # | Decisão | Escolha | Motivo |
|---|---|---|---|
| 1 | Landing | **HTML/CSS/JS puro, estática** | Melhor SEO/Core Web Vitals possíveis; já está pronta. |
| 2 | Painel | **React + Vite + TypeScript** | Padrão de mercado, componentes, CI/CD real; landing não é afetada. |
| 3 | Backend | **Sem backend próprio — Supabase-only** | Professor aprovou (ago/2026); Auth + Postgres + Views/RPC cobrem tudo. Menos escopo, mais foco no produto. |
| 4 | Auth | **Supabase Auth (JWT)** — auth externo | Commodity de mercado (Auth0/Clerk/Supabase). Painel usa `supabase-js` direto. |
| 5 | Banco | **PostgreSQL do Supabase** (pooler 6543 ou PostgREST) | Postgres grátis. Painel acessa via `supabase-js` + RLS ativo (filtro por `auth.uid()`). |
| 6 | Engine v1 | **SQL no próprio Supabase** (views/RPC) | Roda junto ao banco, zero infra, painel só lê resultados. IA fica fase futura. |
| 7 | Deploy | **Vercel único projeto** (`/` → landing, `/painel/` → painel) | Mesma origem = sessão compartilhada; um deploy só. `noindex` no painel. |
| 8 | Domínio | **Nenhum por enquanto** — URLs padrão Vercel | `og:url`/`canonical` apontam para `precifica-rouge.vercel.app`. |
| 9 | Git | **Branches `feat/<fase>` + PR + Conventional Commits** | Aprender pipeline profissional desde já; `main` é produção. |
| 10 | Custo | **R$ 0** | Supabase Free + Vercel Hobby. |

---

## 3. Arquitetura alvo

```
┌──────────────────────────────────────┐
│  Vercel — projeto único              │
│  /               → landing (HTML)    │
│  /painel/        → React + Vite      │
│  vercel.json + arquivos do monorepo  │
└──────────────┬───────────────────────┘
               │ supabase-js (anon key + JWT da sessão)
               ▼
┌──────────────────────────────────────┐
│  Supabase                            │
│  • Auth (JWT, email)                 │
│  • PostgreSQL + RLS (auth.uid())     │
│  • Views/RPC = engine v1 (estoque)   │
└──────────────────────────────────────┘
```

### Fluxo de autenticação (sem API intermediária)

1. **Painel (React)**: `supabase-js` → `signInWithPassword` / `signUp` → recebe o **JWT** na sessão local.
2. **Painel → Supabase**: toda query via `supabase-js` leva o `Authorization: Bearer <JWT>` automaticamente.
3. **Supabase (PostgREST/RLS)**: valida o JWT, extrai `sub` = `user_id`, aplica policies `auth.uid() = user_id`.

### Estrutura de pastas (alvo)

```
Precifica+/
├── AGENTS.md               # Contexto para agentes de IA
├── readme.md               # Apresentação do repo
├── dev.ps1                 # Servidor local (porta 8000, raiz do repo)
├── vercel.json             # Rewrites: / → landing, /painel/ → React
├── .env.example            # Placeholders de credenciais
├── docs/
│   ├── planejamento.md     # Este documento
│   ├── git-workflow.md     # Fluxo de branches/PR
│   ├── schema.sql          # Tabelas + RLS + trigger perfil
│   ├── seed.sql            # Dados protótipo (demo@precifica.app)
│   └── engine.sql          # Views/RPC da engine v1 (Fase 4)
├── trello/
│   ├── index.html          # Quadro Kanban (GitHub Pages)
│   └── trello-data.json    # Fonte única de dados do quadro
├── landing/                # → precifica-rouge.vercel.app (HTML puro)
│   ├── index.html
│   ├── robots.txt / sitemap.xml / 404.html
│   └── src/ (css, js, assets)
└── painel/                 # → /painel/ no mesmo deploy (React+Vite+TS)
    ├── src/ (componentes, páginas)
    └── (scaffold Vite criado na Fase 5)
```

> **Quadro da equipe**: GitHub Pages publica `trello/` a partir da `main` → `https://miriamssntos.github.io/Precifica/trello/`. Fonte única: `trello/trello-data.json`. A equipe pode commitar direto na `main` via UI do quadro (exceção documentada).

---

## 4. Banco de dados (PostgreSQL — Supabase)

### Tabelas atuais (já aplicadas via `docs/schema.sql`)

| Tabela | Campos principais | Finalidade |
|---|---|---|
| `profiles` | `id` (FK auth.users), `nome`, `empresa`, `plano`, `telefone`, `cidade`, `portfolio_skus`, `created_at` | Perfil do usuário logado |
| `categories` | `id`, `user_id`, `nome`, `slug` | Categorias de produto do usuário |
| `products` | `id`, `user_id`, `category_id`, `nome`, `sku`, `custo`, `preco_venda`, `estoque_atual`, `estoque_min`, `validade`, `created_at` | Estoque e precificação |
| `price_history` | `id`, `product_id`, `user_id`, `preco_anterior`, `preco_novo`, `motivo`, `created_at` | Histórico de reajustes |
| `promotions` | `id`, `product_id`, `user_id`, `desconto_pct`, `preco_promocional`, `data_inicio`, `data_fim`, `status` | Promoções sugeridas |
| `alerts` | `id`, `user_id`, `product_id`, `tipo`, `mensagem`, `lida`, `created_at` | Alertas do dashboard |

### Segurança

- **RLS**: policies `auth.uid() = user_id` (ou `id` em profiles) em todas as tabelas.
- Painel usa `supabase-js` com a **anon key** — o JWT da sessão é enviado automaticamente; RLS é a proteção real.
- Chaves/secret ficam em `.env` gitignored; versionar apenas `.env.example`.

### Seed (dados protótipo)

`docs/seed.sql` espelha o mockup do dashboard: Supermercado "Mercado Central" (Hortifruti Delícia) com ~10 produtos nas categorias Hortifruti, Laticínios, Açougue, Padaria, Mercearia, Bebidas — com custo, preço, validade e alertas (Iogurte vencendo, Feijão crítico, Óleo margem corrigida).

---

## 5. Engine v1 — Lógica de estoque (SQL no Supabase)

Regras simples isoladas em `docs/engine.sql` (será criado na Fase 4):

- **Margem**: `preco_venda = custo / (1 - margem_desejada)` → view/RPC sugere preço.
- **Validade**: `dias_para_vencer = validade - CURRENT_DATE`; alerta se `<= X dias`.
- **Estoque**: alerta quando `estoque_atual <= estoque_min`.
- **Giro**: velocidade de saída (últimos N dias) → sugestão de reposição/preço.
- **Views principais a criar**:
  - `v_product_metrics`: `margem_atual`, `dias_para_vencer`, `status_validade`, `giro_estimado`.
  - `v_alertas_validade`, `v_alertas_estoque`, `v_alertas_margem` → unificam em `v_alertas`.
  - `v_dashboard_stats`: economia mês, produtos otimizados, promoções ativas, margem média.
  - RPC `recalcular_sugestoes()` opcional para reprocessar em lote.
- IA (promoções automáticas) entra depois como módulo separado.

---

## 6. Fases de implementação

> Status em tempo real: `trello/index.html` (quadro Kanban). Branches: `feat/<fase>` + PR.

### Fase 0 — Documentação e contexto (✅ concluída)
- [x] `AGENTS.md` criado (init)
- [x] `docs/planejamento.md` criado (este documento)
- [x] `trello/index.html` (quadro Kanban) criado
- [x] `docs/git-workflow.md` — passo a passo de branches/PR para a equipe

### Fase 1 — Reorganização do monorepo (✅ concluída)
- [x] `landing/` e `painel/` separados; caminhos relativos validados
- [x] `robots.txt`, `sitemap.xml`, `404.html` criados
- [x] `dev.ps1` (preview local) criado e validado (tudo 200)

### Fase 2 — SEO da landing (🔶 em andamento / branch `feat/fase2-seo`)
- [x] `og:url` corrigido → `https://precifica-rouge.vercel.app`
- [ ] `canonical` apontando para a URL Vercel
- [ ] Gerar `og:image` 1200x630 (PNG com branding Precifica+)
- [ ] Adicionar `theme-color` e revisar JSON-LD
- [ ] Validar no Google Rich Results / Lighthouse

### Fase 3 — Supabase + Cadastro público + Deploy único (✅ concluída / branch `feat/fase3-supabase`)
- [x] Projeto Supabase criado (plano grátis) — usuário
- [x] Schema SQL + RLS + seed protótipo (`docs/schema.sql` + `docs/seed.sql`)
- [x] Conta demo no Supabase Auth (`demo@precifica.app` / `demo1234`, seed roda depois)
- [x] Credenciais em `.env` gitignored + `.env.example` versionado
- [x] **Cadastro público antecipado da Fase 8**: formulário da landing cria conta (`signUp`), preenche perfil, redireciona ao painel
- [x] **Deploy único Vercel**: rewrite de `/` para a landing e `/painel/` servido no mesmo projeto (mesma origem = sessão compartilhada)

### Fase 4 — Engine v1 no Supabase (SQL) (branch `feat/fase4-engine`)
- [ ] Scaffold `docs/engine.sql` com views/RPC
- [ ] View `v_product_metrics` (margem, dias_para_vencer, giro)
- [ ] Views de alertas: validade crítica, estoque baixo, margem baixa
- [ ] View `v_dashboard_stats` (resumo para o painel)
- [ ] Seed atualizado já povoa dados compatíveis
- [ ] Testar queries no SQL Editor do Supabase

### Fase 5 — Painel React + supabase-js (branch `feat/fase5-painel`)
- [ ] Scaffold Vite + TypeScript
- [ ] Página de login/signup com `supabase-js` (reaproveitar design do mockup)
- [ ] Session guard + logout
- [ ] CRUD de produtos/categorias via `supabase-js` (RLS protege)
- [ ] Dashboard consumindo `v_dashboard_stats`, `v_alertas`, `v_product_metrics`
- [ ] `npm run build` sem erros

### Fase 6 — Deploy final + CI/CD (branch `feat/fase6-deploy`)
- [x] Vercel: landing publicada (`precifica-rouge.vercel.app`)
- [x] Vercel: painel publicado no mesmo projeto (rewrites) — **falta `noindex`**
- [ ] `noindex` no painel: `<meta name="robots" content="noindex">` + header `X-Robots-Tag` no Vercel
- [x] Fluxo completo em produção: landing → login/cadastro → dashboard
- [x] CI/CD funcionando: push → deploy automático (Vercel)

### Fase 7 — Documentação acadêmica (branch `feat/fase7-docs`)
- [ ] README completo (arquitetura, schema, fluxo de auth, engine SQL)
- [ ] Justificativa: **supabase-only aprovado pelo professor**; backend real = engine no banco + RLS
- [ ] Prints do painel + SQL Editor para a apresentação

### Fase 8 — Opcional (só se sobrar tempo)
- [ ] Integração com IA na engine (promoções automáticas via Edge Function ou client-side)
- [ ] Validação de leads pela equipe (workflow manual ou futura Edge Function)
- [ ] Alertas via WhatsApp
- [ ] Planos e cobrança (Essencial, Scale IA, Enterprise)
- [ ] Domínio próprio + SEO definitivo

---

## 7. Checklist SEO da landing

- [x] `title` único e descritivo (~60 chars)
- [x] `meta description` (~150 chars)
- [x] Open Graph: `og:title`, `og:description`, `og:type`, `og:locale`
- [ ] `og:image` 1200x630 (PNG)
- [x] `og:url` → `https://precifica-rouge.vercel.app`
- [ ] `canonical` → URL Vercel
- [ ] Twitter Cards (`summary_large_image`)
- [ ] `theme-color`
- [ ] JSON-LD (Organization, Product, FAQ)
- [ ] `robots.txt` + `sitemap.xml` — revisar URLs
- [ ] Texto alternativo (`alt`) em imagens
- [ ] Performance: HTML estático, fontes com `preconnect`

---

## 8. Deploy (passo a passo para o usuário)

1. **Vercel** (conta grátis com GitHub):
   - New Project → Import `Precifica+` → **Root Directory: (vazio = raiz do repo)**
   - Build Command: vazio enquanto o painel usa os mockups estáticos; será atualizado na Fase 5 para gerar o build React
   - Output Directory: (vazio)
   - `vercel.json` na raiz reescreve `/` para `/landing/index.html`; `/painel/*` é servido pela pasta do painel no mesmo projeto
   - URLs geradas: `precifica-rouge.vercel.app` (landing) e `/painel/` (React)
2. **Noindex do painel**: `<meta name="robots" content="noindex">` no `index.html` do React + header `X-Robots-Tag: noindex` no Vercel (Project → Settings → Headers).
3. **Domínio próprio (futuro)**: Vercel Settings → Domains (CNAME). Atualizar `og:url`/`canonical`/`sitemap`/`robots.txt`.

---

## 9. Riscos e pendências

| Item | Status |
|---|---|
| Nome do produto/domínio indefinido — SEO usa URL Vercel até decidir | 🔴 Em aberto |
| Professor aceitar auth externo (Supabase) na matéria de backend | ✅ **Resolvido (ago/2026)** — aprovou supabase-only |
| Repo local atrás do `origin/main` | ✅ **Resolvido** — sincronizado |
| Cold start inexistente (sem Render) | ✅ Resolvido |
| Postgres do Supabase pausa após 1 semana sem uso | ✅ Aceito — reativar com 1 clique |
| Chaves/secret: `.env` gitignored, `.env.example` versionado | Regra permanente |
| Dados protótipo devem espelhar o mockup do painel | Fase 3 ✅ / Fase 4 |
| Painel não pode ser indexado pelo Google (falta `noindex`) | ⏳ Fase 6 |
| Custo permanece R$ 0 | Regra permanente |

---

## 10. Ideias futuras (fora do escopo atual)

- Engine de IA (promoções automáticas com ML — opcional via Edge Function)
- Validação de leads pela equipe (workflow manual ou futura automação)
- Integração do formulário de lead com engine/alertas
- Planos e cobrança (Essencial, Scale IA, Enterprise)
- Domínio próprio + SEO definitivo
- Modo escuro e modal de vídeo demo (pendências antigas)

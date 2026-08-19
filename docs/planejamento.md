# Planejamento — Precifica+

> Documento vivo: atualizar sempre que uma decisão mudar ou uma fase for concluída.
> Data de criação: ago/2026. Autor: Miriam (faculdade). Equipe: revisar antes de executar.

---

## 1. Visão geral

Precifica+ é um SaaS B2B de IA para **gestão de estoque e precificação de produtos perecíveis** (supermercados e hortifrútis). O sistema previne desperdício automatizando precificação, monitorando validades e disparando alertas de estoque baixo.

**Três partes (monorepo):**

| Parte | URL (hoje) | Domínio futuro | Conteúdo |
|---|---|---|---|
| Landing | `precifica-landing.vercel.app` | `precifica.com.br` | Página principal de comunicação/vendas. Foco: SEO + conversão + ads. |
| Painel | `painel-precifica.vercel.app` | `painel.precifica.com.br` | Login + dashboard (dados do cliente). Privado, `noindex`. |
| API | Render free | `api.precifica.com.br` (futuro) | Backend Python: regras de estoque/preço + auth. |

**Público:** gerentes de supermercados/hortifrútis. **Idioma:** pt-BR. **Custo: R$ 0.**

---

## 2. Decisões de arquitetura (tomadas — não reverter sem perguntar)

| # | Decisão | Escolha | Motivo |
|---|---|---|---|
| 1 | Landing | **HTML/CSS/JS puro, estática** | Melhor SEO/Core Web Vitals possíveis; já está pronta. |
| 2 | Painel | **React + Vite + TypeScript** | Padrão de mercado, componentes, CI/CD real; landing não é afetada. |
| 3 | Backend | **Python + FastAPI escrito do zero** | A matéria é backend: o professor vê rotas, middleware, JWT, SQL e regras de negócio. Python é o futuro da engine de IA. |
| 4 | Auth | **Supabase Auth (JWT)** — auth externo | Auth é commodity (prática de mercado: Auth0/Clerk/Supabase). A API Python valida o JWT e autoriza por `user_id`. Alinhar com o professor. |
| 5 | Banco | **PostgreSQL do Supabase** (só banco) | Postgres grátis. A API conecta direto via pooler (porta 6543, IPv4). RLS ativo + filtro por `user_id` na API (dupla proteção). |
| 6 | Engine | **v1 = só lógica de estoque** (regras em Python) | Escopo seguro para a faculdade: markup, validade, alertas. IA fica como módulo futuro (`api/engine/` já separado). Projeto pronto > projeto grande. |
| 7 | Deploy | **Vercel (landing + painel) + Render (API)** | Tudo grátis. Render "dorme" após 15 min sem requisições (cold start ~50s — aceito; abrir o site 1 min antes da demo). |
| 8 | Domínio | **Nenhum por enquanto** — URLs padrão Vercel | Nome da marca ainda indefinido. `og:url`/`canonical` apontam para a URL Vercel; trocar quando houver DNS. |
| 9 | Git | **Branches + PR + Conventional Commits** | Aprender pipeline profissional desde já; `main` é produção. |
| 10 | Custo | **R$ 0** | Supabase Free + Vercel Hobby + Render Free. |

---

## 3. Arquitetura alvo

```
┌─────────────────────┐        ┌──────────────────────┐
│  Vercel — Landing   │        │  Vercel — Painel     │
│  landing/index.html │        │  painel/ (React+Vite)│
│  HTML puro (SEO)    │        │  supabase-js (login) │
│  Web3Forms (leads)  │        │  fetch → API (dados) │
└─────────┬───────────┘        └──────────┬───────────┘
          │                               │ Authorization: Bearer <JWT>
          │                               ▼
          │                      ┌─────────────────────┐
          │                      │  Render — API (Python) │
          │                      │  FastAPI: /docs (Swagger)│
          │                      │  middleware JWT (pyjwt)  │
          │                      │  rotas, schemas, regras  │
          │                      │  engine/ (lógica estoque)│
          │                      └──────────┬──────────────┘
          │                                 │ psycopg/SQLAlchemy (pooler 6543)
          │                                 ▼
          │                        ┌─────────────────────┐
          └──── leads (webhook)    │  Supabase           │
                                   │  • PostgreSQL (RLS) │
                                   │  • Auth (JWT)       │
                                   └─────────────────────┘
```

### Fluxo de autenticação (sem bloqueios front/back)

1. **Painel (React)**: `supabase-js` → `signInWithPassword` → recebe o **JWT**.
2. **Painel → API**: toda requisição leva `Authorization: Bearer <JWT>`.
3. **API (FastAPI)**: middleware decodifica o JWT (biblioteca `pyjwt`, secret do projeto no `.env`), extrai `sub` = `user_id`.
4. **Consultas**: sempre filtradas por `user_id` na API **+** RLS nas tabelas (dupla proteção, padrão de site sério).

### Estrutura de pastas (alvo)

```
Precifica+/
├── AGENTS.md               # Contexto para agentes de IA (init)
├── readme.md               # Apresentação do repo
├── dev.ps1                 # Servidor local da landing (porta 8000)
├── docs/
│   ├── planejamento.md     # Este documento
│   └── git-workflow.md     # Fluxo de branches/PR da equipe
├── trello/
│   ├── index.html          # Quadro Kanban do projeto (fonte de status)
│   └── trello-data.json    # Dados do quadro (sincronizar com o HTML sempre)
├── landing/                # → precifica-landing.vercel.app (HTML puro)
│   ├── index.html
│   ├── robots.txt / sitemap.xml / 404.html
│   └── src/ (css, js, assets)
├── painel/                 # → painel-precifica.vercel.app (React+Vite+TS)
│   ├── src/ (componentes, páginas)
│   └── (scaffold do Vite criado na Fase 5)
└── api/                    # → Render (Python FastAPI)
    ├── app/ (main.py, routers/, models/, schemas/, services/, engine/)
    ├── tests/ (pytest)
    ├── seed.sql
    └── requirements.txt
```

> **Quadro da equipe**: GitHub Pages publica `trello/` a partir da branch `main` → `https://miriamssntos.github.io/Precifica/trello/`. O quadro carrega `trello-data.json` do repositório; o array `DEFAULT_TASKS` no HTML é fallback offline — **manter os dois sincronizados** ao mudar status.

> `painel/login.html` e `painel/dashboard.html` (mockups atuais) servirão de **referência de design** para o React — o visual será reaproveitado via design tokens.

---

## 4. Banco de dados (PostgreSQL — Supabase)

### Tabelas propostas

| Tabela | Campos principais | Finalidade |
|---|---|---|
| `profiles` | `id` (FK auth.users), `nome`, `empresa`, `plano`, `created_at` | Perfil do usuário logado |
| `categories` | `id`, `user_id`, `nome`, `slug` | Categorias de produto do usuário |
| `products` | `id`, `user_id`, `category_id`, `nome`, `sku`, `custo`, `preco_venda`, `estoque_atual`, `estoque_min`, `validade`, `created_at` | Estoque e precificação |
| `price_history` | `id`, `product_id`, `preco_anterior`, `preco_novo`, `motivo`, `created_at` | Histórico de reajustes |
| `promotions` | `id`, `product_id`, `desconto_pct`, `data_inicio`, `data_fim`, `status` | Promoções sugeridas |
| `alerts` | `id`, `user_id`, `product_id`, `tipo` (validade/estoque), `mensagem`, `lida`, `created_at` | Alertas do dashboard |

### Segurança

- **RLS**: policies `user_id = auth.uid()` em todas as tabelas.
- A API conecta com o **Postgres direto** (não usa PostgREST): string do pooler (porta 6543, transacional) no `.env`.
- Chaves/secret do Supabase ficam em `.env` gitignored (`.env.example` com placeholders versionado).

### Seed (dados protótipo)

Supermercado fictício (ex.: Hortifruti Delícia): ~10 produtos em categorias (hortifruti, laticínios, açougue, padaria), com custo, preço, validade e alertas — espelhando os números que o `painel/dashboard.html` mockado exibe, para a demo bater com o design.

---

## 5. API Python (FastAPI) — matéria de backend

### Stack

- **FastAPI** + **Uvicorn** (servidor), **Pydantic** (schemas/validação), **SQLAlchemy** (models/ORM), **psycopg** (driver Postgres), **pyjwt** (validação do JWT do Supabase), **pytest** (testes).
- Python 3.10+ (já instalado na máquina) com `venv` + `requirements.txt`.

### Endpoints previstos

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Status da API |
| GET/POST/PATCH/DELETE | `/products` | CRUD de produtos (sempre por `user_id`) |
| GET | `/categories` | Lista categorias |
| GET | `/alerts` | Alertas (validade/estoque) |
| GET | `/stats` | Resumo do dashboard (totais, margens, giro) |
| POST | `/engine/recalc` | Recalcula sugestões de preço/alerta (lógica de estoque) |
| GET | `/docs` | Swagger UI (testável na banca) |

### Engine v1 — lógica de estoque (sem IA)

Regras simples em Python, isoladas em `api/app/engine/`:
- **Margem**: `preco_venda = custo / (1 - margem_desejada)`.
- **Validade**: alerta quando `validade - hoje <= X dias`.
- **Estoque**: alerta quando `estoque_atual <= estoque_min`.
- **Sugestão**: reajuste de preço conforme giro (velocidade de saída).
- IA (promoções automáticas) entra depois como novo módulo dentro da mesma pasta.

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

### Fase 2 — SEO da landing (branch `feat/fase2-seo`)
- [ ] Corrigir `og:url` (bug: `precificaplus.com.br`) e adicionar `canonical` → `https://precifica-landing.vercel.app/`
- [ ] Gerar `og:image` 1200x630 (PNG com branding Precifica+)
- [ ] Adicionar `theme-color` e revisar JSON-LD
- [ ] Validar no Google Rich Results / Lighthouse

### Fase 3 — Supabase (usuário cria o projeto; agentes fornecem SQL)
- [ ] Criar projeto Supabase (free) — UI manual do usuário
- [ ] Aplicar schema SQL + RLS + seed protótipo
- [ ] Criar conta demo (Auth → Users)
- [ ] Guardar credenciais em `.env` gitignored

### Fase 4 — API Python (branch `feat/fase4-api`)
- [ ] Scaffold FastAPI (`venv` + `requirements.txt` + `app/`)
- [ ] Middleware de auth JWT (Supabase)
- [ ] CRUD de produtos/categorias + stats + alertas
- [ ] Engine v1 (lógica de estoque: margem, validade, giro)
- [ ] Testes `pytest`
- [ ] Validar `/docs` (Swagger) no navegador

### Fase 5 — Painel React (branch `feat/fase5-painel`)
- [ ] Scaffold Vite + TypeScript
- [ ] Página de login com `supabase-js` (reaproveitar design do mockup)
- [ ] Session guard + logout
- [ ] Dashboard consumindo a API Python (fetch + JWT)
- [ ] `npm run build` sem erros

### Fase 6 — Deploy + CI/CD (branch `feat/fase6-deploy`)
- [ ] Vercel: `landing/` → `precifica-landing.vercel.app`
- [ ] Vercel: `painel/` → `painel-precifica.vercel.app` (+ `noindex`)
- [ ] Render: API Python (auto-deploy via GitHub; cold start aceito)
- [ ] Fluxo completo em produção: landing → login → dashboard
- [ ] CI/CD funcionando: push → deploy automático

### Fase 7 — Documentação acadêmica (branch `feat/fase7-docs`)
- [ ] README completo (arquitetura, schema, fluxo de auth)
- [ ] Justificativa: auth externo (Supabase) é prática de mercado; backend real = API Python
- [ ] Print do Swagger `/docs` para a apresentação

### Fase 8 — Opcional (só se sobrar tempo)
- [ ] Integração com IA na engine (promoções automáticas)
- [ ] Cadastro público de usuário

---

## 7. Checklist SEO da landing

- [ ] `title` único e descritivo (~60 chars) — ok
- [ ] `meta description` (~150 chars) — ok
- [ ] Open Graph: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:locale`
- [ ] Twitter Cards (`summary_large_image`)
- [ ] `canonical` → URL Vercel (até ter domínio próprio)
- [ ] `robots.txt` + `sitemap.xml` — criados; revisar URLs
- [ ] JSON-LD (Organization, Product, FAQ)
- [ ] `theme-color`, favicon, Apple touch icon
- [ ] Texto alternativo (`alt`) em imagens
- [ ] Performance: HTML estático, fontes com `preconnect`

---

## 8. Deploy (passo a passo para o usuário)

1. **Vercel** (conta grátis com GitHub): Projeto 1 → Root Directory `landing`; Projeto 2 → Root Directory `painel` (build: `npm run build`). URLs geradas: `precifica-landing.vercel.app`, `painel-precifica.vercel.app`.
2. **Render** (conta grátis): New Web Service → repo `Precifica+` → Root Directory `api` → Build: `pip install -r requirements.txt` → Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` → variáveis de ambiente do `.env`. Auto-deploy em cada push na main.
3. **Noindex do painel**: `<meta name="robots" content="noindex">` + header `X-Robots-Tag` no Vercel.
4. **Domínio próprio (futuro)**: Vercel Settings → Domains (CNAME) + Render → Custom Domain. Atualizar `og:url`/`canonical`/`sitemap`/`robots.txt`.

---

## 9. Riscos e pendências

| Item | Status |
|---|---|
| Nome do produto/domínio ainda indefinido — SEO usa URL Vercel até decidir | 🔴 Em aberto |
| Professor aceitar auth externo (Supabase) na matéria de backend — alinhar antes | 🔴 Em aberto |
| Repo local 5 commits atrás do `origin/main` — fazer pull antes de criar branches | ⏳ Antes da Fase 2 |
| Cold start da API no Render (~50s) — abrir o site antes da apresentação | ✅ Aceito |
| Postgres do Supabase pausa após 1 semana sem uso — reativar com 1 clique | ✅ Aceito |
| Chaves/secret: `.env` gitignored, `.env.example` versionado | Regra permanente |
| Dados protótipo devem espelhar o mockup do painel | Fase 3 |
| Painel não pode ser indexado pelo Google | Fase 6 |
| Custo permanece R$ 0 | Regra permanente |

---

## 10. Ideias futuras (fora do escopo atual)

- **Quadro da equipe**: conectar ao Supabase Realtime na Fase 3 (drag & drop sincronizado na hora, sem push no git) — decisão tomada; enquanto isso, `trello-data.json` + auto-refresh de 60s é suficiente.

- Engine de IA (promoções automáticas com machine learning)
- Cadastro público na landing (CTA → criar conta → painel)
- Integração do formulário de lead com a API (substituir Web3Forms)
- Planos e cobrança (Essencial, Scale IA, Enterprise)
- Domínio próprio + SEO definitivo
- Modo escuro e modal de vídeo demo (pendências antigas do `todo.md`)
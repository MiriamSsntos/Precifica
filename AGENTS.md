# AGENTS.md — Precifica+

## Visão geral

Precifica+ é um SaaS B2B de IA para gestão de estoque e precificação de produtos perecíveis (supermercados/hortifrútis). Projeto acadêmico (faculdade) que futuramente será produção real; hoje usa dados protótipo. O usuário é iniciante e está aprendendo o fluxo profissional — priorize clareza e simplicidade, explicando decisões quando relevante.

## Arquitetura (alvo)

Monorepo com três partes:

```
landing/   → precifica-landing.vercel.app   (HTML/CSS/JS puro, foco SEO)
painel/    → painel-precifica.vercel.app    (React + Vite + TypeScript)
api/       → Render (Python FastAPI + PostgreSQL) — backend da matéria
trello/    → quadro Kanban de status do projeto
```

Decisões tomadas (não reverter sem perguntar):

- **Landing**: 100% HTML puro estático — melhor SEO possível. NUNCA adicionar framework/React aqui.
- **Painel**: React + Vite + TypeScript (padrão de mercado). Design atual do mockup (login/dashboard) é referência visual.
- **Backend**: Python + FastAPI escrito do zero (é a matéria de backend). Auth externo = Supabase Auth (JWT validado na API com `pyjwt`). Não usar Supabase como API/backend — só banco Postgres + auth.
- **Banco**: PostgreSQL do Supabase, conexão direta via pooler (porta 6543). RLS ativo + filtro por `user_id` na API (dupla proteção).
- **Engine v1**: SÓ lógica de estoque (margem, validade, giro, alertas) em `api/app/engine/`. IA é fase futura — não implementar sem pedir.
- **Deploy**: Vercel (landing + painel) + Render (API). Sem domínio próprio por enquanto — URLs `.vercel.app`/`.onrender.com` (cold start ~50s aceito).
- **Git**: branches `feat/<fase>` + PR + Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`). NUNCA commitar direto na `main` — **exceção única**: `trello/trello-data.json` atualizado pela UI do quadro (ferramenta interna da equipe, commit `chore:` automático).
- **Idioma**: pt-BR em produto e documentação. **Custo total: R$ 0.**

## Estado atual

- `landing/` — completa; faltam SEO (og:url bugado `precificaplus.com.br` → deve virar a URL Vercel, canonical, og:image, theme-color) = Fase 2.
- `painel/` — só mockups estáticos (login.html/dashboard.html); serão substituídos pelo React (Fase 5), servindo de referência de design.
- `api/` — ainda não existe (Fase 4).
- `docs/planejamento.md` — arquitetura, schema e fases (LER antes de executar qualquer fase).
- `trello/index.html` — quadro Kanban (GitHub Pages). Fonte única de dados: `trello/trello-data.json` (o HTML não tem dados embutidos). O quadro pode **commitar direto na `main`** via token GitHub (exceção documentada: ferramenta interna, não código). **Quando um status mudar (eu ou a equipe via UI), o arquivo `trello-data.json` deve refletir isso.**
- `dev.ps1` — preview local: `.\dev.ps1` (python http.server, porta 8000).
- GitHub Pages ativo: `https://miriamssntos.github.io/Precifica/` → quadro em `/trello/` (branch `main`; publicar via PR).
- gh CLI instalado e autenticado (`gh` disponível para PRs/Pages).
- Repo local está atrás do `origin/main` (fazer `git pull` antes de criar branch).

## Convenções

- Landing: HTML/CSS/JS vanilla (ES6+), sem npm. Painel: React + TS via Vite. API: Python 3.10+ com `venv` + `requirements.txt`.
- Design tokens: variáveis CSS `:root`; fontes Plus Jakarta Sans (texto) + Outfit (títulos); `--primary: #059669`.
- Não adicionar comentários ao código, a menos que solicitado.
- Manter semântica HTML e meta tags da landing (SEO é prioridade #1).
- Documentação e mensagens em pt-BR.

## Verificação

- Landing: abrir no navegador (ou `.\dev.ps1`) sem erros no console.
- Painel: `npm run build` sem erros (dentro de `painel/`).
- API: `pytest` (dentro de `api/`) + abrir `/docs` (Swagger).
- Não há lint configurado.

## Regras de trabalho

- Respeitar `docs/planejamento.md` e o quadro `trello/index.html` antes de implementar.
- Perguntar antes de criar contas externas (Supabase/Vercel/Render) — o usuário executa os passos de UI.
- Secrets ficam em `.env` gitignored; versionar apenas `.env.example` com placeholders.
- Todo recurso do painel/API considera isolamento por `user_id` (RLS + filtro na API).
- Trabalhar sempre em branch `feat/<fase>` e abrir PR (nunca commit direto na main).
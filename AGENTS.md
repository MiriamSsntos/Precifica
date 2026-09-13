# AGENTS.md — Precifica+

## Visão geral

Precifica+ é um SaaS B2B de IA para gestão de estoque e precificação de produtos perecíveis (supermercados/hortifrútis). Projeto acadêmico (faculdade) que futuramente será produção real; hoje usa dados protótipo. O usuário é iniciante e está aprendendo o fluxo profissional — priorize clareza e simplicidade, explicando decisões quando relevante.

## Arquitetura (alvo)

Monorepo com duas aplicações e Supabase:

```
landing/   → precifica-rouge.vercel.app          (HTML/CSS/JS puro, foco SEO)
painel/    → precifica-rouge.vercel.app/painel/  (React + Vite + TypeScript)
Supabase   → Auth + PostgreSQL/RLS + Views/RPC (engine v1)
trello/    → quadro Kanban de status do projeto
```

Decisões tomadas (não reverter sem perguntar):

- **Landing**: 100% HTML puro estático — melhor SEO possível. NUNCA adicionar framework/React aqui.
- **Painel**: React + Vite + TypeScript (padrão de mercado). Design atual do mockup (login/dashboard) é referência visual.
- **Backend**: sem backend próprio. O professor aprovou a arquitetura Supabase-only em ago/2026. O painel usa `supabase-js` diretamente.
- **Banco**: PostgreSQL do Supabase com RLS `auth.uid() = user_id`; a anon key é pública e a proteção real é o JWT + RLS.
- **Engine v1**: SÓ lógica de estoque (margem, validade, giro, alertas) em Views/RPC SQL no Supabase (`docs/engine.sql`). IA é fase futura — não implementar sem pedir.
- **Deploy**: projeto único na Vercel; rewrite de `/` para a landing e `/painel/` servido no mesmo projeto. Sem Render e sem domínio próprio por enquanto.
- **Git**: branches `feat/<fase>` + PR + Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`). NUNCA commitar direto na `main` — **exceção única**: `trello/trello-data.json` atualizado pela UI do quadro (ferramenta interna da equipe, commit `chore:` automático).
- **Idioma**: pt-BR em produto e documentação. **Custo total: R$ 0.**

## Estado atual

- `landing/` — publicada e **finalizada** (Fase 2 de SEO aplicada: canonical, og:image, theme-color, OG/Twitter; efeitos removidos, modo eco permanente; `privacidade.html` com `noindex`). Cadastro/login Supabase funcionam. É HTML puro, mas já carrega `@supabase/supabase-js` via CDN (única dependência externa) para o cadastro público. Não alterar sem motivo — foco atual é o painel.
- `painel/` — 8 páginas estáticas (login, dashboard, relatorios, config, ajuda + placeholders produtos, validades, promocoes) com auth real via Supabase e `src/js/supabase.js` compartilhado; serão substituídas pelo React (Fase 5), servindo de referência de design. Só os placeholders têm `noindex` por enquanto (pendência Fase 6 para as demais).
- `docs/schema.sql` e `docs/seed.sql` — aplicados no Supabase; engine SQL entra em `docs/engine.sql` (Fase 4, ainda não criado).
- `docs/planejamento.md` — arquitetura, schema e fases (LER antes de executar qualquer fase).
- `docs/git-workflow.md` — fluxo de branches/PR da equipe (passo a passo para o usuário); reforça regras abaixo.
- `trello/index.html` — quadro Kanban (GitHub Pages). Fonte única de dados: `trello/trello-data.json` (o HTML não tem dados embutidos). O quadro pode **commitar direto na `main`** via token GitHub (exceção documentada: ferramenta interna, não código). **Quando um status mudar (eu ou a equipe via UI), o arquivo `trello-data.json` deve refletir isso.**
- `dev.ps1` — preview local: `.\dev.ps1` (python http.server, porta 8000).
- GitHub Pages ativo: `https://miriamssntos.github.io/Precifica/` → quadro em `/trello/` (branch `main`; publicar via PR).
- gh CLI instalado e autenticado (`gh` disponível para PRs/Pages).
- Fluxo landing → cadastro/login → dashboard validado em produção.

## Convenções

- Landing: HTML/CSS/JS vanilla (ES6+), sem npm em runtime. Painel: React + TS via Vite. Engine: SQL (Views/RPC) no Supabase. O `package.json` na raiz é **dev-only** (lint/format/checks) e não afeta o deploy.
- Tooling (raiz, dev-only): `html-validate` (HTML), `stylelint` (CSS), `eslint` flat (JS vanilla), `prettier` (format) + `scripts/check-json-ld.mjs` e `scripts/check-local-links.mjs`. Ajustes intencionais: `void-style: selfclosing` e `doctype` lowercase (alinhados ao Prettier); `no-inline-style` off (protótipo usa inline intencional, incluindo cores dinâmicas); `no-descending-specificity` off (ruído entre componentes); `no-undef` off e `no-unused-vars` warn no ESLint (scripts clássicos compartilham globals; funções chamadas em handlers inline no HTML geram warnings esperados). `trello/` fica fora do lint/format.
- Design tokens: variáveis CSS `:root`; fontes Plus Jakarta Sans (texto) + Outfit (títulos); `--primary: #059669`.
- `painel/src/js/supabase.js` tem uma anon key `sb_publishable_*` embutida como fallback (antes de `window.__ENV_*` / localStorage). Isso é intencional: a chave é pública e a proteção real é o JWT + RLS — não "corrija" removendo-a.
- Não adicionar comentários ao código, a menos que solicitado.
- Manter semântica HTML e meta tags da landing (SEO é prioridade #1).
- Documentação e mensagens em pt-BR.

## Verificação

- Lint/format/checks (raiz, após `npm install`): `npm run verify` roda tudo (`lint` + `check`). Comandos: `npm run format` / `format:check`, `lint:html`, `lint:css`, `lint:js`, `check:jsonld` (valida JSON-LD embutido), `check:links` (confere `href`/`src` locais).
- Landing: abrir no navegador (ou `.\dev.ps1`) sem erros no console.
- Painel: hoje é mockup estático — validar abrindo as páginas (placeholders produtos/validades/promocoes não podem dar 404). `npm run build` só vale após o scaffold React (Fase 5).
- Supabase: executar e validar `docs/schema.sql`, `docs/seed.sql` e `docs/engine.sql` no SQL Editor.

## Regras de trabalho

- Respeitar `docs/planejamento.md`, `docs/git-workflow.md` e o quadro `trello/index.html` antes de implementar.
- Perguntar antes de criar contas externas (Supabase/Vercel) — o usuário executa os passos de UI.
- Secrets ficam em `.env` gitignored; versionar apenas `.env.example` com placeholders.
- Todo recurso do painel considera isolamento por `user_id` via RLS (`auth.uid() = user_id`).
- Trabalhar sempre em branch `feat/<fase>` e abrir PR (nunca commit direto na main).

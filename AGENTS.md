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

- `landing/` — publicada; cadastro/login Supabase funcionam. Faltam canonical, og:image, theme-color e validações SEO (Fase 2).
- `painel/` — mockups estáticos funcionais com auth; serão substituídos pelo React (Fase 5), servindo de referência de design.
- `docs/schema.sql` e `docs/seed.sql` — aplicados no Supabase; engine SQL entra em `docs/engine.sql` (Fase 4).
- `docs/planejamento.md` — arquitetura, schema e fases (LER antes de executar qualquer fase).
- `trello/index.html` — quadro Kanban (GitHub Pages). Fonte única de dados: `trello/trello-data.json` (o HTML não tem dados embutidos). O quadro pode **commitar direto na `main`** via token GitHub (exceção documentada: ferramenta interna, não código). **Quando um status mudar (eu ou a equipe via UI), o arquivo `trello-data.json` deve refletir isso.**
- `dev.ps1` — preview local: `.\dev.ps1` (python http.server, porta 8000).
- GitHub Pages ativo: `https://miriamssntos.github.io/Precifica/` → quadro em `/trello/` (branch `main`; publicar via PR).
- gh CLI instalado e autenticado (`gh` disponível para PRs/Pages).
- Fluxo landing → cadastro/login → dashboard validado em produção.

## Convenções

- Landing: HTML/CSS/JS vanilla (ES6+), sem npm. Painel: React + TS via Vite. Engine: SQL (Views/RPC) no Supabase.
- Design tokens: variáveis CSS `:root`; fontes Plus Jakarta Sans (texto) + Outfit (títulos); `--primary: #059669`.
- Não adicionar comentários ao código, a menos que solicitado.
- Manter semântica HTML e meta tags da landing (SEO é prioridade #1).
- Documentação e mensagens em pt-BR.

## Verificação

- Landing: abrir no navegador (ou `.\dev.ps1`) sem erros no console.
- Painel: `npm run build` sem erros (dentro de `painel/`).
- Supabase: executar e validar `docs/schema.sql`, `docs/seed.sql` e `docs/engine.sql` no SQL Editor.
- Não há lint configurado.

## Regras de trabalho

- Respeitar `docs/planejamento.md` e o quadro `trello/index.html` antes de implementar.
- Perguntar antes de criar contas externas (Supabase/Vercel) — o usuário executa os passos de UI.
- Secrets ficam em `.env` gitignored; versionar apenas `.env.example` com placeholders.
- Todo recurso do painel considera isolamento por `user_id` via RLS (`auth.uid() = user_id`).
- Trabalhar sempre em branch `feat/<fase>` e abrir PR (nunca commit direto na main).

# Painel Precifica+ (React + TS)

App do painel em React + Vite + TypeScript, 100% Supabase (sem backend próprio).

## Rodando local

```powershell
cd painel
npm install
```

Copie `.env.example` para `.env` e preencha com as credenciais do Supabase:

```powershell
Copy-Item .env.example .env
```

```powershell
npm run dev      # http://localhost:5173/painel/
npm run lint     # Biome (lint + format + imports)
npm run typecheck
npm run build    # tsc + build de produção em dist/
```

## Arquitetura (Supabase-only)

Sem backend próprio: o front usa `@supabase/supabase-js` direto.

- `src/lib/supabase.ts` — cliente singleton (lê `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`)
  + tipos das tabelas. A anon key é pública por design; a proteção real é o JWT + RLS
  (`auth.uid() = user_id` em toda tabela).
- `src/auth/AuthContext.tsx` — sessão, perfil (`profiles`) e `<RequireAuth>` para
  proteger as rotas. O login usa Supabase Auth (e-mail/senha + OAuth Google/Azure).
- `src/lib/dashboard.ts` — cálculos puros do dashboard (mesma lógica do mockup).
- Rotas em `src/App.tsx` com `basename="/painel"` (React Router). Telas ainda não
  migradas do mockup usam `Placeholder` — o mockup original está em `painel-legacy/`.

## Deploy (Vercel, projeto único)

- `vite.config.ts` usa `base: "/painel/"`; o build gera `painel/dist/`.
- O `vercel.json` da raiz faz o build (`npm run build -w precifica-painel`) e o
  rewrite `/painel/*` → `dist` (com fallback SPA para `index.html`).
- Cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em Settings →
  Environment Variables no dashboard da Vercel (valem para Preview e Production).

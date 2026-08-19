# Git Workflow — Precifica+

> Guia da equipe: como trabalhamos com branches e pull requests (PR).
> Objetivo: aprender o pipeline profissional desde o início do projeto.

---

## 1. Modelo de branches

```
main (produção — protegida, não mexer direto)
  └── feat/fase2-seo      (trabalho da Fase 2)
  └── feat/fase3-supabase (trabalho da Fase 3)
  └── fix/...             (correções)
  └── docs/...            (só documentação)
```

- **`main`** = só recebe merges de PRs. Nunca commitar direto nela.
- **Uma branch por tarefa/fase** — assim o PR fica pequeno e fácil de revisar.

## 2. Nomes de branch

| Tipo | Padrão | Exemplo |
|---|---|---|
| Fase do plano | `feat/fase<N>-<resumo>` | `feat/fase2-seo` |
| Correção | `fix/<resumo>` | `fix/og-url` |
| Documentação | `docs/<resumo>` | `docs/git-workflow` |

## 3. Fluxo do dia a dia (passo a passo)

```powershell
# 1. Sempre sincronizar com o GitHub antes de começar
git checkout main
git pull

# 2. Criar a branch da tarefa
git checkout -b feat/fase2-seo

# 3. Fazer as alterações, depois revisar o que mudou
git status
git diff

# 4. Adicionar apenas os arquivos da tarefa e commitar
git add landing/index.html
git commit -m "feat: corrige og:url para a URL do Vercel"

# 5. Publicar a branch no GitHub
git push -u origin feat/fase2-seo

# 6. Criar o PR pelo navegador (ou gh cli)
gh pr create --title "feat: SEO da landing (Fase 2)" --body "..."

# 7. Depois do merge: voltar para main e atualizar
git checkout main
git pull
```

> Dica: `git status` antes de cada commit — se aparecer arquivo que não é da tarefa, não dê `git add .`; adicione arquivo por arquivo.

## 4. Conventional Commits

Mensagens padronizadas (o repo já usa este formato):

| Tipo | Quando usar | Exemplo |
|---|---|---|
| `feat:` | Novo recurso | `feat: adiciona middleware de autenticação JWT` |
| `fix:` | Correção de bug | `fix: corrige og:url apontando para domínio errado` |
| `docs:` | Documentação | `docs: cria guia de git workflow` |
| `chore:` | Manutenção (deps, config) | `chore: atualiza requirements.txt` |

Regras:
- Escrever no **imperativo** ("adiciona", "corrige").
- Assunto curto (< 72 chars). Detalhe vai no corpo do commit (opcional).
- **Não commitar secrets** (`.env`, chaves) — conferir com `git status` antes.

## 5. Pull Request (PR)

- **Um PR por branch**, título descritivo: `feat: SEO da landing (Fase 2)`.
- Descrição: o que foi feito, o que falta, como testar.
- Revisar o **diff** na aba "Files changed" antes de aprovar.
- **Merge**: pelo botão "Merge pull request" na UI do GitHub (evitar force-push e merges diretos via terminal).
- Depois do merge, a branch pode ser deletada (o GitHub oferece o botão).

## 6. Regras da equipe (não negociáveis)

1. Nunca commitar direto na `main`.
2. Sempre `git pull` na main antes de criar branch nova.
3. Commit só o que pertence à tarefa — nada de `git add .` por preguiça.
4. Um commit = uma mudança lógica (não "wip").
5. PR só é mergeado após revisão do diff.
6. Nenhum arquivo de segredo entra no repo (`.env` é gitignored).

## 7. Comandos úteis

```powershell
git log --oneline        # histórico resumido
git branch -a            # lista branches (local + remoto)
git checkout -b <nome>   # cria e entra na branch
git diff --staged        # mostra o que vai entrar no commit
git stash                # guarda mudanças temporárias
git status               # SEMPRE use antes de commitar
```
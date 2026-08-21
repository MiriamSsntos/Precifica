# Precifica+ — Inteligência Artificial para Gestão de Estoque e Preços ⚡

O **Precifica+** é uma plataforma B2B SaaS preditiva para gestão de estoque e precificação de produtos perecíveis. O objetivo é ajudar comerciantes e gerentes de supermercados/hortifrutis a evitarem o desperdício de produtos perecíveis, utilizando Inteligência Artificial para automatizar a precificação, monitorar validades críticas e disparar alertas de estoque baixo.

**Arquitetura (monorepo):**

- `landing/` — site principal de comunicação/vendas, **HTML puro** (SEO máximo) → `precifica-rouge.vercel.app`
- `painel/` — painel do cliente, **React + Vite + TypeScript** → `precifica-rouge.vercel.app/painel/`
- **Supabase** — Auth, PostgreSQL com RLS e engine de estoque em Views/RPC SQL
- `trello/` — quadro Kanban do projeto

> Roadmap, decisões e fases: [docs/planejamento.md](docs/planejamento.md). Contexto técnico: [AGENTS.md](AGENTS.md).

---

## 🚀 Demonstração Visual & Funcionalidades

O projeto foi construído focando em uma experiência imersiva e de alta conversão (Copywriting voltado para vendas SaaS), estruturado nas seguintes seções:

* **Hero Section Impactante:** Proposta de valor clara com simulação em tempo real de decisões automatizadas pela IA (ex: ofertas relâmpago para itens próximos ao vencimento).
* **Recursos Avançados:** Grade com os principais pilares do sistema (Promoções dinâmicas, precificação preditiva, filtros neurais e relatórios).
* **Motor de IA (Passo a Passo):** Linha do tempo interativa mostrando o fluxo de processamento de dados, desde a integração até o aumento real do lucro.
* **Casos de Sucesso:** Prova social com depoimentos reais simulados de gerentes do setor.
* **Planos Transparentes:** Tabela de preços escalável (Essencial, Scale IA, Enterprise) com alternância visual para o plano de maior destaque.
* **Formulário de Acesso Imediato:** Lead capture para teste gratuito de 14 dias com validação de dados em tempo real e feedback de sucesso amigável.
* **Seção de FAQ:** Acordeão interativo para sanar as dúvidas técnicas mais comuns dos clientes.

---

## 🎨 Diferenciais Técnicos e Efeitos Visuais

A interface vai além do HTML/CSS estático, implementando conceitos avançados de animação e performance:

* **Sistema de Ambiente Reativo (Dynamic Scenes):** Conforme o usuário navega pelas seções (`hero`, `features`, `howto`, etc.), as cores das luzes de fundo e o comportamento do canvas mudam dinamicamente para refletir o "clima" do conteúdo.
* **Canvas Grid Animado:** Um plano de fundo em elemento `<canvas>` que renderiza uma grade cibernética e partículas fluidas com velocidade atrelada à inércia da rolagem da página (*Lerp - Linear Interpolation*).
* **Scroll-Triggered Reveals:** Elementos surgem de forma suave na tela apenas quando entram na área de visualização do usuário, utilizando a API nativa `IntersectionObserver` para melhor performance.
* **Efeito Scan Line:** Uma linha de varredura que cruza a tela periodicamente, reforçando a estética de "análise de dados" e IA.
* **Glow Mouse Effect:** Cards de recursos e planos capturam as coordenadas do mouse para renderizar um efeito de iluminação localizado e interativo.

---

## 🛠️ Tecnologias Utilizadas

O projeto combina uma landing leve com um painel moderno e backend gerenciado:

* **HTML5:** Estruturação semântica e acessível.
* **CSS3:** Layouts modernos com **CSS Grid** e **Flexbox**, além do uso estratégico de variáveis CSS (`:root`) para controle do tema dinâmico.
* **JavaScript Vanilla (ES6+):** Manipulação de DOM, lógica de validação de formulários, controle de animações complexas, manipulação de API gráfica do Canvas e algoritmos de interpolação matemática para scroll suave.
* **React + Vite + TypeScript:** Stack planejada para o painel do cliente.
* **Supabase:** autenticação, PostgreSQL, RLS e engine de estoque em Views/RPC SQL.

---

## 📦 Como Executar o Projeto Localmente

Por se tratar de uma aplicação estática puramente frontend, você não precisa de gerenciadores de pacotes como NPM ou Yarn.

1.  Clone este repositório para a sua máquina:
    ```bash
    git clone https://github.com/MiriamSsntos/Precifica-.git
    ```

2.  Acesse a pasta do projeto:
    ```bash
    cd Precifica-
    ```

3.  Inicie o servidor local (Windows PowerShell):
    ```powershell
    .\dev.ps1
    ```
    O navegador abre em `http://localhost:8000/landing/`. Alternativas: abrir `landing/index.html` direto no navegador ou usar **Live Server** do VS Code (sem hot-reload automático na landing por causa do canvas).

---

## 📁 Estrutura do Projeto

```
Precifica+/
├── landing/            # Site principal (precifica.com.br) — SEO e conversão
│   ├── index.html      # Landing Page
│   ├── robots.txt      # SEO
│   ├── sitemap.xml     # SEO
│   ├── 404.html        # Página de erro
│   └── src/            # css/, js/, assets/
├── painel/             # Painel do cliente (/painel/ no mesmo deploy)
│   ├── login.html      # Tela de login
│   └── dashboard.html  # Dashboard mockado e funcional com Supabase Auth
├── docs/               # Planejamento, schema, seed e futura engine SQL
├── AGENTS.md           # Contexto técnico do projeto
├── dev.ps1             # Servidor local de preview
├── readme.md           # Este arquivo
```

---

## 📝 Licença

Este projeto é de uso acadêmico e demonstrativo.

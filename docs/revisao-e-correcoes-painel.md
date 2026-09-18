# 📋 Precifica+ — Documento de Correções, Ajustes e Melhorias do Painel

> **Status:** Especificação Técnica de Correções e Roadmap  
> **Escopo:** Aplicação Web (`painel-app`), Autenticação (`Supabase Auth`) e Banco de Dados (`Supabase PostgreSQL/RLS`)  
> **Objetivo:** Transformar o protótipo funcional em uma plataforma de padrão profissional de mercado, alinhada aos requisitos acadêmicos e às regras de negócio de um supermercado real.  
> **Custo do Projeto:** Mantido estritamente em **R$ 0,00** (Free tier Supabase + Vercel).

---

## 📑 Sumário Executivo

| Seção | Prioridade | Complexidade | Foco Principal |
|---|---|---|---|
| [1. Global & Shell da Aplicação](#1-global--shell-da-aplicação) | **Alta** | Média | Dropdown de usuário, busca inteligente e card Scale IA |
| [2. Sistema de Autenticação & Login](#2-sistema-de-autenticação--login) | **Alta** | Média | OAuth (Google/Microsoft), recuperação e dados de cadastro |
| [3. Aba Dashboard](#3-aba-dashboard) | **Alta** | Média | Métricas reais de varejo, estoque crítico e tempo de prateleira |
| [4. Aba Produtos](#4-aba-produtos) | **Alta** | Baixa-Média | Ordenação, cards como filtro, normalização sem acento e KPIs |
| [5. Aba Validades](#5-aba-validades) | **Média** | Baixa-Média | Centralização de alarmes no sino, auto-refresh e flag `viewed` |
| [6. Aba Promoções IA](#6-aba-promoções-ia) | **Alta** | Média | Engine de precificação psicológica (.49/.99) e edição vigente |
| [7. Aba Relatórios](#7-aba-relatórios) | **Média** | Média | Exportação CSV/PDF e batimento real com o banco |
| [8. Aba Configurações](#8-aba-configurações) | **Média** | Média | Dados reais, remoção de foto, importador CSV/XLSX e troca de senha |
| [9. Aba Ajuda & Suporte](#9-aba-ajuda--suporte) | **Baixa** | Baixa | Chat simulado, WhatsApp, manual, embed YouTube e doc de API |
| [10. Melhorias Adicionais Recomendadas](#10-melhorias-adicionais-recomendadas-pela-engenharia) | **Recomendada** | Média | Atalhos, performance, consistência de layout e modo offline |

---

## 1. Global & Shell da Aplicação

### 1.1. Menu do Usuário Miriam Santos (Canto Superior Direito)
- **Problema Atual:** O componente `<button className={styles.userChip} onClick={handleLogout}>` no topo dispara imediatamente a caixa de diálogo de logout ao ser clicado.
- **Correção Necessária:**
  1. Substituir o clique direto de logout por um **Menu Popover / Dropdown flutuante** ao clicar no avatar ou nome.
  2. Conteúdo do Dropdown:
     - **Cabeçalho com resumo:** Nome completo do usuário (`user.displayName`), e-mail cadastrado e nome do supermercado (`user.company`).
     - **Badge de Status:** Exibir plano atual (ex: *"Plano Scale IA — Ativo"*).
     - **Atalho rápido:** Link direto para *"Configurações da Conta"* (`/config`).
     - **Atalho de ajuda:** Link para *"Central de Ajuda"* (`/ajuda`).
     - **Separador visual.**
     - **Ação de saída:** Botão *"Sair da conta"* (vermelho/destaque), este sim abrindo o modal de confirmação (`useConfirm()`).
  3. Fechar o dropdown automaticamente ao clicar fora ou pressionar `Escape`.

### 1.2. Busca Global com Autocomplete e Seleção em Tempo Real
- **Problema Atual:** O campo de busca da barra superior depende do envio do formulário (`onSubmit` / tecla `Enter`), redirecionando para `/produtos?busca=termo`.
- **Correção Necessária:**
  1. Adicionar evento `onChange` com **debounce** (250ms a 300ms) para não sobrecarregar consultas.
  2. Abrir uma **janela suspensa de resultados rápidos (Live Results Dropdown)** logo abaixo do campo de busca conforme o usuário digita:
     - Listar até 5 ou 6 produtos correspondentes (com thumbnail/ícone, nome, categoria, preço atual e quantidade em estoque).
     - Se o produto tiver validade crítica, destacar com badge colorida.
  3. Ao clicar em um produto da lista:
     - Navegar para `/produtos?busca=NomeDoProduto` e destacar a linha, **ou** abrir diretamente o modal de visualização/edição do produto.
  4. Manter a opção de pressionar `Enter` para ver a listagem completa na página de Produtos.
  5. Adicionar navegação acessível por teclado (setas para cima/baixo para navegar entre itens sugeridos e `Esc` para fechar).

### 1.3. Card "Plano Scale IA" na Barra Lateral (Sidebar)
- **Problema Atual:** O card fixo na base da barra lateral (`div.upgrade`) está 100% estático, sem indicação do período de avaliação e com o botão *"Fazer upgrade"* sem função.
- **Correção Necessária:**
  1. **Contador de Período de Testes:**
     - Exibir contagem regressiva visual: *"Período de teste: 12 dias restantes"* ou *"Trial vence em 14/10/2026"*.
     - Incluir uma barra de progresso sutil indicando o tempo decorrido do teste gratuito.
  2. **Interatividade do Card:**
     - O botão *"Fazer upgrade"* ou o clique no próprio card deve abrir o modal de Planos ou redirecionar para `/config#planos`.
  3. **Opção de Recolher/Minimizar:**
     - Adicionar botão de fechar (`×`) ou recolher o card para usuários que preferirem maximizar o espaço visual da navegação lateral (salvando a preferência no `localStorage`).

---

## 2. Sistema de Autenticação & Login

### 2.1. Autenticação Social (OAuth Google e Microsoft)
- **Problema Atual:** O login atual possui apenas autenticação por e-mail e senha. Não há botões sociais nem fluxo OAuth implementado.
- **Correção Necessária:**
  1. **Interface do Usuário:** Adicionar botões elegantes *"Entrar com Google"* e *"Entrar com Microsoft"* no rodapé do formulário de login (com os ícones oficiais das marcas).
  2. **Integração Supabase:**
     - Executar chamada:
       ```typescript
       await supabase.auth.signInWithOAuth({
         provider: 'google', // ou 'azure'
         options: { redirectTo: window.location.origin + '/painel/' }
       });
       ```
  3. **Tratamento Amigável para Ambiente Acadêmico:**
     - Caso o provedor não tenha credenciais cadastradas no console Supabase do aluno (Google Cloud Client ID / Azure Tenant), interceptar o erro e exibir um alerta/toast explicativo: *"Provedor OAuth em homologação. Utilize o login por e-mail e senha."*.

### 2.2. Recuperação de Senha ("Esqueci minha senha")
- **Problema Atual:** Falta o fluxo de recuperação de acesso para usuários que esqueceram suas credenciais.
- **Correção Necessária:**
  1. Adicionar o link *"Esqueceu sua senha?"* ao lado do campo de senha.
  2. Criar modal ou aba para digitação do e-mail cadastrado.
  3. Disparar a chamada Supabase:
     ```typescript
     await supabase.auth.resetPasswordForEmail(email, {
       redirectTo: window.location.origin + '/painel/redefinir-senha',
     });
     ```
  4. Exibir feedback claro: *"E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada e spam."*.

### 2.3. Confirmação de E-mail
- **Problema Atual:** Se a opção *"Confirm email"* estiver habilitada no Supabase Auth, o usuário que tenta entrar sem confirmar vê um erro genérico.
- **Correção Necessária:**
  1. Tratar o erro `Email not confirmed` retornando um aviso claro.
  2. Disponibilizar botão *"Reenviar e-mail de confirmação"* invocando:
     ```typescript
     await supabase.auth.resend({ type: 'signup', email });
     ```

### 2.4. Formulário de Cadastro de Novo Cliente
- **Problema Atual:** Discrepância entre o formulário da Landing Page (que coleta dados detalhados como Nome, Supermercado, Telefone, Segmento) e a tela de cadastro do painel (que é minimalista).
- **Correção Necessária:**
  1. Alinhar os campos essenciais do cadastro no painel:
     - Nome completo do responsável.
     - Nome da empresa/supermercado.
     - E-mail corporativo.
     - Telefone / WhatsApp de contato.
     - Senha (com medidor de força da senha).
  2. Gravar os dados adicionais diretamente no objeto `metadata` do Supabase Auth e garantir o disparo da trigger no PostgreSQL para preencher a tabela `public.profiles`.

---

## 3. Aba Dashboard

### 3.1. Repaginação com Métricas Reais de Varejo de Perecíveis
- **Problema Atual:** O dashboard apresenta dados e cards genéricos, faltando indicadores vitais para gestores de supermercados e hortifrútis.
- **Correção Necessária (Novos Cards e Indicadores):**
  1. **Card de Estoque Crítico (Risco Iminente):**
     - Quantidade de itens e valor total em risco de perda com validade inferior a 3 dias.
     - Destaque em vermelho/alerta com botão *"Ver lotes críticos"*.
  2. **Tempo Médio de Prateleira (Shelf Life Residual):**
     - Média de dias úteis restantes dos produtos atualmente expostos na loja.
     - Métrica avançada muito valorizada por professores e bancas avaliadoras de gestão de suprimentos.
  3. **Índice de Perda Evitada (ROI do Precifica+):**
     - Comparativo: `Total Salvo em Vendas Promocionais` vs. `Perda Financeira por Descarte`.
     - Demonstra o valor gerado pela IA ao evitar que o produto vá para o lixo.
  4. **Taxa de Ruptura e Giro Lento:**
     - Destaque para produtos com estoque zerado ou sem saída há mais de 10 dias.
  5. **Cards com Navegação e Filtro Automático:**
     - Ao clicar em qualquer card (ex: *"14 produtos críticos"*), o usuário deve ser redirecionado para a tela de Produtos ou Validades com aquele filtro já ativado.

---

## 4. Aba Produtos

### 4.1. Ordenação Dinâmica por Colunas
- **Problema Atual:** A tabela de produtos possui ordem fixa (geralmente por data de criação ou alfabética simples).
- **Correção Necessária:**
  1. Tornar os cabeçalhos clicáveis com indicadores visuais de ordenação (ícones `▲` / `▼`):
     - **Nome do Produto** (A-Z / Z-A)
     - **Categoria** (A-Z)
     - **Preço de Custo (R$)** (Menor / Maior)
     - **Preço de Venda (R$)** (Menor / Maior)
     - **Margem de Lucro (%)** (Menor / Maior)
     - **Quantidade em Estoque** (Menor / Maior)
     - **Dias para Vencimento** (Mais próximo / Mais distante)
  2. Manter a ordenação no estado da página sem recarregar dados desnecessariamente.

### 4.2. Filtro Rápido ao Clicar nos Cards Superiores
- **Problema Atual:** Os cards de resumo no topo da página de produtos são apenas informativos e estáticos.
- **Correção Necessária:**
  1. Tornar os cards interativos com comportamento de botão/filtro:
     - Clicar em *"Validade Crítica"* → Filtra a tabela instantaneamente para itens com `dias_para_vencer <= 3`.
     - Clicar em *"Estoque Baixo"* → Filtra itens com quantidade abaixo do estoque mínimo.
     - Clicar em *"Margem Baixa"* → Filtra itens com margem inferior a 15%.
  2. Exibir tag visual de filtro ativo (ex: *"Filtro ativo: Validade Crítica (× Limpar)"*).

### 4.3. KPIs Financeiros de Estoque (Caixa e Previsão de Receita)
- **Problema Atual:** A tela não evidencia o montante financeiro parado em mercadorias.
- **Correção Necessária:**
  1. Adicionar um resumo financeiro superior ou barra de rodapé:
     - **Valor Total Imobilizado a Custo:** `Σ (quantidade * preco_custo)`
     - **Valor Projetado de Faturamento:** `Σ (quantidade * preco_venda)`
     - **Lucro Bruto Projetado:** Diferença entre Faturamento e Custo.
     - **Margem Média Consolidada:** Média ponderada da loja.

### 4.4. Normalizador de Texto na Busca (Insensível a Acentos)
- **Problema Atual:** Buscar por "pao" não retorna "pão"; a busca exige pontuação e acentuação exata.
- **Correção Necessária:**
  1. Implementar função de normalização de strings:
     ```typescript
     export function normalizeText(text: string): string {
       return text
         .normalize("NFD")
         .replace(/[\u0300-\u036f]/g, "")
         .toLowerCase()
         .trim();
     }
     ```
  2. Aplicar a normalização tanto no termo pesquisado quanto nos campos do produto (nome, categoria, código de barras) antes do filtro.

---

## 5. Aba Validades

### 5.1. Centralização dos Alarmes no Sino de Notificações Global
- **Problema Atual:** A tela de validades possui controles locais de som e alarmes próprios, duplicando funcionalidades com a barra superior.
- **Correção Necessária:**
  1. Remover o banner/card de alarme sonoro isolado de dentro da página de Validades.
  2. Concentrar toda a experiência de alerta sonoro e contagem de itens vencidos exclusivamente no **ícone do sino na barra superior (`DashboardLayout`)**.

### 5.2. Otimização e Simplificação da Tela de Validades
- **Problema Atual:** A página repete campos de busca e botão de "Cadastrar Novo Produto" que já existem no cabeçalho global.
- **Correção Necessária:**
  1. Remover botões redundantes e deixar a página focada na esteira de validade:
     - Divisão clara por gravidade: **Vencidos**, **Vencem Hoje**, **Vencem em até 3 dias**, **Vencem em até 7 dias** e **Validades Seguras**.
  2. Mover configurações avançadas de dias de alerta para a aba **Configurações**.

### 5.3. Atualização em Segundo Plano (Auto-Refresh 1 Minuto) com Flag `viewed`
- **Problema Atual:** Sem atualização em tempo real, lotes que vencem durante a operação não são percebidos sem recarregar a página manualmente; ou, se recarregados, disparam bipes repetidos.
- **Correção Necessária:**
  1. Criar timer com intervalo de 60 segundos (`setInterval`) para consultar atualizações de lotes.
  2. Implementar controle de notificações visualizadas (`viewed` / `dismissed`):
     - Manter no estado local / `sessionStorage` a lista de IDs de produtos cujos alertas já foram emitidos nesta sessão.
     - Só tocar áudio/alarme se houver um **novo** produto entrando no período crítico, impedindo repetição a cada ciclo de atualização.

---

## 6. Aba Promoções IA

### 6.1. Engine de Precificação Psicológica (Preços Charmosos de Varejo)
- **Problema Atual:** O algoritmo de sugestão de desconto calcula valores quebrados sem critério de marketing varejista (ex: produto de R$ 5,49 recebendo sugestão de R$ 3,57).
- **Correção Necessária:**
  1. Criar função de arredondamento psicológico de varejo:
     - Terminações comerciais padrão: `,99`, `,49`, `,89`, `,79` ou `,90`.
     - Exemplo: se o desconto matemático resultou em R$ 3,57, a engine ajusta para **R$ 3,49** (desconto atrativo) ou **R$ 3,59** (proteção de margem), respeitando rigorosamente o limite de preço de custo para evitar prejuízo.
  2. Exibir na interface o motivo do arredondamento: *"Arredondado para terminação comercial de alto giro (.49)"*.

### 6.2. Edição de Promoções Vigentes
- **Problema Atual:** Promoções ativas não oferecem opção de ajuste fino caso o gestor precise alterar o desconto no decorrer do dia.
- **Correção Necessária:**
  1. Adicionar botão *"Editar Promoção"* nos cards de promoções em andamento.
  2. Permitir que o gestor:
     - Ajuste o preço promocional final manualmente.
     - Altere a data de encerramento da promoção.
     - Encerre/pause imediatamente a oferta caso o lote tenha se esgotado fisicamente.

---

## 7. Aba Relatórios

### 7.1. Exportação Real de Relatórios (CSV e PDF)
- **Problema Atual:** O botão de exportação é apenas representativo ou não gera arquivos estruturados.
- **Correção Necessária:**
  1. **Exportação CSV:**
     - Gerar arquivo no formato legível por Excel (`sep=;`, codificação UTF-8 com BOM).
     - Colunas: `Código, Produto, Categoria, Estoque, Custo Unitário, Preço Venda, Margem %, Data Validade, Dias Restantes, Status`.
  2. **Exportação PDF / Impressão:**
     - Implementar layout de impressão limpo com `@media print` ou biblioteca cliente leve para gerar relatório formatado com cabeçalho da empresa, data/hora e sumário executivo.

### 7.2. Batimento Rigoroso dos Cálculos com o Banco de Dados
- **Problema Atual:** Valores calculados no front-end podem divergir dos dados reais cadastrados no Supabase.
- **Correção Necessária:**
  1. Certificar que todas as métricas consolidadas (perdas totais, receita gerada, ticket médio de remarcação) sejam baseadas nas mesmas fórmulas do banco de dados ou calculadas sobre o dataset completo de produtos do usuário.

---

## 8. Aba Configurações

### 8.1. Sincronização dos Dados Reais do Usuário e do Estabelecimento
- **Problema Atual:** A interface exibe valores fictícios como `demo@precifica.app` ou dados estáticos da Miriam.
- **Correção Necessária:**
  1. Carregar via `supabase.auth.getUser()` e consulta à tabela `profiles`:
     - Nome do Gestor
     - E-mail de login (somente leitura ou com confirmação de troca)
     - Razão Social / Nome Fantasia do Mercado
     - Telefone / WhatsApp de contato
  2. Adicionar botão *"Salvar Alterações"* com feedback em Toast e atualização imediata do cabeçalho global.

### 8.2. Remoção do Upload de Fotos de Avatar
- **Decisão Técnica Aprovada:** O envio de fotos de perfil traz custo desnecessário de storage, tráfego e políticas de upload para uma aplicação B2B focada em gestão de gôndola.
- **Ação:**
  1. Remover o campo de seleção de foto de perfil.
  2. Substituir por um gerador automático de avatar com as iniciais do gestor ou do mercado sobre um gradiente profissional (ex: "MS" para Miriam Santos, "SM" para Supermercado Moderno).

### 8.3. Gestão de Conta e Planos
- **Problema Atual:** A aba não possui histórico de faturas nem mecanismo de troca de plano.
- **Correção Necessária:**
  1. **Tabela de Histórico de Faturas (Simulada):**
     - Exibir faturas anteriores com status *"Paga"*, data, valor e link de *"Segunda via / Recibo"*.
  2. **Seletor de Planos:**
     - Exibir comparativo dos planos: **Starter**, **Pro** e **Scale IA**.
     - Permitir alternar de plano com modal de confirmação e atualização da badge visual em toda a aplicação.

### 8.4. Centralização das Configurações de Alerta
- **Problema Atual:** Parâmetros de antecedência de alerta estavam dispersos na tela de validades.
- **Correção Necessária:**
  1. Unificar em Configurações:
     - Dias de antecedência para Alerta Amarelo (Atenção): padrão 7 dias.
     - Dias de antecedência para Alerta Laranja (Crítico): padrão 3 dias.
     - Ativação/desativação de sinal sonoro no sino.

### 8.5. Simulador de Importação de Planilhas (CSV / XLSX)
- **Problema Atual:** Falta de um meio prático para demonstrar a carga inicial de centenas de produtos de um supermercado.
- **Correção Necessária:**
  1. Criar área de *Drag & Drop* para arquivos `.csv` e `.xlsx`.
  2. Processamento client-side: leitura das primeiras 5 linhas com tabela de pré-visualização (Preview) dos dados.
  3. Mapeamento de colunas interativo: correlacionar colunas da planilha do cliente com os campos do Precifica+ (`Nome`, `Código`, `Preço`, `Validade`, `Estoque`).
  4. Botão *"Importar dados"* simulando a carga em lote com barra de progresso.

### 8.6. Troca de Senha Segura
- **Problema Atual:** Formulário de redefinição de senha sem conexão com a API do Supabase.
- **Correção Necessária:**
  1. Conectar os campos "Nova Senha" e "Confirmar Nova Senha" à chamada:
     ```typescript
     const { error } = await supabase.auth.updateUser({ password: novaSenha });
     ```
  2. Exibir toast de sucesso ou mensagens de erro claras (ex: senha muito curta).

---

## 9. Aba Ajuda & Suporte

### 9.1. Atendimento Rápido: Chat Simulado, WhatsApp e E-mail
- **Problema Atual:** Página estática com links genéricos.
- **Correção Necessária:**
  1. **Chat de Suporte Simulado:**
     - Janela de atendimento interativa com bot de autoatendimento.
     - Respostas prontas para as dúvidas mais comuns ("Como cadastrar um lote?", "Como a IA calcula descontos?", "Como exportar relatórios?").
  2. **WhatsApp Direto:**
     - Botão com link formatado: `https://wa.me/5511999999999?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20no%20painel%20do%20Precifica%2B`.
  3. **E-mail de Suporte:**
     - Link `mailto:suporte@precifica.app?subject=Suporte%20Precifica%2B` abrindo o cliente de e-mail padrão do sistema operacional.

### 9.2. Central de Documentação e FAQs
- **Correção Necessária:**
  1. Adicionar seção expansível (Accordion) com 6 a 8 perguntas frequentes essenciais sobre estoque perecível e gestão de margem.
  2. Guia passo a passo ilustrado com as boas práticas de cadastramento de validades.

### 9.3. Vídeo Tutorial Demonstrativo (Embed YouTube)
- **Correção Necessária:**
  1. Inserir container de vídeo responsivo (`16:9`) com `<iframe>` do YouTube.
  2. Exibir thumbnail personalizada e título: *"Como reduzir perdas em até 35% com o Precifica+ em 5 minutos"*.

### 9.4. Documentação Técnica da API (Simulada para ERPs)
- **Objetivo Acadêmico:** Demonstrar aos avaliadores como a plataforma se integra a sistemas de PDV (frente de caixa) como Linx, Totvs ou Toledo.
- **Correção Necessária:**
  1. Adicionar aba *"API para Desenvolvedores / ERPs"*.
  2. Apresentar exemplos de requisições `curl` e payloads JSON de endpoints simulados:
     - `POST /api/v1/produtos/sincronizar`
     - `GET /api/v1/validades/alertas`
     - `POST /api/v1/promocoes/aplicar`
  3. Exibir campo com token de chave de API fictício gerado para a loja (`pk_live_...`).

---

## 10. Melhorias Adicionais Recomendadas pela Engenharia

Além dos pontos solicitados, foram identificadas as seguintes melhorias de alto impacto que elevam a qualidade da entrega:

### 10.1. Atalhos Globais de Teclado (Power Users)
- `Ctrl + K` ou `/`: Focar imediatamente no campo de busca de produtos em qualquer tela.
- `Alt + N`: Abrir modal de cadastro de novo produto.
- `Esc`: Fechar modais e painéis suspensos.

### 10.2. Botão de "Acesso Rápido de Demonstração" (Modo Banca Acadêmica)
- Na tela de login, adicionar um botão sutil *"Entrar como Avaliador / Modo Demo"*.
- Permite que professores e jurados acessem o painel com 1 clique, sem precisar criar e-mails temporários ou validar cadastros, já com dados ricos carregados.

### 10.3. Impressão de Etiquetas de Promoção (Gôndola)
- Na aba de Promoções, adicionar botão *"Imprimir Cartaz de Oferta"* gerando layout pronto para folha A4 com destaque no preço anterior riscado e no novo preço promocional formatado para exposição imediata na loja.

### 10.4. Indicador de Status do Sistema (Health Check)
- No rodapé do painel ou na barra superior, adicionar indicador discreto de conexão:
  - 🟢 *Supabase Database: Online*
  - 🟢 *Engine de Precificação: Operacional*
  - 🟢 *Sincronização: Tempo Real*

---

## 🛠️ Matriz de Execução e Próximos Passos

Para manter o fluxo organizado de acordo com as diretrizes do projeto (`docs/git-workflow.md` e `AGENTS.md`):

1. **Branch recomendada para execução:** `feat/revisao-melhorias-painel`
2. **Ordem de implementação sugerida:**
   - **Sprint 1 (Fundação & Global):** Menu de usuário, Busca Realtime com normalização sem acento e Card Scale IA.
   - **Sprint 2 (Varejo & Métricas):** Dashboard repaginado, ordenação da tabela de produtos, KPIs financeiros e cards interativos como filtro.
   - **Sprint 3 (Operação de Loja):** Centralização dos alarmes de validade, auto-refresh 1min com flag de visualizado e engine de arredondamento comercial (.49/.99).
   - **Sprint 4 (Configurações, Ajuda & Exportação):** Sincronização de perfil real, remoção de fotos, importador CSV demonstrativo, WhatsApp, Chat e documentação de API.
3. **Validação:** Teste unitário e de build com `npm run verify -w precifica-painel`.

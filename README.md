# FinTrack — Controle Financeiro

Aplicação web de controle financeiro pessoal com autenticação e persistência em nuvem via Supabase. Interface redesenhada com um design system editorial ("paper / espresso"), dashboard modular e dark mode.

## Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** com suporte a dark mode (`darkMode: 'class'`)
- **Supabase** — autenticação e banco de dados (Postgres)
- **Lucide React** — ícones
- Gráficos em SVG próprios (donut, área, barras, anel de progresso) — sem dependência de lib de charts

## Funcionalidades

- Cadastro e login de usuários (rotas server-side para evitar CORS)
- Despesas fixas (recorrentes) e variáveis (extras), com parcelamento
- Despesa fixa parcelada com dia de vencimento
- Histórico de renda por período
- Metas de economia por mês, com valor inicial
- Seleção de cartões de crédito, com logo do banco
- Dashboard mensal modular: resumo, transações, fixas, dívidas & metas, planejamento/relatórios e configuração de categorias
- Gráficos: donut de gastos por categoria, área/barras de evolução e anel de progresso de metas
- Importação/restauração de dados via JSON (inclui migração de exports legados)
- Dark mode (aplicado antes do primeiro paint, sem flash)

## Configuração

### 1. Clone e instale as dependências

```bash
git clone https://github.com/AlexandreMouraa/controle-financeiro.git
cd controle-financeiro
npm install
```

### 2. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_supabase_anon_key
```

### 3. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção
npm run start    # Servidor de produção
npm run lint     # Lint com ESLint
```

## Estrutura

```
app/
  api/auth/            # Rotas de login e signup (server-side)
  login/               # Página de login
  signup/              # Página de cadastro
  layout.jsx           # Layout raiz (fontes, tema antes do paint)
  page.jsx             # Dashboard principal (envolto em AuthGuard)
  globals.css          # Design system + estilos do shell
components/
  FinanceTracker.jsx   # Componente principal — owns todo o estado e os modais
  modules/             # Módulos do dashboard
    DashboardModule.jsx
    TransacoesModule.jsx
    FixasModule.jsx
    DividasMetasModule.jsx
    PlanejamentoRelatoriosModule.jsx
    CategoriasConfigModule.jsx
  Modal.jsx            # Modal de lançamentos (renda, despesa, extra, meta, recorrente)
  CardsModal.jsx       # Modal de seleção de cartões
  IncomeHistoryModal.jsx
  AuthGuard.jsx        # Proteção de rotas autenticadas
  BankLogo.jsx         # Logo de banco/cartão por id
  CreditCardArt.jsx    # Arte realista do cartão
  CategoryIcon.jsx     # Ícone por categoria
  DonutChart.jsx       # Donut de gastos por categoria
  AreaChart.jsx        # Gráfico de área
  BarChart.jsx         # Gráfico de barras
  ProgressRing.jsx     # Anel de progresso de metas
  KpiCard.jsx          # Card de indicador
  CountUp.jsx          # Animação de contagem de valores
  EmptyState.jsx       # Estado vazio
  DashboardSkeleton.jsx# Skeleton de carregamento
  Toast.jsx            # Mensagens transitórias
  ConfirmDialog.jsx    # Confirmação baseada em promise
lib/
  supabase.js          # Cliente Supabase (browser + server-side)
  db.js                # Funções de acesso ao banco
  helpers.js           # Funções puras de cálculo financeiro
  constants.js         # Categorias, cartões, emojis e chaves de configuração
```

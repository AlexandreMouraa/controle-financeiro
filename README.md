# Controle Financeiro

Aplicação web de controle financeiro pessoal com autenticação e persistência em nuvem via Supabase.

## Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** com suporte a dark mode
- **Supabase** — autenticação e banco de dados
- **Lucide React** — ícones

## Funcionalidades

- Cadastro e login de usuários
- Despesas fixas (recorrentes) e variáveis (extras)
- Histórico de renda por período
- Metas de economia por mês
- Seleção de cartões de crédito
- Dashboard mensal com resumo financeiro
- Dark mode

## Configuração

### 1. Clone e instale as dependências

```bash
git clone https://github.com/Ighorpb/controle-financeiro.git
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
  page.jsx             # Dashboard principal
components/
  FinanceTracker.jsx   # Componente principal com todo o estado
  Modal.jsx            # Modal de lançamentos (receita, despesa, meta, etc.)
  AuthGuard.jsx        # Proteção de rotas autenticadas
  CardsModal.jsx       # Modal de seleção de cartões
  IncomeHistoryModal.jsx
lib/
  supabase.js          # Cliente Supabase
  db.js                # Funções de acesso ao banco
  helpers.js           # Funções puras de cálculo financeiro
  constants.js         # Categorias, cartões e chaves de configuração
```

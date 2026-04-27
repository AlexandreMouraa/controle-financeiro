# Controle Financeiro

App pessoal de controle financeiro mensal — entradas, despesas fixas e variáveis, metas, cartões, histórico de renda, gráfico por categoria e backup/restore em JSON.

Migração do HTML único anterior (~1.4k linhas com React via Babel standalone) para um projeto Vite + React idiomático, separado em módulos, pronto para deploy no Vercel.

## Stack

- **Vite 5** — build/dev server
- **React 18** — UI
- **Tailwind CSS 3** — estilização (dark mode por classe)
- **Geist + Geist Mono** — tipografia (sans pra UI, mono com tabular nums pros valores)
- **lucide-react** — ícones
- **localStorage** — persistência (chave `controle-financeiro-v3`)

## Rodar localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173` por padrão.

Build de produção:

```bash
npm run build
npm run preview   # serve o /dist localmente
```

## Estrutura

```
src/
├── App.jsx                  # componente raiz (FinanceTracker)
├── main.jsx                 # entry point
├── index.css                # Tailwind + estilos globais
├── constants.js             # categorias, cartões padrão, storage keys
├── helpers.js               # formatação, datas, migração de dados, parcelas
└── components/
    ├── BankLogo.jsx         # SVGs dos bancos
    ├── Modal.jsx            # modal genérico (renda, extra, despesa, meta, fixa)
    ├── CardsModal.jsx       # seletor de cartões ativos
    └── IncomeHistoryModal.jsx
```

## Persistência atual e roadmap

Hoje os dados ficam só em `localStorage` — por navegador, por dispositivo. Cada pessoa que abrir o link tem dados separados, e os seus dados não sincronizam entre PC e celular. Para feedback de UX/funcionalidade isso é suficiente; para uso real multi-dispositivo, a próxima etapa é o backend.

**Próximas etapas previstas:**

1. Login (Google/email)
2. Persistir o JSON em backend leve (Supabase, Firebase ou PostgreSQL próprio com RLS por usuário)
3. Backup/restore continua funcionando como exportação manual além do sync automático

A função `migrateData` em `helpers.js` já lida com versões anteriores do schema, então quando o backend entrar é só ler o JSON do banco e passar pela mesma função.

## Notas de migração

- Os ícones inline foram trocados por `lucide-react` — visual idêntico, código mais limpo, tree-shaking
- `Copy` icon, `copied` state, `exportCSV` e `exportMarkdown` do original não foram migrados porque estavam definidos mas nunca chamados na UI; se quiser surfaçar depois é trivial reativar
- Tailwind agora é build-time (não mais CDN), o que reduz o bundle e habilita purge em produção
- Schema do `localStorage` mantido idêntico (`controle-financeiro-v3`) — quem já usa o HTML antigo vai ver os dados aparecerem no React sem importar nada

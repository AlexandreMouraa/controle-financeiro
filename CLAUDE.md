# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint via Next.js
```

No test suite configured.

## Stack

- **Next.js 14** (App Router) with `.jsx` files throughout (no TypeScript)
- **Tailwind CSS** with `darkMode: 'class'` — dark mode toggled via `document.documentElement.classList`
- **Supabase** (`@supabase/supabase-js`) for auth — client initialized in `lib/supabase.js`
- **Lucide React** for icons
- Path alias `@/` maps to the project root

## Architecture

### Auth flow
- `app/login/page.jsx` and `app/signup/page.jsx` are public pages
- Login/signup call internal Next.js API routes (`app/api/auth/login/route.js`, `app/api/auth/signup/route.js`) which call Supabase server-side to avoid browser CORS issues. Both routes use `createServerSupabase()` from `lib/supabase.js` (a non-session-persisting client); the browser uses the `supabase` singleton from the same file. `lib/supabase.js` throws at import if the env vars are missing.
- API routes return `access_token` + `refresh_token`; client calls `supabase.auth.setSession()` to persist session in localStorage
- `components/AuthGuard.jsx` wraps protected pages — checks session on mount and listens to `onAuthStateChange`; redirects to `/login` if unauthenticated
- `app/page.jsx` (dashboard) is wrapped in `<AuthGuard>`

### Data layer
All financial data is persisted in **Supabase Postgres**, scoped per user via a `user_id` column on every table. `lib/db.js` is the single data-access module — `FinanceTracker` imports it as `import * as db from '@/lib/db'`. Tables: `income_history`, `expenses`, `extras`, `recurring`, `disabled_recurring`, `goals`, `user_cards`.

- `db.loadAllData(userId)` runs all reads in parallel and rebuilds the in-memory client shape (below). On mount `FinanceTracker` calls `supabase.auth.getUser()` then `db.loadAllData(user.id)`; `userIdRef` holds the id for subsequent writes.
- Mutations are **per-operation** writes (`insertExpense`, `deleteRecurring`, `upsertGoal`, etc.) — local React state is updated alongside the DB call, not derived from a refetch.
- DB rows are `snake_case`; `lib/db.js` has `rowToExpense`/`rowToExtra`/`rowToRecurring` mappers that convert to the `camelCase` client shape and omit null/false optional fields.
- `db.replaceAllData(userId, data)` backs the JSON import/restore feature: it wipes the user's rows (deleting `disabled_recurring` and `recurring` first due to the FK) and re-inserts everything, regenerating `recurring` UUIDs and remapping `disabledRecurring` references via `idMap`.

The in-memory client shape (what `loadAllData` returns and `FinanceTracker` holds in `data`):

```js
{
  monthlyData: { 'YYYY-MM': { expenses: [], extras: [] } },
  recurring: [],        // fixed monthly expenses
  goals: {},            // savings goals by month key
  disabledRecurring: {}, // recurring items skipped per month
  cards: [],            // selected card IDs from DEFAULT_CARDS
  incomeHistory: [],    // [{ startMonth, amount }] sorted ascending
}
```

`lib/helpers.js` contains pure functions over this shape (`getApplicableIncome`, `getInstallmentInfo`, formatting). `migrateData` + `STORAGE_KEY` (`controle-financeiro-v3`) survive only to parse **legacy localStorage exports** during import (incl. the old `mainIncome` → `incomeHistory` migration) — localStorage is no longer a live data store. `lib/constants.js` holds `CATEGORIES`, `DEFAULT_CARDS`, `CUSTOM_EMOJIS`, and the storage/theme keys.

### Main component
`components/FinanceTracker.jsx` is a single large client component that owns all state and renders the entire dashboard. All modals are rendered from there — `Modal.jsx` handles income, expense, extra, goal, and recurring entry forms via a `type` prop. `CardsModal.jsx` and `IncomeHistoryModal.jsx` are standalone modal components. `BankLogo.jsx` renders a card/bank logo by `id` and is reused across `FinanceTracker`, `Modal`, and `CardsModal`.

User feedback uses in-app components instead of native `alert`/`confirm`: `Toast.jsx` (transient messages — `addToast(message, type)` where `type` is `'error'` default or `'success'`) and `ConfirmDialog.jsx` (promise-based — `askConfirm(message, label)` returns a `Promise<boolean>`, resolved via `resolveConfirm`). `ProgressRing.jsx` (savings-goal ring) and `DonutChart.jsx` (spend-by-category donut) are presentational SVG components driven by `FinanceTracker` state.

### Theme
Theme state lives in `FinanceTracker` and each auth page independently. It reads/writes `localStorage` under `THEME_KEY` and toggles the `dark` class on `<html>`. The layout (`app/layout.jsx`) injects an inline script to apply the saved theme before first paint to avoid flash.

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

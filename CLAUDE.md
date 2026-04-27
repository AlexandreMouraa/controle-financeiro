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
- Login/signup call internal Next.js API routes (`app/api/auth/login/route.js`, `app/api/auth/signup/route.js`) which call Supabase server-side to avoid browser CORS issues
- API routes return `access_token` + `refresh_token`; client calls `supabase.auth.setSession()` to persist session in localStorage
- `components/AuthGuard.jsx` wraps protected pages — checks session on mount and listens to `onAuthStateChange`; redirects to `/login` if unauthenticated
- `app/page.jsx` (dashboard) is wrapped in `<AuthGuard>`

### Data layer
All financial data is stored in **localStorage** under the key `controle-financeiro-v3` (no database persistence yet). The data shape is:

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

`lib/helpers.js` contains all pure functions that operate on this shape. `lib/constants.js` holds `CATEGORIES`, `DEFAULT_CARDS`, `CUSTOM_EMOJIS`, and the storage/theme keys.

### Main component
`components/FinanceTracker.jsx` is a single large client component that owns all state and renders the entire dashboard. All modals are rendered from there — `Modal.jsx` handles income, expense, extra, goal, and recurring entry forms via a `type` prop. `CardsModal.jsx` and `IncomeHistoryModal.jsx` are standalone modal components.

### Theme
Theme state lives in `FinanceTracker` and each auth page independently. It reads/writes `localStorage` under `THEME_KEY` and toggles the `dark` class on `<html>`. The layout (`app/layout.jsx`) injects an inline script to apply the saved theme before first paint to avoid flash.

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

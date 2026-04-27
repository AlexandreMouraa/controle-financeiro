# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install              # Install dependencies
npm run dev              # Start dev server (default: http://localhost:5173)
npm run build            # Build for production (/dist)
npm run preview          # Preview production build locally
```

## Architecture Overview

**Controle Financeiro** is a personal monthly financial tracker built with Vite + React. It's a single-page application with client-side state management (localStorage) and no backend dependency currently.

### Data Model

All application state lives in a single data object (in App.jsx), persisted to localStorage under the key `controle-financeiro-v3`:

```javascript
{
  monthlyData: {
    'YYYY-MM': {
      extras: [{ id, description, amount, date, category, cardId }],      // income entries
      expenses: [{ id, description, amount, date, category, cardId }],     // variable expenses
    }
  },
  recurring: [{ id, description, amount, category, cardId, installments, startMonth }],  // fixed expenses (monthly)
  disabledRecurring: { 'YYYY-MM': [id1, id2] },                             // recurring entries disabled for specific months
  goals: { 'YYYY-MM': 5000 },                                               // savings targets per month
  cards: ['nubank', 'santander'],                                           // active card IDs (for filtering)
  incomeHistory: [{ startMonth: 'YYYY-MM', amount: 5000 }],                 // main income entries (one per month)
}
```

**Installment handling:** Recurring items can have `installments` (e.g., 12x payment); logic in `helpers.js::getInstallmentInfo()` calculates how many payments remain in the current month.

**Dark mode:** Toggled via class on `<html>` element; saved to localStorage under `controle-financeiro-theme`.

### Component Structure

- **App.jsx** — Monolithic root component. Owns all data mutations, month navigation, modal state, and rendering. 900 lines; contains ~10 logical sections (header, income, balance, summary, goals, cards, recurring, transactions, chart, backup).
- **Modal.jsx** — Generic form modal for income, extra, expense, goal, recurring entries. Handles both create and edit modes; validates inputs.
- **CardsModal.jsx** — Checkbox list to enable/disable card filters.
- **IncomeHistoryModal.jsx** — View and edit historical income entries (one per month).
- **BankLogo.jsx** — SVG logos for Nubank, Santander, C6, Inter, Bradesco, Itaú, etc. Used as visual identifiers.

### Key Helpers (helpers.js)

- `formatBRL(amount)` — Formats numbers as BRL currency (e.g., `1234.56` → `R$ 1.234,56`).
- `monthKey(date)` — Returns `'YYYY-MM'` string for a given date.
- `monthLabel(monthKey)` — Returns human-readable month name (e.g., `'janeiro de 2026'`).
- `emptyMonth()` — Returns a fresh month object with empty arrays.
- `migrateData(raw)` — Handles backwards compatibility; upgrades old schema versions.
- `getApplicableIncome(incomeHistory, currentMonth)` — Finds the income entry for a given month.
- `getInstallmentInfo(recurring, currentMonth)` — Calculates remaining installments for a recurring item.
- `findCategory(id)` / `findCard(id)` — Lookups in CATEGORIES and CARDS arrays (constants.js).

### Constants (constants.js)

- `CATEGORIES` — Array of expense categories with emoji, label, color (for chart bars).
- `CARDS` — Predefined card list (Nubank, Santander, C6, etc.) with bank-specific colors.
- `STORAGE_KEY`, `THEME_KEY` — localStorage keys.

## Key Design Decisions

1. **Single data object in App.jsx:** All state mutations flow through `setData()` updaters. No context API or external state manager yet. Works well for this scope; refactoring to Context/Zustand is planned when backend is added.

2. **localStorage as source of truth:** Data persists per browser/device. No sync between devices. Backup/restore is manual JSON export/import. When backend launches, this stays as the in-memory cache.

3. **Recurring entries are global, not monthly:** They live in `data.recurring` and recur automatically each month. Disabling per-month is tracked separately in `disabledRecurring` (opt-out pattern).

4. **Monthly keying with 'YYYY-MM':** Allows year-spanning navigation and easy grouping.

5. **Custom category support:** When category is `'outros'` (other), users can provide a custom emoji (`customCategoryEmoji`).

6. **Installment tracking:** For recurring items, `installments` and `startMonth` allow tracking multi-month payments (e.g., annual insurance broken into 12 monthly chunks).

## Roadmap / Future Phases

1. **Phase 2 (Backend + Auth):** Add login (Google/email). Persist to Supabase/Firebase/custom PostgreSQL. Sync across devices.
2. **Phase 3:** Mobile app (React Native/Expo sharing core logic).
3. The `migrateData()` function in helpers.js is designed to handle schema upgrades; reuse it when the backend is added.

## Notes for Editing

- **App.jsx is large:** Before adding features, consider whether it should live in a child component or a helper. Modals are already extracted; if state becomes complex, extract more.
- **Modal.jsx is a catch-all:** It handles 5 different form types (income, extra, expense, goal, recurring) via a `type` prop. If form logic diverges significantly, split into separate components.
- **No tests yet:** This is a solo project in early stages. If adding tests, co-locate with component files (e.g., `Modal.test.jsx`).
- **Dark mode uses Tailwind classes:** `dark:` prefixes. No external theme provider.
- **Dates are ISO strings (YYYY-MM-DD):** Always parse with `new Date()` or `new Date(dateString)`.
- **BRL formatting is non-negotiable:** Use `formatBRL()` for all monetary displays; never hardcode `.toLocaleString()` directly.

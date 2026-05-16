-- Schema do Controle Financeiro (inferido de lib/db.js).
-- Todas as tabelas são escopadas por usuário via user_id (auth.users.id)
-- e protegidas por RLS: cada usuário só enxerga/edita as próprias linhas.

-- ── income_history ────────────────────────────────────────────────
create table if not exists public.income_history (
  user_id     uuid    not null references auth.users (id) on delete cascade,
  start_month text    not null,                 -- 'YYYY-MM'
  amount      numeric not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, start_month)            -- upsert onConflict: user_id,start_month
);

-- ── expenses ──────────────────────────────────────────────────────
create table if not exists public.expenses (
  id                    uuid not null primary key,  -- UUID gerado no cliente
  user_id               uuid not null references auth.users (id) on delete cascade,
  month                 text not null,              -- 'YYYY-MM'
  description           text not null,
  amount                numeric not null,
  category              text not null,
  date                  date not null,
  card_id               text,
  custom_category_emoji text,
  created_at            timestamptz not null default now()
);
create index if not exists expenses_user_month_idx on public.expenses (user_id, month);

-- ── extras ────────────────────────────────────────────────────────
create table if not exists public.extras (
  id                    uuid not null primary key,
  user_id               uuid not null references auth.users (id) on delete cascade,
  month                 text not null,
  description           text not null,
  amount                numeric not null,
  date                  date not null,
  custom_category_emoji text,
  created_at            timestamptz not null default now()
);
create index if not exists extras_user_month_idx on public.extras (user_id, month);

-- ── recurring ─────────────────────────────────────────────────────
create table if not exists public.recurring (
  id                    uuid not null primary key,
  user_id               uuid not null references auth.users (id) on delete cascade,
  description           text not null,
  amount                numeric not null,
  category              text not null,
  card_id               text,
  custom_category_emoji text,
  parcelado             boolean not null default false,
  num_parcelas          integer,
  start_month           text,
  created_at            timestamptz not null default now()  -- usado em order('created_at')
);
create index if not exists recurring_user_idx on public.recurring (user_id);

-- ── disabled_recurring ────────────────────────────────────────────
-- FK para recurring com ON DELETE CASCADE: remover uma recorrente
-- limpa automaticamente os meses em que ela estava desativada.
create table if not exists public.disabled_recurring (
  user_id      uuid not null references auth.users (id) on delete cascade,
  month        text not null,
  recurring_id uuid not null references public.recurring (id) on delete cascade,
  primary key (user_id, month, recurring_id)
);

-- ── goals ─────────────────────────────────────────────────────────
create table if not exists public.goals (
  user_id uuid    not null references auth.users (id) on delete cascade,
  month   text    not null,
  amount  numeric not null,
  primary key (user_id, month)                  -- upsert onConflict: user_id,month
);

-- ── user_cards ────────────────────────────────────────────────────
create table if not exists public.user_cards (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id text not null,
  primary key (user_id, card_id)
);

-- ── Row Level Security ────────────────────────────────────────────
-- O app acessa o banco do navegador com a anon key, então RLS é
-- obrigatório para impedir leitura/escrita de dados de outros usuários.
do $$
declare t text;
begin
  foreach t in array array[
    'income_history','expenses','extras','recurring',
    'disabled_recurring','goals','user_cards'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %1$s_owner on public.%1$I;', t);
    execute format($f$
      create policy %1$s_owner on public.%1$I
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
    $f$, t);
  end loop;
end $$;

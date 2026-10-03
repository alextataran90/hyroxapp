-- ============================================================
-- Hyrox Trainer — Supabase schema
-- Run this ONCE in your Supabase project:
--   Dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- One row per (user, storage key). The app keeps ~15 JSON documents
-- per user (settings, progress, nutrition, fitness, …), so this is a
-- simple key/value document store scoped to the signed-in user.
create table if not exists public.user_data (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  key        text        not null,
  value      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- ------------------------------------------------------------
-- Row Level Security — THIS IS THE IMPORTANT PART.
-- The app ships with a public "anon" key (that's by design and safe),
-- so these policies are what actually stop one user reading another's
-- data. Without RLS enabled, all data would be world-readable.
-- ------------------------------------------------------------
alter table public.user_data enable row level security;

drop policy if exists "user_data_select_own" on public.user_data;
create policy "user_data_select_own"
  on public.user_data for select
  using (auth.uid() = user_id);

drop policy if exists "user_data_insert_own" on public.user_data;
create policy "user_data_insert_own"
  on public.user_data for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_data_update_own" on public.user_data;
create policy "user_data_update_own"
  on public.user_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_data_delete_own" on public.user_data;
create policy "user_data_delete_own"
  on public.user_data for delete
  using (auth.uid() = user_id);

-- Keep updated_at fresh on every write (used for last-write-wins sync).
create or replace function public.touch_user_data()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_data_touch on public.user_data;
create trigger user_data_touch
  before update on public.user_data
  for each row execute function public.touch_user_data();

-- Quick sanity check — should return 't' for rowsecurity.
-- select relname, relrowsecurity from pg_class where relname = 'user_data';

-- Harbor Intake demo table (Supabase free tier)
-- Run in SQL Editor on a new project, then set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY

create table if not exists public.intakes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  owner text,
  priority text,
  due_date text,
  notes text,
  raw_text text,
  created_at timestamptz not null default now()
);

alter table public.intakes enable row level security;

-- Demo-only: open read/write. Lock down before any real data.
drop policy if exists "harbor_demo_all" on public.intakes;
create policy "harbor_demo_all" on public.intakes
  for all
  using (true)
  with check (true);

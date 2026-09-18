-- Tekrar Defteri şeması (Neon Postgres). Kullanıcılar neon_auth."user" tablosunda tutulur.
-- Satır sahipliği artık RLS ile değil, api/index.ts içinde user_id filtresiyle sağlanır.

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  subject text not null,
  topic text not null,
  reason text not null check (reason in ('Bilmiyordum', 'Dikkatsizlik', 'Süre yetmedi')),
  question text not null default '',
  answer text not null default '',
  photo_path text,
  box smallint not null default 0 check (box between 0 and 3),
  due_date date not null default (current_date + 1),
  created_at timestamptz not null default now()
);
create index if not exists cards_user_due_idx on public.cards (user_id, due_date);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references neon_auth."user"(id) on delete cascade,
  name text not null,
  taken_on date not null default current_date,
  sections jsonb not null default '[]'::jsonb,
  time_blank integer check (time_blank is null or time_blank >= 0),
  created_at timestamptz not null default now()
);
create index if not exists exams_user_taken_idx on public.exams (user_id, taken_on);

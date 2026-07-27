-- VaultIQ: full data-layer migration off Firestore onto Supabase Postgres.
-- Run this in the Supabase SQL Editor (in addition to supabase_profiles_migration.sql).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- modules
-- ---------------------------------------------------------------------------
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  department_id text,
  lecturer_uids text[] default '{}',
  compliance_status text not null default 'PENDING',
  last_audit_at timestamptz,
  assessment_mode text,
  is_exit_level boolean default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- evidence (formerly modules/{id}/evidence subcollection)
-- ---------------------------------------------------------------------------
create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  type text,
  storage_path text,
  uploaded_by text,
  uploaded_at timestamptz,
  ai_validation_status text default 'PENDING',
  ai_feedback text,
  name text,
  category text,
  sub_category text,
  is_exam_related boolean default false,
  size text,
  version integer,
  questionnaire jsonb,
  front_page_generated boolean default false,
  front_page_data jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- staff (formerly the `users` Firestore collection — staff directory,
-- distinct from `profiles`, which is the auth-linked signup identity)
-- ---------------------------------------------------------------------------
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  email text,
  display_name text,
  role text,
  department_id text,
  faculty_id text,
  assigned_modules text[] default '{}',
  status text default 'ACTIVE',
  last_active timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- questionnaires
-- ---------------------------------------------------------------------------
create table if not exists public.questionnaires (
  id uuid primary key default gen_random_uuid(),
  title text,
  type text,
  questions jsonb,
  created_by text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- student_evaluations
-- ---------------------------------------------------------------------------
create table if not exists public.student_evaluations (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid references public.questionnaires (id) on delete set null,
  module_code text,
  lecturer_uid text,
  lecturer_name text,
  evaluator_type text,
  ratings jsonb,
  comments text,
  submitted_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- development_plans
-- ---------------------------------------------------------------------------
create table if not exists public.development_plans (
  id uuid primary key default gen_random_uuid(),
  lecturer_uid text,
  lecturer_name text,
  module_code text,
  area_of_improvement text,
  suggested_action text,
  commitment_date text,
  status text,
  update_statement text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  title text,
  message text,
  type text,
  status text default 'UNREAD',
  module_code text,
  escalation_tier integer,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS: simplified to "any authenticated user" (mirrors the old Firestore
-- rules' isSignedIn() baseline). Fine-grained per-role write checks that
-- existed in firestore.rules are NOT reproduced here — the app already
-- gates those actions client-side via permissions.config.ts.
-- ---------------------------------------------------------------------------
alter table public.modules enable row level security;
alter table public.evidence enable row level security;
alter table public.staff enable row level security;
alter table public.questionnaires enable row level security;
alter table public.student_evaluations enable row level security;
alter table public.development_plans enable row level security;
alter table public.notifications enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['modules','evidence','staff','questionnaires','student_evaluations','development_plans','notifications']
  loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'authenticated read ' || t) then
      execute format('create policy "authenticated read %1$s" on public.%1$I for select using (auth.role() = ''authenticated'')', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'authenticated write ' || t) then
      execute format('create policy "authenticated write %1$s" on public.%1$I for insert with check (auth.role() = ''authenticated'')', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'authenticated update ' || t) then
      execute format('create policy "authenticated update %1$s" on public.%1$I for update using (auth.role() = ''authenticated'')', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'authenticated delete ' || t) then
      execute format('create policy "authenticated delete %1$s" on public.%1$I for delete using (auth.role() = ''authenticated'')', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Realtime: enable change broadcasts so subscribeToX() live-updates work.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['modules','evidence','staff','questionnaires','student_evaluations','development_plans','notifications']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

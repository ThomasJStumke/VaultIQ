-- VaultIQ: DB-driven RBAC. Run after supabase_profiles_migration.sql and
-- supabase_data_migration.sql. Safe to re-run (idempotent).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- roles — canonical role catalogue (replaces the free-text profiles.role)
-- ---------------------------------------------------------------------------
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  label text not null,
  is_system boolean not null default false, -- SUPER_ADMIN: cannot be deleted
  created_at timestamptz not null default now()
);

insert into public.roles (name, label, is_system) values
  ('SUPER_ADMIN', 'Super Admin', true),
  ('LECTURER', 'Lecturer', false),
  ('HOD', 'HOD', false),
  ('PROGRAMME_COORDINATOR', 'Programme Coordinator', false),
  ('FACULTY_ADMIN', 'Faculty Admin', false),
  ('DEPUTY_DEAN', 'Deputy Dean', false),
  ('EXECUTIVE_DEAN', 'Executive Dean', false),
  ('DVC_TL', 'DVC: T&L', false),
  ('CQPA', 'CQPA', false),
  ('QPO', 'QPO', false),
  ('INTERNAL_MODERATOR', 'Internal Moderator', false),
  ('EXTERNAL_MODERATOR', 'External Moderator', false),
  ('AUDITOR', 'Auditor', false),
  ('EXAMS', 'Exams', false)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- pages — the app's navigable screens
-- ---------------------------------------------------------------------------
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  sort_order integer not null default 0,
  is_system boolean not null default false, -- Platform Setup: always super-admin-only
  created_at timestamptz not null default now()
);

insert into public.pages (key, label, sort_order, is_system) values
  ('dashboard', 'Dashboard', 1, false),
  ('modules', 'My Modules', 2, false),
  ('vault', 'File Vault', 3, false),
  ('exams', 'Exam Vault', 4, false),
  ('notifications', 'Alerts', 5, false),
  ('compliance', 'Compliance Engine', 6, false),
  ('mapping', 'Module Mapping', 7, false),
  ('staff', 'Staff & Roles', 8, false),
  ('evaluations', 'Student Evaluations', 9, false),
  ('stats', 'Architecture & Stats', 10, false),
  ('platform_setup', 'Platform Setup', 99, true)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- page_actions — the set of fine-grained actions/buttons available per page
-- (seeded with a generic set; expand per-page via the Action Setup screen)
-- ---------------------------------------------------------------------------
create table if not exists public.page_actions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  key text not null,
  label text not null,
  created_at timestamptz not null default now(),
  unique (page_id, key)
);

insert into public.page_actions (page_id, key, label)
select p.id, a.key, a.label
from public.pages p
cross join (values
  ('view', 'View'),
  ('upload', 'Upload'),
  ('assign', 'Assign'),
  ('approve', 'Approve / Sign-off'),
  ('export', 'Export / Print')
) as a(key, label)
where p.key <> 'platform_setup'
on conflict (page_id, key) do nothing;

-- ---------------------------------------------------------------------------
-- role_pages — which roles can see which pages (many-to-many)
-- ---------------------------------------------------------------------------
create table if not exists public.role_pages (
  role_id uuid not null references public.roles (id) on delete cascade,
  page_id uuid not null references public.pages (id) on delete cascade,
  primary key (role_id, page_id)
);

-- Seed: give every non-system role "view" of the core pages by default so
-- the app isn't blank after this migration. Super admin is handled in code
-- (always sees everything) rather than by seeding every row here.
insert into public.role_pages (role_id, page_id)
select r.id, p.id
from public.roles r
cross join public.pages p
where r.name <> 'SUPER_ADMIN' and p.key <> 'platform_setup'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- role_page_actions — which roles can perform which action on which page
-- ---------------------------------------------------------------------------
create table if not exists public.role_page_actions (
  role_id uuid not null references public.roles (id) on delete cascade,
  page_action_id uuid not null references public.page_actions (id) on delete cascade,
  primary key (role_id, page_action_id)
);

-- Seed: give every non-system role "view" on every page by default.
insert into public.role_page_actions (role_id, page_action_id)
select r.id, pa.id
from public.roles r
cross join public.page_actions pa
where r.name <> 'SUPER_ADMIN' and pa.key = 'view'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- user_type — user <-> role assignment. One user can have many rows here
-- (many roles); this replaces profiles.role entirely.
-- ---------------------------------------------------------------------------
create table if not exists public.user_type (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, role_id)
);

-- ---------------------------------------------------------------------------
-- profiles: drop columns now redundant with auth.users / user_type
-- ---------------------------------------------------------------------------
alter table public.profiles drop column if exists email;
alter table public.profiles drop column if exists role;

-- ---------------------------------------------------------------------------
-- First-user-is-super-admin + signup role assignment.
-- Runs server-side so the "who signed up first" check can't race.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_vaultiq_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
  chosen_role text;
  target_role_id uuid;
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;

  select (count(*) = 1) into is_first from auth.users;

  if is_first then
    select id into target_role_id from public.roles where name = 'SUPER_ADMIN';
  else
    chosen_role := new.raw_user_meta_data ->> 'role';
    select id into target_role_id from public.roles where name = chosen_role;
    if target_role_id is null then
      select id into target_role_id from public.roles where name = 'LECTURER';
    end if;
  end if;

  insert into public.user_type (user_id, role_id)
  values (new.id, target_role_id)
  on conflict (user_id, role_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_vaultiq on auth.users;
create trigger on_auth_user_created_vaultiq
  after insert on auth.users
  for each row execute function public.handle_new_vaultiq_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.roles enable row level security;
alter table public.pages enable row level security;
alter table public.page_actions enable row level security;
alter table public.role_pages enable row level security;
alter table public.role_page_actions enable row level security;
alter table public.user_type enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['roles','pages','page_actions','role_pages','role_page_actions']
  loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='authenticated read '||t) then
      execute format('create policy "authenticated read %1$s" on public.%1$I for select using (auth.role() = ''authenticated'')', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='authenticated write '||t) then
      execute format('create policy "authenticated write %1$s" on public.%1$I for insert with check (auth.role() = ''authenticated'')', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='authenticated update '||t) then
      execute format('create policy "authenticated update %1$s" on public.%1$I for update using (auth.role() = ''authenticated'')', t);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname='authenticated delete '||t) then
      execute format('create policy "authenticated delete %1$s" on public.%1$I for delete using (auth.role() = ''authenticated'')', t);
    end if;
  end loop;
end $$;

-- user_type: everyone can read all rows (needed to know who has which role
-- for staff directory / admin screens), but only modify their own... except
-- Platform Setup needs to assign roles to OTHER users too. Since fine-grained
-- role-based write restriction isn't modeled in SQL yet (that's what the new
-- Action Setup screen is for going forward), keep this permissive for any
-- authenticated user, matching the same baseline as the other tables.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_type' and policyname='authenticated read user_type') then
    create policy "authenticated read user_type" on public.user_type for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_type' and policyname='authenticated write user_type') then
    create policy "authenticated write user_type" on public.user_type for insert with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_type' and policyname='authenticated update user_type') then
    create policy "authenticated update user_type" on public.user_type for update using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_type' and policyname='authenticated delete user_type') then
    create policy "authenticated delete user_type" on public.user_type for delete using (auth.role() = 'authenticated');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['roles','pages','page_actions','role_pages','role_page_actions','user_type']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

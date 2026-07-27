-- VaultIQ: multi-role RBAC layered on top of 0001-0006.
-- Adds the `user_type` table (a user can hold many roles) plus a DB-driven
-- Page Setup / Action Setup model (roles/pages/page_actions/role_pages/
-- role_page_actions) surfaced through the Platform Setup screen.
--
-- `profiles.role` is KEPT (not dropped) as a denormalized "primary role"
-- column -- the many existing reads/writes across StaffManagement,
-- DashboardOverview, ModuleMapping, etc. still use it directly. `user_type`
-- is the actual multi-role source of truth and what RLS (has_role()) checks
-- from here on; profiles.role is synced to the user's first/primary role by
-- bootstrap_profile() and addStaffMember so both stay consistent.
--
-- Platform Setup's Page Setup screen edits role_pages/role_page_actions, and
-- MainApp.tsx's sidebar (see ITEM_ID_TO_PAGE_KEY there) filters its per-role
-- ROLE_NAV_ITEMS candidate list through role_pages -- unchecking a page for a
-- role there actually hides it from the sidebar. RLS (has_role(), below)
-- checks these same tables.
--
-- Action Setup (role_page_actions) is populated and editable, but nothing in
-- the app yet gates a specific button/action through it -- that per-action
-- wiring (e.g. "can this role see the Upload button on this page") is still
-- a follow-up.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- roles
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
-- pages (mirrors permissions.config.ts's Screen list, for Page Setup)
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
  ('vault_explorer', 'File Vault', 3, false),
  ('exams', 'Exam Vault', 4, false),
  ('exams_control', 'Exam Vault Control', 5, false),
  ('status_management', 'Status Management', 6, false),
  ('location_association', 'Location Association', 7, false),
  ('notifications', 'System Alerts', 8, false),
  ('compliance', 'Compliance Engine', 9, false),
  ('compliance_portfolios', 'Compliance Portfolios', 10, false),
  ('mapping', 'Module Mapping', 11, false),
  ('staff', 'Staff & Roles Management', 12, false),
  ('evaluations', 'Student Evaluations', 13, false),
  ('evaluations_aggregate', 'Student Evaluations (Aggregate)', 14, false),
  ('survey_reviews', 'Student Survey Reviews', 15, false),
  ('surveys', 'Survey Management', 16, false),
  ('stats', 'Executive Analytics', 17, false),
  ('strategic_dashboard', 'Strategic Dashboard', 18, false),
  ('reporting_engine', 'Automated Reporting Engine', 19, false),
  ('platform_setup', 'Platform Setup', 99, true)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- page_actions
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
-- role_pages / role_page_actions
-- ---------------------------------------------------------------------------
create table if not exists public.role_pages (
  role_id uuid not null references public.roles (id) on delete cascade,
  page_id uuid not null references public.pages (id) on delete cascade,
  primary key (role_id, page_id)
);

insert into public.role_pages (role_id, page_id)
select r.id, p.id
from public.roles r
cross join public.pages p
where r.name <> 'SUPER_ADMIN' and p.key <> 'platform_setup'
on conflict do nothing;

create table if not exists public.role_page_actions (
  role_id uuid not null references public.roles (id) on delete cascade,
  page_action_id uuid not null references public.page_actions (id) on delete cascade,
  primary key (role_id, page_action_id)
);

insert into public.role_page_actions (role_id, page_action_id)
select r.id, pa.id
from public.roles r
cross join public.page_actions pa
where r.name <> 'SUPER_ADMIN' and pa.key = 'view'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- user_type — a user can hold many roles (one row per user+role).
-- user_id references profiles(id), matching every other FK in this schema
-- (evidence.uploaded_by, faculties.dean_uid, ...), not auth.users(id)
-- directly -- this way placeholder (not-yet-claimed) profiles can also carry
-- role assignments before the person ever logs in.
-- ---------------------------------------------------------------------------
create table if not exists public.user_type (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, role_id)
);

-- Backfill: give every existing profile a user_type row matching their
-- current profiles.role, so RLS (which now reads user_type) doesn't lock
-- out anyone who signed up before this migration ran.
insert into public.user_type (user_id, role_id)
select p.id, r.id
from public.profiles p
join public.roles r on r.name = p.role
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- has_role() / current_profile_role(): redefine to check user_type (multi-
-- role, ANY match) instead of the single profiles.role column, with a
-- SUPER_ADMIN bypass. Every existing RLS policy in 0002/0003 calls
-- has_role(...) or current_profile_role() -- redefining these two functions
-- is enough to make the whole RLS layer multi-role-and-super-admin-aware
-- without touching a single policy.
-- ---------------------------------------------------------------------------
create or replace function public.current_profile_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.profiles where auth_user_id = auth.uid();
$$;

create or replace function public.current_profile_role()
returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where auth_user_id = auth.uid();
$$;

create or replace function public.has_role(variadic roles text[])
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.user_type ut
    join public.roles r on r.id = ut.role_id
    where ut.user_id = public.current_profile_id()
      and (r.name = any(roles) or r.name = 'SUPER_ADMIN')
  );
$$;

-- ---------------------------------------------------------------------------
-- bootstrap_profile(): self-service replacement for the OAuth-only version
-- in 0003_storage.sql. Behavior:
--   1. Existing claimed profile (auth_user_id = auth.uid())      -> return it.
--   2. Unclaimed placeholder matching the signed-in email        -> claim it
--      (keeps its pre-set role/department from Staff Management).
--   3. Neither exists                                            -> create a
--      fresh profile. The very first profile row ever created on
--      this database becomes SUPER_ADMIN; everyone else gets
--      p_role (the role chosen at signup) or LECTURER.
-- In all three cases, profiles.role and a matching user_type row are kept
-- in sync.
-- ---------------------------------------------------------------------------
create or replace function public.bootstrap_profile(p_role text default null)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_row public.profiles;
  v_is_first boolean;
  v_role_name text;
  v_role_id uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_row from public.profiles where auth_user_id = v_uid;
  if found then
    return v_row;
  end if;

  select * into v_row from public.profiles
    where is_placeholder = true and auth_user_id is null and lower(email) = lower(coalesce(v_email, ''))
    limit 1;

  if found then
    update public.profiles
      set auth_user_id = v_uid, is_placeholder = false, email = coalesce(v_email, email)
      where id = v_row.id
      returning * into v_row;

    select id into v_role_id from public.roles where name = v_row.role;
    if v_role_id is not null then
      insert into public.user_type (user_id, role_id) values (v_row.id, v_role_id)
        on conflict do nothing;
    end if;
    return v_row;
  end if;

  select (count(*) = 0) into v_is_first from public.profiles;
  v_role_name := case when v_is_first then 'SUPER_ADMIN' else coalesce(p_role, 'LECTURER') end;

  insert into public.profiles (auth_user_id, email, display_name, role, is_placeholder)
  values (v_uid, coalesce(v_email, ''), coalesce(split_part(v_email, '@', 1), 'New User'), v_role_name, false)
  returning * into v_row;

  select id into v_role_id from public.roles where name = v_role_name;
  if v_role_id is not null then
    insert into public.user_type (user_id, role_id) values (v_row.id, v_role_id)
      on conflict do nothing;
  end if;

  return v_row;
end;
$$;

grant execute on function public.bootstrap_profile(text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS + realtime for the new tables
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
  foreach t in array array['roles','pages','page_actions','role_pages','role_page_actions','user_type']
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

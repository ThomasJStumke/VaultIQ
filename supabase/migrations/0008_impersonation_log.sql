-- VaultIQ: audit trail for "View as user" (real impersonation from Platform
-- Setup's Users tab). Every impersonation session is logged here by the
-- server-side /api/impersonate endpoint (which uses the service-role key --
-- inserts happen with an elevated client, not through user-facing RLS).
-- Read access is restricted to SUPER_ADMIN/AUDITOR so the trail itself can't
-- be inspected or tampered with by whoever was being impersonated.

create table if not exists public.impersonation_log (
  id uuid primary key default gen_random_uuid(),
  admin_profile_id uuid not null references public.profiles(id) on delete cascade,
  target_profile_id uuid not null references public.profiles(id) on delete cascade,
  target_email text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_impersonation_log_target on public.impersonation_log (target_profile_id);
create index if not exists idx_impersonation_log_created_at_desc on public.impersonation_log (created_at desc);

alter table public.impersonation_log enable row level security;

drop policy if exists impersonation_log_select on public.impersonation_log;
create policy impersonation_log_select on public.impersonation_log
  for select using (public.has_role('AUDITOR'));

-- No insert/update/delete policy: rows are only ever written by the
-- server-side service-role client in server.ts, which bypasses RLS entirely.

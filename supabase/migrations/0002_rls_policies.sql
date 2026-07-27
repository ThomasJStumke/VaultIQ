-- VaultIQ: RLS policies (replaces firestore.rules)
-- Two bugs in the original rules are fixed here, not reproduced:
--  1. evidence had no delete permission despite deleteEvidence existing in code
--  2. report_templates checked malformed role strings ('Executive Dean') instead
--     of the real UserRole enum values (EXECUTIVE_DEAN / DEPUTY_DEAN)

-- ---------------------------------------------------------------------------
-- role helper (replaces Firestore's hasRole())
-- SECURITY DEFINER avoids RLS recursion when one table's policy needs to read
-- the caller's own profile row.
-- ---------------------------------------------------------------------------

create or replace function public.current_profile_role()
returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where auth_user_id = auth.uid();
$$;

create or replace function public.has_role(variadic roles text[])
returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_profile_role() = any(roles);
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists profiles_select_signed_in on public.profiles;
create policy profiles_select_signed_in on public.profiles
  for select using (auth.uid() is not null);

drop policy if exists profiles_write_owner on public.profiles;
create policy profiles_write_owner on public.profiles
  for all using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

-- admin pre-provisioning a placeholder row (auth_user_id is null, not yet claimed)
drop policy if exists profiles_write_admin_provision on public.profiles;
create policy profiles_write_admin_provision on public.profiles
  for insert with check (
    auth_user_id is null and is_placeholder = true
    and public.has_role('FACULTY_ADMIN','HOD','DVC','DVC_TL')
  );

-- ---------------------------------------------------------------------------
-- faculties / departments
-- ---------------------------------------------------------------------------

alter table public.faculties enable row level security;
drop policy if exists faculties_select on public.faculties;
create policy faculties_select on public.faculties for select using (auth.uid() is not null);
drop policy if exists faculties_write on public.faculties;
create policy faculties_write on public.faculties for all
  using (public.has_role('DVC','DVC_TL')) with check (public.has_role('DVC','DVC_TL'));

alter table public.departments enable row level security;
drop policy if exists departments_select on public.departments;
create policy departments_select on public.departments for select using (auth.uid() is not null);
drop policy if exists departments_write on public.departments;
create policy departments_write on public.departments for all
  using (public.has_role('DVC','DVC_TL','FACULTY_ADMIN')) with check (public.has_role('DVC','DVC_TL','FACULTY_ADMIN'));

-- ---------------------------------------------------------------------------
-- modules / evidence
-- ---------------------------------------------------------------------------

alter table public.modules enable row level security;
drop policy if exists modules_select on public.modules;
create policy modules_select on public.modules for select using (auth.uid() is not null);
drop policy if exists modules_insert on public.modules;
create policy modules_insert on public.modules for insert
  with check (public.has_role('HOD','FACULTY_ADMIN','DVC','DVC_TL','DEPUTY_DEAN','EXECUTIVE_DEAN'));
drop policy if exists modules_update on public.modules;
create policy modules_update on public.modules for update
  using (public.has_role('HOD','FACULTY_ADMIN','DVC','DVC_TL','DEPUTY_DEAN','EXECUTIVE_DEAN'))
  with check (public.has_role('HOD','FACULTY_ADMIN','DVC','DVC_TL','DEPUTY_DEAN','EXECUTIVE_DEAN'));
-- no delete policy: matches original rules (nothing in the app deletes modules)

alter table public.evidence enable row level security;
drop policy if exists evidence_select on public.evidence;
create policy evidence_select on public.evidence for select using (auth.uid() is not null);
drop policy if exists evidence_insert on public.evidence;
create policy evidence_insert on public.evidence for insert with check (auth.uid() is not null);
drop policy if exists evidence_update on public.evidence;
create policy evidence_update on public.evidence for update
  using (public.has_role('HOD','FACULTY_ADMIN','DEPUTY_DEAN','EXECUTIVE_DEAN'))
  with check (public.has_role('HOD','FACULTY_ADMIN','DEPUTY_DEAN','EXECUTIVE_DEAN'));
drop policy if exists evidence_delete on public.evidence;
create policy evidence_delete on public.evidence for delete
  using (public.has_role('HOD','FACULTY_ADMIN','DEPUTY_DEAN','EXECUTIVE_DEAN')); -- fixes the missing-delete gap

-- ---------------------------------------------------------------------------
-- questionnaires / student_evaluations / development_plans
-- ---------------------------------------------------------------------------

alter table public.questionnaires enable row level security;
drop policy if exists questionnaires_select on public.questionnaires;
create policy questionnaires_select on public.questionnaires for select using (auth.uid() is not null);
drop policy if exists questionnaires_write on public.questionnaires;
create policy questionnaires_write on public.questionnaires for all
  using (public.has_role('CQPA','FACULTY_ADMIN','QPO')) with check (public.has_role('CQPA','FACULTY_ADMIN','QPO'));

alter table public.student_evaluations enable row level security;
drop policy if exists student_evaluations_select on public.student_evaluations;
create policy student_evaluations_select on public.student_evaluations for select using (auth.uid() is not null);
drop policy if exists student_evaluations_insert on public.student_evaluations;
create policy student_evaluations_insert on public.student_evaluations for insert with check (auth.uid() is not null);
drop policy if exists student_evaluations_update on public.student_evaluations;
create policy student_evaluations_update on public.student_evaluations for update
  using (public.has_role('CQPA','FACULTY_ADMIN','QPO')) with check (public.has_role('CQPA','FACULTY_ADMIN','QPO'));
drop policy if exists student_evaluations_delete on public.student_evaluations;
create policy student_evaluations_delete on public.student_evaluations for delete
  using (public.has_role('CQPA','FACULTY_ADMIN','QPO'));

alter table public.development_plans enable row level security;
drop policy if exists development_plans_all on public.development_plans;
create policy development_plans_all on public.development_plans for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- surveys / survey_responses / survey_invitations
-- direct table access stays signed-in-only; the genuinely public/unauthenticated
-- flow is exposed only through the two SECURITY DEFINER RPCs in
-- 0004_public_survey_rpc.sql, never through blanket anon RLS (which would let
-- anyone holding the public anon key enumerate every invitation token).
-- ---------------------------------------------------------------------------

alter table public.surveys enable row level security;
drop policy if exists surveys_select on public.surveys;
create policy surveys_select on public.surveys for select using (auth.uid() is not null);
drop policy if exists surveys_write on public.surveys;
create policy surveys_write on public.surveys for all
  using (public.has_role('HOD','FACULTY_ADMIN','CQPA','QPO')) with check (public.has_role('HOD','FACULTY_ADMIN','CQPA','QPO'));

alter table public.survey_responses enable row level security;
drop policy if exists survey_responses_select on public.survey_responses;
create policy survey_responses_select on public.survey_responses for select using (auth.uid() is not null);
drop policy if exists survey_responses_update on public.survey_responses;
create policy survey_responses_update on public.survey_responses for update
  using (public.has_role('CQPA','FACULTY_ADMIN','QPO')) with check (public.has_role('CQPA','FACULTY_ADMIN','QPO'));
drop policy if exists survey_responses_delete on public.survey_responses;
create policy survey_responses_delete on public.survey_responses for delete
  using (public.has_role('CQPA','FACULTY_ADMIN','QPO'));

alter table public.survey_invitations enable row level security;
drop policy if exists survey_invitations_select on public.survey_invitations;
create policy survey_invitations_select on public.survey_invitations for select using (auth.uid() is not null);
drop policy if exists survey_invitations_write on public.survey_invitations;
create policy survey_invitations_write on public.survey_invitations for all
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- student_lists / question_bank / standard_templates / policy_documents / department_guidelines
-- ---------------------------------------------------------------------------

alter table public.student_lists enable row level security;
drop policy if exists student_lists_select on public.student_lists;
create policy student_lists_select on public.student_lists for select using (auth.uid() is not null);
drop policy if exists student_lists_write on public.student_lists;
create policy student_lists_write on public.student_lists for all
  using (public.has_role('HOD','FACULTY_ADMIN','QPO')) with check (public.has_role('HOD','FACULTY_ADMIN','QPO'));

alter table public.question_bank enable row level security;
drop policy if exists question_bank_select on public.question_bank;
create policy question_bank_select on public.question_bank for select using (auth.uid() is not null);
drop policy if exists question_bank_write on public.question_bank;
create policy question_bank_write on public.question_bank for all
  using (public.has_role('CQPA','FACULTY_ADMIN','QPO')) with check (public.has_role('CQPA','FACULTY_ADMIN','QPO'));

alter table public.standard_templates enable row level security;
drop policy if exists standard_templates_select on public.standard_templates;
create policy standard_templates_select on public.standard_templates for select using (auth.uid() is not null);
drop policy if exists standard_templates_write on public.standard_templates;
create policy standard_templates_write on public.standard_templates for all
  using (public.has_role('QPO')) with check (public.has_role('QPO'));

alter table public.policy_documents enable row level security;
drop policy if exists policy_documents_select on public.policy_documents;
create policy policy_documents_select on public.policy_documents for select using (auth.uid() is not null);
drop policy if exists policy_documents_write on public.policy_documents;
create policy policy_documents_write on public.policy_documents for all
  using (public.has_role('QPO')) with check (public.has_role('QPO'));

alter table public.department_guidelines enable row level security;
drop policy if exists department_guidelines_select on public.department_guidelines;
create policy department_guidelines_select on public.department_guidelines for select using (auth.uid() is not null);
drop policy if exists department_guidelines_write on public.department_guidelines;
create policy department_guidelines_write on public.department_guidelines for all
  using (public.has_role('HOD')) with check (public.has_role('HOD'));

-- ---------------------------------------------------------------------------
-- notifications / report_templates
-- ---------------------------------------------------------------------------

alter table public.notifications enable row level security;
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select using (auth.uid() is not null);
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert with check (auth.uid() is not null);
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update
  using (auth.uid() is not null) with check (auth.uid() is not null);

alter table public.report_templates enable row level security;
drop policy if exists report_templates_select on public.report_templates;
create policy report_templates_select on public.report_templates for select using (auth.uid() is not null);
drop policy if exists report_templates_write on public.report_templates;
create policy report_templates_write on public.report_templates for all
  using (public.has_role('CQPA','QPO','FACULTY_ADMIN','HOD','DVC_TL','DVC','EXECUTIVE_DEAN','DEPUTY_DEAN'))
  with check (public.has_role('CQPA','QPO','FACULTY_ADMIN','HOD','DVC_TL','DVC','EXECUTIVE_DEAN','DEPUTY_DEAN'));

-- VaultIQ: full reset of all mock/seed data before going live.
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- TRUNCATE ... CASCADE clears every table regardless of FK dependency order,
-- and resets identity sequences (harmless here since all PKs are uuid, not serial).
--
-- NOTE: this only clears table rows. It does NOT delete files already uploaded
-- to the 'evidence-vault' storage bucket -- if you've uploaded real test files
-- there, remove them separately via Storage -> evidence-vault in the dashboard.
--
-- NOTE: clearing `profiles` removes every staff account record, including ones
-- linked to real auth.users logins (auth_user_id). Those users will hit
-- NOT_PROVISIONED on next sign-in (per bootstrap_profile() in
-- 0003_storage.sql) until an admin re-adds them via Staff Management, EXCEPT
-- anonymous/dev-bypass sessions which auto-recreate a FACULTY_ADMIN profile.

truncate table
  public.notifications,
  public.report_templates,
  public.department_guidelines,
  public.policy_documents,
  public.standard_templates,
  public.question_bank,
  public.student_lists,
  public.survey_invitations,
  public.survey_responses,
  public.surveys,
  public.development_plans,
  public.student_evaluations,
  public.questionnaires,
  public.evidence,
  public.modules,
  public.profiles,
  public.departments,
  public.faculties
restart identity cascade;

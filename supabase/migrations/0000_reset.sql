-- VaultIQ: full reset before (re-)running 0001 -> 0007.
-- Only run this if you want to wipe the database and start clean -- this is
-- meant for the dev/mock-data database, not a real production one.
--
-- Why this exists: 0001-0006 (as originally written) used bare `create
-- table`/`create policy`/`create trigger` without existence guards, so a
-- partial failure partway through a run (or re-running after one) leaves the
-- database in a mixed state that further runs can't recover from on their
-- own ("relation already exists", "column does not exist", etc.). 0001-0007
-- have since been patched to be idempotent (safe to re-run), but that only
-- helps once the schema is in a consistent state to begin with. Run this
-- once, then run 0001 through 0007 in order in a single sitting.

drop function if exists public.bootstrap_profile(text) cascade;
drop function if exists public.has_role(text[]) cascade;
drop function if exists public.current_profile_role() cascade;
drop function if exists public.current_profile_id() cascade;
drop function if exists public.get_survey_invitation_by_token(text) cascade;
drop function if exists public.submit_survey_response(uuid, jsonb, text) cascade;
drop function if exists public.set_updated_at() cascade;

drop table if exists
  public.user_type,
  public.role_page_actions,
  public.role_pages,
  public.page_actions,
  public.pages,
  public.roles,
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
cascade;

delete from storage.objects where bucket_id = 'evidence-vault';
delete from storage.buckets where id = 'evidence-vault';

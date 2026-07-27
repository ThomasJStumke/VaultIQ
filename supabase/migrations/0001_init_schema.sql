-- VaultIQ: initial Postgres schema (replaces Firestore collections)
-- Naming: snake_case tables/columns. Apply via Supabase SQL Editor, in order 0001 -> 0005.

create extension if not exists pgcrypto; -- gen_random_uuid()

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- faculties / departments
--
-- Deliberately TEXT-keyed by the existing short codes ('FAI', 'FAI_AUD_TAX',
-- ...) rather than uuid. The app compares department/faculty ids as opaque
-- strings throughout business logic (permissions.config.ts's
-- filterModulesByScope, DashboardOverview's selectedDeptId, etc.) without
-- ever resolving through a real relational lookup -- a uuid PK would silently
-- break every one of those string comparisons across ~15 files for no benefit.
-- ---------------------------------------------------------------------------

create table if not exists public.faculties (
  id text primary key,
  name text not null,
  dean_uid uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.departments (
  id text primary key,
  faculty_id text not null references public.faculties(id) on delete cascade,
  name text not null,
  hod_uid uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_departments_faculty_id on public.departments (faculty_id);

-- ---------------------------------------------------------------------------
-- profiles (replaces `users` collection)
--
-- Deviation from "id = auth.users.id": Firestore had two doc states -- a real
-- uid-keyed profile, and an email-keyed placeholder pre-provisioned by an
-- admin (addStaffMember) awaiting the invitee's first login. Postgres can't
-- key a row by an auth.users.id that doesn't exist yet, so `id` is its own
-- uuid and `auth_user_id` is nullable, set when a placeholder is claimed (or
-- immediately for anonymous/dev-bypass sessions). All RLS/ownership checks
-- use auth_user_id = auth.uid(), not id.
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text not null,
  display_name text not null default 'Anonymous Staff',
  role text not null default 'LECTURER',
  faculty_id text references public.faculties(id),
  department_id text references public.departments(id),
  assigned_modules text[] not null default '{}', -- module codes/ids as free text, matches profile.assignedModules usage
  status text not null default 'ACTIVE',
  programme text,
  highest_qualification text,
  date_of_appointment date,
  employment_type text,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_profiles_auth_user_id on public.profiles (auth_user_id);
create index if not exists idx_profiles_lower_email on public.profiles (lower(email));
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'faculties_dean_fk') then
    alter table public.faculties add constraint faculties_dean_fk foreign key (dean_uid) references public.profiles(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'departments_hod_fk') then
    alter table public.departments add constraint departments_hod_fk foreign key (hod_uid) references public.profiles(id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- modules / evidence
-- ---------------------------------------------------------------------------

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  department_id text not null references public.departments(id),
  lecturer_uids text[] not null default '{}', -- free text, matches existing seed data (e.g. "Mr. A"), not real uids
  compliance_status text not null default 'PENDING' check (compliance_status in ('COMPLIANT','PENDING','NON_COMPLIANT')),
  last_audit_at timestamptz,
  assessment_mode text check (assessment_mode in ('EXAM_BASED','CONTINUOUS_ASSESSMENT','PROJECT_BASED')),
  is_exit_level boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_modules_department_id on public.modules (department_id);
drop trigger if exists trg_modules_updated_at on public.modules;
create trigger trg_modules_updated_at before update on public.modules
  for each row execute function public.set_updated_at();

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  type text not null check (type in ('STUDY_GUIDE','ASSESSMENT_TASK','MODERATION_REPORT','EXAM_PAPER','PRE_REVIEW')),
  storage_path text not null,
  uploaded_by uuid not null references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  ai_validation_status text not null default 'PENDING' check (ai_validation_status in ('VALID','INVALID','PENDING')),
  ai_feedback text,
  name text,
  category text check (category in ('CURRICULUM','ASSESSMENTS','MODERATION','EVIDENCE','COMPLIANCE')),
  sub_category text check (sub_category in ('INTERNAL_MOD','EXTERNAL_MOD','OTHER')),
  is_exam_related boolean not null default false,
  size bigint,
  version int not null default 1,
  questionnaire jsonb,      -- small, always read/written as a whole unit -- not queried independently
  front_page_generated boolean not null default false,
  front_page_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_evidence_module_id on public.evidence (module_id);

-- ---------------------------------------------------------------------------
-- questionnaires / student_evaluations / development_plans
-- ---------------------------------------------------------------------------

create table if not exists public.questionnaires (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('LECTURER_EVALUATION','MODULE_EVALUATION','UNIVERSAL')),
  questions jsonb not null default '[]',
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.student_evaluations (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid references public.questionnaires(id),
  module_code text not null,
  lecturer_uid text not null, -- free text, matches existing data (display names, not real uids)
  lecturer_name text,
  evaluator_type text check (evaluator_type in ('STUDENT','SELF','PEER')),
  ratings jsonb not null default '{}', -- dynamic {questionId: rating} map, keys vary per questionnaire
  comments text,
  submitted_at timestamptz not null default now()
);
create index if not exists idx_student_evaluations_module_code on public.student_evaluations (module_code);

create table if not exists public.development_plans (
  id uuid primary key default gen_random_uuid(),
  lecturer_uid text not null,
  lecturer_name text,
  module_code text,
  area_of_improvement text not null,
  suggested_action text not null,
  commitment_date date,
  status text not null default 'PROPOSED' check (status in ('PROPOSED','COMMITTED','UPDATED','COMPLETED')),
  update_statement text,
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_devplans_updated_at on public.development_plans;
create trigger trg_devplans_updated_at before update on public.development_plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- surveys / survey_responses / survey_invitations
-- ---------------------------------------------------------------------------

create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  title text,
  data jsonb not null default '{}', -- survey definition shape is undocumented (typed `any` in source)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_surveys_updated_at on public.surveys;
create trigger trg_surveys_updated_at before update on public.surveys
  for each row execute function public.set_updated_at();

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid references public.surveys(id),
  module_code text,
  ratings jsonb not null default '{}',
  comments text,
  submitted_at timestamptz not null default now()
);
create index if not exists idx_survey_responses_survey_id on public.survey_responses (survey_id);

create table if not exists public.survey_invitations (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid references public.surveys(id),
  token text not null unique,
  recipient_email text,
  module_code text,
  module_name text,
  survey_title text,
  expires_at date,
  used boolean not null default false,
  used_at timestamptz,
  sent_at timestamptz not null default now()
);
create index if not exists idx_survey_invitations_token on public.survey_invitations (token);

-- ---------------------------------------------------------------------------
-- student_lists (pseudo-1:1 with module in Firestore -> unique FK here)
-- ---------------------------------------------------------------------------

create table if not exists public.student_lists (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade unique,
  module_code text not null,
  students jsonb not null default '[]', -- full-list overwrite on save, matches original setDoc semantics
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- question_bank / standard_templates / policy_documents / department_guidelines
-- ---------------------------------------------------------------------------

create table if not exists public.question_bank (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  type text not null,
  required text not null default 'No',
  category text,
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- caller-supplied id in Firestore (setDoc by id) -> caller-supplied uuid here (client generates via crypto.randomUUID())
create table if not exists public.standard_templates (
  id uuid primary key,
  template_type text not null,
  file_name text not null,
  file_size text,
  storage_path text,
  updated_by text,
  updated_at timestamptz not null default now()
);

create table if not exists public.policy_documents (
  id uuid primary key,
  title text,
  file_name text,
  storage_path text,
  updated_by text,
  updated_at timestamptz not null default now()
);

create table if not exists public.department_guidelines (
  department_id text primary key references public.departments(id) on delete cascade,
  content jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- notifications / report_templates
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  title text not null,
  message text,
  type text check (type in ('REMINDER','WARNING','ESCALATION','AUDIT','COMPLIANCE')),
  status text not null default 'UNREAD' check (status in ('UNREAD','READ')),
  module_code text,
  escalation_tier int,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_created_at_desc on public.notifications (created_at desc);

create table if not exists public.report_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  entity_type text check (entity_type in ('module','department','faculty','lecturer')),
  layout text check (layout in ('table','grid','academic_dossier','scorecard')),
  fields jsonb not null default '[]',
  styles jsonb not null default '{}',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_report_templates_updated_at on public.report_templates;
create trigger trg_report_templates_updated_at before update on public.report_templates
  for each row execute function public.set_updated_at();

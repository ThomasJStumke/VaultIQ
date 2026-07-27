-- VaultIQ: dev seed data (replaces firebaseService.ts's runtime initializeSeedData()).
-- This is a one-time seed of an empty database -- ModuleList.tsx no longer calls
-- a seed function at runtime; run this once via the Supabase SQL Editor instead.
-- Idempotent: guarded by "insert if not already seeded" checks, safe to re-run.

do $$
declare
  v_questionnaire_id uuid;
begin

  -- faculties / departments -----------------------------------------------
  insert into public.faculties (id, name) values
    ('FAI', 'Faculty of Applied Innovation')
  on conflict (id) do nothing;

  insert into public.departments (id, faculty_id, name) values
    ('FAI', 'FAI', 'Faculty Administration'), -- matches original seed's admin.departmentId = 'FAI'
    ('FAI_AUD_TAX', 'FAI', 'Auditing & Taxation'),
    ('FAI_IT', 'FAI', 'Information Technology'),
    ('FAI_IS', 'FAI', 'Information Systems'),
    ('FAI_FIN_ACC', 'FAI', 'Finance & Accounting')
  on conflict (id) do nothing;

  -- modules -----------------------------------------------------------------
  if not exists (select 1 from public.modules) then
    insert into public.modules (code, name, department_id, lecturer_uids, compliance_status, assessment_mode) values
      ('AUDB201', 'Auditing Fundamentals', 'FAI_AUD_TAX', array['Mr. A'], 'PENDING', 'EXAM_BASED'),
      ('PRG201', 'Technical Programming 2', 'FAI_IT', array['Prof. B'], 'PENDING', 'CONTINUOUS_ASSESSMENT'),
      ('SYS111', 'Systems Analysis 1', 'FAI_IS', array[]::text[], 'COMPLIANT', 'PROJECT_BASED');
  end if;

  -- profiles (pre-provisioned staff, matches addStaffMember's is_placeholder pattern) --
  if not exists (select 1 from public.profiles) then
    insert into public.profiles (email, display_name, role, department_id, is_placeholder) values
      ('mr.a@university.edu', 'Mr. A', 'LECTURER', 'FAI_AUD_TAX', true),
      ('prof.b@university.edu', 'Prof. B', 'LECTURER', 'FAI_IT', true),
      ('s.jenkins@university.edu', 'Dr. Sarah Jenkins', 'LECTURER', 'FAI_FIN_ACC', true),
      ('admin@university.edu', 'James Wilson', 'FACULTY_ADMIN', 'FAI', true);
  end if;

  -- questionnaires ------------------------------------------------------------
  if not exists (select 1 from public.questionnaires) then
    insert into public.questionnaires (title, type, questions, created_by)
    values (
      'CQPA Institutional Module & Lecturer Evaluation Questionnaire',
      'UNIVERSAL',
      '[
        {"id":"q1","text":"Lecturer starts lectures on time and displays professional punctuality","type":"RATING"},
        {"id":"q2","text":"Module outcomes and materials are clearly articulated and aligned with higher education standards","type":"RATING"},
        {"id":"q3","text":"Assessments are graded with constructive feedback and objective transparency","type":"RATING"},
        {"id":"q4","text":"Quality and relevance of the text, slides, and supplementary guidelines","type":"RATING"}
      ]'::jsonb,
      'CQPA Unit Master'
    )
    returning id into v_questionnaire_id;
  else
    select id into v_questionnaire_id from public.questionnaires order by created_at asc limit 1;
  end if;

  -- student_evaluations ---------------------------------------------------
  if not exists (select 1 from public.student_evaluations) and v_questionnaire_id is not null then
    insert into public.student_evaluations (questionnaire_id, module_code, lecturer_uid, lecturer_name, evaluator_type, ratings, comments) values
      (v_questionnaire_id, 'AUDB201', 'Mr. A', 'Mr. A', 'STUDENT', '{"q1":4,"q2":5,"q3":3,"q4":4}'::jsonb, 'Great delivery, but grade turnaround takes too long.'),
      (v_questionnaire_id, 'AUDB201', 'Mr. A', 'Mr. A', 'STUDENT', '{"q1":5,"q2":4,"q3":4,"q4":5}'::jsonb, 'Very thorough auditee examples, very well connected.'),
      (v_questionnaire_id, 'PRG201', 'Prof. B', 'Prof. B', 'STUDENT', '{"q1":3,"q2":3,"q3":4,"q4":3}'::jsonb, 'Tough programming syllabus, needs more tutorial worksheets.'),
      (v_questionnaire_id, 'PRG201', 'Prof. B', 'Prof. B', 'STUDENT', '{"q1":5,"q2":5,"q3":5,"q4":4}'::jsonb, 'Brilliant coder, really inspires his students!');
  end if;

  -- development_plans ------------------------------------------------------
  if not exists (select 1 from public.development_plans) then
    insert into public.development_plans (lecturer_uid, lecturer_name, module_code, area_of_improvement, suggested_action, commitment_date, status, update_statement) values
      ('Mr. A', 'Mr. A', 'AUDB201',
       'Assessments constructive grading & objective feedback turnaround times (Evaluation q3 factor)',
       'Establish standard 14-day grading cycle with detailed digital rubric transparency for each student test.',
       '2026-07-15', 'COMMITTED', 'Rubric checklists configured. Implementation begins immediately on semester diagnostics.'),
      ('Prof. B', 'Prof. B', 'PRG201',
       'Module syllabus presentation clarity & supplementary tutorial worksheets (Evaluation q4 factor)',
       'Create visual workspace examples and publish 3 supportive tutorial worksheets answering nested code criteria.',
       null, 'PROPOSED', null);
  end if;

  -- question_bank -----------------------------------------------------------
  if not exists (select 1 from public.question_bank) then
    insert into public.question_bank (text, type, required, category, "order") values
      ('Lecturer starts lectures on time and displays professional punctuality', 'Rating 1-5', 'Yes', 'Teaching Quality', 0),
      ('Module outcomes and materials are clearly articulated and aligned with higher education standards', 'Rating 1-5', 'Yes', 'Module Content', 0),
      ('Assessments are graded with constructive feedback and objective transparency', 'Rating 1-5', 'Yes', 'Teaching Quality', 1),
      ('Quality and relevance of the text, slides, and supplementary guidelines', 'Rating 1-5', 'Yes', 'Module Content', 1),
      ('Does the lecturer respond to emails and communication within a reasonable timeframe?', 'Yes/No', 'No', 'Communication', 0),
      ('Are virtual support sessions available and useful?', 'Yes/No', 'No', 'Communication', 1),
      ('Please share any specific suggestions to improve teaching and assessment delivery for this module.', 'Open Text', 'No', 'Feedback', 0);
  end if;

end $$;

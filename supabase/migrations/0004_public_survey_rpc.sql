-- VaultIQ: SECURITY DEFINER RPCs for the unauthenticated public survey-link
-- flow (PublicSurveyResponse.tsx). These replace the old Firestore rules'
-- fully-open `if true` read/write on survey_invitations/survey_responses --
-- a blanket anon RLS policy would let anyone holding the public anon key
-- enumerate every invitation token, which these narrow RPCs avoid.

-- Output columns are aliased to camelCase (quoted identifiers) to match what
-- PublicSurveyResponse.tsx reads directly off the RPC result (inv.surveyId,
-- inv.expiresAt, ...) without a separate snake_case-to-camelCase mapping step.
create or replace function public.get_survey_invitation_by_token(p_token text)
returns table (
  id uuid,
  "surveyId" uuid,
  used boolean,
  "expiresAt" date,
  "moduleCode" text,
  "moduleName" text,
  "surveyTitle" text
)
language sql security definer set search_path = public as $$
  select id, survey_id, used, expires_at, module_code, module_name, survey_title
  from public.survey_invitations
  where token = p_token
  limit 1;
$$;

grant execute on function public.get_survey_invitation_by_token(text) to anon, authenticated;

create or replace function public.submit_survey_response(
  p_invitation_id uuid,
  p_ratings jsonb,
  p_comments text
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_survey_id uuid;
  v_module_code text;
  v_used boolean;
begin
  select survey_id, module_code, used into v_survey_id, v_module_code, v_used
  from public.survey_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'INVALID_INVITATION';
  end if;

  if v_used then
    raise exception 'INVITATION_ALREADY_USED';
  end if;

  update public.survey_invitations
    set used = true, used_at = now()
    where id = p_invitation_id;

  insert into public.survey_responses (survey_id, module_code, ratings, comments)
  values (v_survey_id, v_module_code, p_ratings, p_comments);
end;
$$;

grant execute on function public.submit_survey_response(uuid, jsonb, text) to anon, authenticated;

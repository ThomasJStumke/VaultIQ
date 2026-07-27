-- VaultIQ: Supabase Storage bucket + policies for evidence files.
-- Firebase Storage was never actually wired up in the old app (uploads only
-- fabricated a path string) -- this is genuinely new functionality, not a port.

insert into storage.buckets (id, name, public)
values ('evidence-vault', 'evidence-vault', false)
on conflict (id) do nothing;

-- Path convention: {moduleId}/{evidenceId}/{originalFileName}
-- (simplified from storageService.ts's fuller faculty/dept/programme scheme,
-- since that context isn't reliably available at upload time today)

create policy evidence_bucket_select on storage.objects for select
  using (bucket_id = 'evidence-vault' and auth.uid() is not null);

create policy evidence_bucket_insert on storage.objects for insert
  with check (bucket_id = 'evidence-vault' and auth.uid() is not null);

create policy evidence_bucket_update on storage.objects for update
  using (bucket_id = 'evidence-vault' and public.has_role('HOD','FACULTY_ADMIN','DEPUTY_DEAN','EXECUTIVE_DEAN'));

create policy evidence_bucket_delete on storage.objects for delete
  using (bucket_id = 'evidence-vault' and public.has_role('HOD','FACULTY_ADMIN','DEPUTY_DEAN','EXECUTIVE_DEAN'));

-- ---------------------------------------------------------------------------
-- bootstrap_profile(): called by the client right after sign-in.
-- Replaces useAuth.tsx's old direct-Firestore logic (existing profile ->
-- return it; anonymous dev-bypass -> create a mock FACULTY_ADMIN profile;
-- real session matching a pre-provisioned placeholder's email -> claim it;
-- no match -> raise NOT_PROVISIONED, caught client-side).
-- ---------------------------------------------------------------------------

create or replace function public.bootstrap_profile()
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_is_anon boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  v_row public.profiles;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_row from public.profiles where auth_user_id = v_uid;
  if found then
    return v_row;
  end if;

  if v_is_anon then
    insert into public.profiles (auth_user_id, email, display_name, role, is_placeholder)
    values (v_uid, 'dev@example.com', 'Dev User', 'FACULTY_ADMIN', false)
    returning * into v_row;
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
    return v_row;
  end if;

  raise exception 'NOT_PROVISIONED';
end;
$$;

grant execute on function public.bootstrap_profile() to authenticated;

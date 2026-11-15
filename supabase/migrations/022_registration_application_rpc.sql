-- 022: Public membership application submit + read membership types for registration

create policy membership_types_public_read on public.membership_types
  for select using (is_active = true);

create or replace function public.submit_membership_application(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  app_id uuid;
  existing uuid;
begin
  if uid is null then
    raise exception 'Could not complete application. Confirm your email if required, then sign in and try again.';
  end if;

  update public.profiles
  set
    full_name = coalesce(nullif(payload->>'full_name', ''), full_name),
    email = coalesce(nullif(payload->>'email', ''), email),
    user_type = 'pending',
    is_active = false
  where id = uid;

  select id into existing
  from public.membership_applications
  where applicant_user_id = uid and status = 'pending'
  limit 1;

  if existing is not null then
    update public.membership_applications
    set
      full_name = payload->>'full_name',
      email = payload->>'email',
      contact_number = payload->>'contact_number',
      membership_type = payload->>'membership_type'
    where id = existing;
    app_id := existing;
  else
    insert into public.membership_applications (
      applicant_user_id, full_name, email, contact_number, membership_type, status
    ) values (
      uid,
      payload->>'full_name',
      payload->>'email',
      nullif(payload->>'contact_number', ''),
      nullif(payload->>'membership_type', ''),
      'pending'
    )
    returning id into app_id;
  end if;

  return jsonb_build_object('application_id', app_id, 'status', 'pending');
end;
$$;

grant execute on function public.submit_membership_application(jsonb) to authenticated;
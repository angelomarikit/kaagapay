-- 024: Member applications — interest rate comes from loan type (admin), not the applicant

create or replace function public.submit_loan_application(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  mid uuid := public.current_member_id();
  app_id uuid;
  p_principal numeric(18, 2);
  p_term int;
  p_rate numeric(8, 4);
  p_purpose text;
  p_loan_type_id uuid;
  m_status text;
  type_term int;
begin
  if mid is null then
    raise exception 'No member profile linked to this account.';
  end if;

  select status into m_status from public.members where id = mid;
  if m_status is distinct from 'active' then
    raise exception 'Only active members can apply for a loan.';
  end if;

  if exists (
    select 1 from public.loan_applications
    where member_id = mid and status = 'submitted'
  ) then
    raise exception 'You already have a pending loan application awaiting staff review.';
  end if;

  p_principal := (payload->>'requested_principal')::numeric;
  if p_principal is null or p_principal <= 0 then
    raise exception 'Enter a valid loan amount.';
  end if;

  p_purpose := nullif(trim(payload->>'purpose'), '');

  p_loan_type_id := nullif(payload->>'loan_type_id', '')::uuid;
  if p_loan_type_id is null then
    raise exception 'Select a loan type.';
  end if;

  select default_rate, default_term_months
  into p_rate, type_term
  from public.loan_types
  where id = p_loan_type_id and is_active = true;

  if not found then
    raise exception 'Invalid or inactive loan type.';
  end if;

  p_term := type_term;
  if (payload->>'term_months') is not null and (payload->>'term_months') <> '' then
    p_term := (payload->>'term_months')::int;
  end if;

  if p_term is null or p_term < 1 then
    p_term := type_term;
  end if;

  insert into public.loan_applications (
    member_id, loan_type_id, requested_principal, purpose, term_months, interest_rate, status
  ) values (
    mid, p_loan_type_id, p_principal, p_purpose, p_term, p_rate, 'submitted'
  )
  returning id into app_id;

  return jsonb_build_object(
    'application_id', app_id,
    'status', 'submitted',
    'interest_rate', p_rate,
    'term_months', p_term
  );
end;
$$;
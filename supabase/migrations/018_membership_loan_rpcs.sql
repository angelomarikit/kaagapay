-- 018: Contribution recording, loan approval, loan repayment RPCs

create or replace function public.record_contribution(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  contribution_id uuid;
  journal_id uuid;
  cash_acct uuid;
  equity_acct uuid;
  amt numeric(18, 2);
begin
  if not public.is_staff() then raise exception 'Unauthorized'; end if;

  amt := (payload->>'amount')::numeric;
  if amt is null or amt <= 0 then raise exception 'Amount must be positive'; end if;

  select id into cash_acct from public.chart_of_accounts where code = '1010' limit 1;
  select id into equity_acct from public.chart_of_accounts where code = '2010' limit 1;

  insert into public.contributions (member_id, category_id, amount, contributed_at, receipt_reference, notes)
  values (
    (payload->>'member_id')::uuid,
    nullif(payload->>'category_id', '')::uuid,
    amt,
    coalesce((payload->>'contributed_at')::timestamptz, now()),
  payload->>'receipt_reference',
    payload->>'notes'
  ) returning id into contribution_id;

  if cash_acct is not null and equity_acct is not null then
    journal_id := public.post_journal_entry(jsonb_build_object(
      'reference', coalesce(payload->>'receipt_reference', 'CONT-' || left(contribution_id::text, 8)),
      'description', 'Member contribution',
      'source_type', 'contribution',
      'source_id', contribution_id::text,
      'lines', jsonb_build_array(
        jsonb_build_object('account_id', cash_acct, 'debit', amt::text, 'credit', '0'),
        jsonb_build_object('account_id', equity_acct, 'debit', '0', 'credit', amt::text)
      )
    ));
    update public.contributions set journal_entry_id = journal_id where id = contribution_id;
  end if;

  return jsonb_build_object('contribution_id', contribution_id, 'journal_entry_id', journal_id);
end;
$$;

create or replace function public.approve_loan_application(application_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  app public.loan_applications%rowtype;
  loan_id uuid;
  loan_no text;
  monthly_principal numeric(18, 2);
  i int;
begin
  if not public.is_staff() then raise exception 'Unauthorized'; end if;

  select * into app from public.loan_applications where id = application_id for update;
  if not found then raise exception 'Application not found'; end if;
  if app.status = 'approved' then
    select id, loan_number into loan_id, loan_no from public.loans where application_id = application_id limit 1;
    return jsonb_build_object('loan_id', loan_id, 'loan_number', loan_no, 'idempotent', true);
  end if;
  if app.status not in ('submitted', 'pending', 'under_review') then
    raise exception 'Application cannot be approved from status %', app.status;
  end if;

  loan_no := 'LN-' || to_char(now(), 'YYYY') || '-' || lpad((select count(*) + 1 from public.loans)::text, 4, '0');

  insert into public.loans (
    loan_number, application_id, member_id, principal, interest_rate, term_months,
    outstanding_principal, status, disbursed_at
  ) values (
    loan_no, app.id, app.member_id, app.requested_principal, app.interest_rate, app.term_months,
    app.requested_principal, 'active', now()
  ) returning id into loan_id;

  monthly_principal := round(app.requested_principal / app.term_months, 2);

  for i in 1..app.term_months loop
    insert into public.loan_schedules (
      loan_id, payment_no, due_date, amount_due, principal_portion, interest_portion, status
    ) values (
      loan_id,
      i,
      (current_date + (i || ' months')::interval)::date,
      monthly_principal,
      monthly_principal,
      0,
      case when i = 1 then 'due' else 'upcoming' end
    );
  end loop;

  update public.loan_applications set status = 'approved' where id = application_id;

  return jsonb_build_object('loan_id', loan_id, 'loan_number', loan_no);
end;
$$;

create or replace function public.record_loan_repayment(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  repayment_id uuid;
  loan_row public.loans%rowtype;
  amt numeric(18, 2);
begin
  if not public.is_staff() then raise exception 'Unauthorized'; end if;

  select id into existing_id from public.loan_repayments
  where client_request_id = (payload->>'client_request_id')::uuid;
  if existing_id is not null then
    return jsonb_build_object('repayment_id', existing_id, 'idempotent', true);
  end if;

  amt := (payload->>'amount')::numeric;
  if amt is null or amt <= 0 then raise exception 'Amount must be positive'; end if;

  select * into loan_row from public.loans where id = (payload->>'loan_id')::uuid for update;
  if not found then raise exception 'Loan not found'; end if;
  if loan_row.status <> 'active' then raise exception 'Loan is not active'; end if;

  insert into public.loan_repayments (
    loan_id, amount, principal_paid, interest_paid, client_request_id, receipt_reference
  ) values (
    loan_row.id,
    amt,
    least(amt, loan_row.outstanding_principal),
    greatest(amt - least(amt, loan_row.outstanding_principal), 0),
    (payload->>'client_request_id')::uuid,
    payload->>'receipt_reference'
  ) returning id into repayment_id;

  update public.loans
  set outstanding_principal = greatest(outstanding_principal - amt, 0),
      status = case when outstanding_principal - amt <= 0 then 'paid' else status end
  where id = loan_row.id;

  return jsonb_build_object('repayment_id', repayment_id, 'outstanding', greatest(loan_row.outstanding_principal - amt, 0));
end;
$$;

grant execute on function public.record_contribution(jsonb) to authenticated;
grant execute on function public.approve_loan_application(uuid) to authenticated;
grant execute on function public.record_loan_repayment(jsonb) to authenticated;
grant execute on function public.next_member_code() to authenticated;
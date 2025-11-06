/*
Function: process_daily_fines
Purpose:  - For each borrowing record past due_date and not returned, ensure a fine exists and increment it
          according to the current fine rule. The function will:
             * Insert a new fine if none exists (amount = days_overdue * current_rule)
             * If a Pending fine exists, add (delta_days * current_rule) to the existing amount
               where delta_days = days_overdue - fines.days_overdue (this covers missed runs)
             * Leave Paid fines untouched
             * Update borrowing_records.status to 'Overdue' when applicable
Notes: Use UTC date arithmetic. The single fine rule is expected to have the fixed UUID.
*/
create or replace function public.process_daily_fines()
returns void
language plpgsql
as $$
declare
  v_rule_amount numeric(10,2);
  rec record;
  v_days_overdue int;
  v_existing_days int;
  v_existing_amount numeric(10,2);
  v_status text;
  v_delta int;
  v_increment numeric(10,2);
begin
  -- read the single fine rule (fixed ID)
  select amount_per_day into v_rule_amount
  from public.fine_rules
  where id = '00000000-0000-0000-0000-000000000000'::uuid;

  if v_rule_amount is null then
    raise notice 'No fine rule found; skipping fines processing';
    return;
  end if;

  for rec in
    select br.id, br.user_id, br.due_date
    from public.borrowing_records br
    where br.due_date < (now() at time zone 'utc')::date
      and coalesce(br.status, '') <> 'Returned'
  loop
    v_days_overdue := ((now() at time zone 'utc')::date - rec.due_date::date)::int;
    if v_days_overdue <= 0 then
      continue;
    end if;

    -- check if a fine already exists for this borrowing record
    select f.amount, f.days_overdue, f.status
      into v_existing_amount, v_existing_days, v_status
    from public.fines f
    where f.borrowing_record_id = rec.id
    limit 1;

    if v_existing_days is null then
      -- no existing fine: create one reflecting the full days overdue using current rule
      insert into public.fines (
        id, user_id, borrowing_record_id, fine_rule_id, amount, days_overdue, status, created_at, updated_at
      ) values (
        gen_random_uuid(), rec.user_id, rec.id, '00000000-0000-0000-0000-000000000000'::uuid,
        round((v_days_overdue::numeric * v_rule_amount)::numeric, 2), v_days_overdue, 'Pending', now(), now()
      );
    else
      -- existing fine found
      if v_status = 'Paid' then
        -- leave paid fines untouched
        null;
      else
        -- compute how many new days have elapsed since the fine was last updated
        v_delta := v_days_overdue - v_existing_days;
        if v_delta > 0 then
          v_increment := round((v_delta::numeric * v_rule_amount)::numeric, 2);
          update public.fines
          set amount = round((coalesce(amount,0)::numeric + v_increment)::numeric, 2),
              days_overdue = v_days_overdue,
              updated_at = now()
          where borrowing_record_id = rec.id;
        end if;
      end if;
    end if;

    -- ensure borrowing record is marked Overdue (if not returned)
    update public.borrowing_records
    set status = 'Overdue'
    where id = rec.id and coalesce(status,'') <> 'Returned';
  end loop;
end;
$$;

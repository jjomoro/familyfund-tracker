-- Run this if you already created the database before this update.
-- It adds safe member removal/deactivation support and refreshes the dashboard function.

alter table public.members add column if not exists deleted_at timestamptz;

drop policy if exists "members_admin_delete" on public.members;
create policy "members_admin_delete"
on public.members for delete
to authenticated
using (public.is_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_name text;
  resolved_role text;
begin
  resolved_name := coalesce(
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1),
    'Family Member'
  );

  resolved_role := case
    when not exists (select 1 from public.members where deleted_at is null) then 'admin'
    else 'member'
  end;

  insert into public.members (user_id, name, email, monthly_target, role, deleted_at)
  values (new.id, resolved_name, new.email, 0, resolved_role, null)
  on conflict (email) do update
    set user_id = excluded.user_id,
        name = coalesce(public.members.name, excluded.name),
        deleted_at = null,
        updated_at = now();

  return new;
end;
$$;

create or replace function public.get_dashboard_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  snapshot jsonb;
  fund_currency text;
  fund_start_date date;
begin
  select currency, start_date
  into fund_currency, fund_start_date
  from public.fund_settings
  where id = 1;

  if fund_start_date is null then
    fund_start_date := date_trunc('month', now())::date;
  end if;

  with months as (
    select date_trunc('month', gs)::date as month_start
    from generate_series(
      greatest(date_trunc('month', fund_start_date)::date, (date_trunc('month', now()) - interval '11 months')::date),
      date_trunc('month', now())::date,
      interval '1 month'
    ) as gs
  ),
  month_totals as (
    select
      m.month_start,
      coalesce((
        select sum(c.amount)
        from public.contributions c
        where make_date(c.year, c.month, 1) = m.month_start
      ), 0) as contribution_total,
      coalesce((
        select sum(w.amount)
        from public.withdrawals w
        where w.status = 'approved'
          and w.reviewed_at is not null
          and date_trunc('month', w.reviewed_at)::date = m.month_start
      ), 0) as withdrawal_total
    from months m
  ),
  growth as (
    select
      month_start,
      extract(month from month_start)::int as month,
      extract(year from month_start)::int as year,
      to_char(month_start, 'Mon YY') as label,
      contribution_total as "contributionTotal",
      withdrawal_total as "withdrawalTotal",
      sum(contribution_total - withdrawal_total) over (order by month_start) as balance
    from month_totals
  ),
  outstanding as (
    select
      mem.id as member_id,
      mem.name,
      mem.monthly_target,
      coalesce(sum(c.amount), 0) as paid,
      greatest(mem.monthly_target - coalesce(sum(c.amount), 0), 0) as owed,
      case
        when mem.monthly_target <= 0 then 'paid'
        when coalesce(sum(c.amount), 0) >= mem.monthly_target then 'paid'
        when coalesce(sum(c.amount), 0) > 0 then 'partial'
        else 'outstanding'
      end as status
    from public.members mem
    left join public.contributions c
      on c.member_id = mem.id
      and c.month = extract(month from now())::int
      and c.year = extract(year from now())::int
    where mem.role = 'member'
      and mem.deleted_at is null
    group by mem.id, mem.name, mem.monthly_target
  ),
  recent as (
    select id, type, title, detail, amount, status, created_at
    from public.audit_logs
    order by created_at desc
    limit 5
  )
  select jsonb_build_object(
    'fundBalance', coalesce((select sum(amount) from public.contributions), 0)
      - coalesce((select sum(amount) from public.withdrawals where status = 'approved'), 0),
    'currency', fund_currency,
    'monthlyGrowth', coalesce((select jsonb_agg(to_jsonb(g) - 'month_start' order by g.month_start) from growth g), '[]'::jsonb),
    'outstanding', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'member', jsonb_build_object('id', member_id, 'name', name, 'monthly_target', monthly_target),
          'paid', paid,
          'owed', owed,
          'status', status
        )
        order by owed desc
      )
      from outstanding
      where owed > 0
    ), '[]'::jsonb),
    'recentActivity', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from recent r), '[]'::jsonb)
  ) into snapshot;

  return snapshot;
end;
$$;

grant execute on function public.get_dashboard_snapshot() to authenticated;

-- FamilyFund v3: monthly close + Data API access
create table if not exists public.monthly_closes (
  id uuid primary key default gen_random_uuid(),
  month int not null check (month between 1 and 12),
  year int not null check (year between 2020 and 2100),
  closed_by uuid not null references public.members(id) on delete restrict,
  closed_at timestamptz not null default now(),
  unique(month, year)
);

alter table public.monthly_closes enable row level security;
drop policy if exists "monthly_closes_select_authenticated" on public.monthly_closes;
drop policy if exists "monthly_closes_admin_insert" on public.monthly_closes;
drop policy if exists "monthly_closes_admin_update" on public.monthly_closes;
create policy "monthly_closes_select_authenticated" on public.monthly_closes for select to authenticated using (true);
create policy "monthly_closes_admin_insert" on public.monthly_closes for insert to authenticated with check (public.is_admin());
create policy "monthly_closes_admin_update" on public.monthly_closes for update to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.monthly_closes to authenticated;
grant insert, update on public.monthly_closes to authenticated;
grant all on public.monthly_closes to service_role;


-- Explicit Data API grants for existing public tables.
grant select, insert, update, delete on public.members to authenticated;
grant select, insert, update, delete on public.fund_settings to authenticated;
grant select, insert, update, delete on public.contributions to authenticated;
grant select, insert, update, delete on public.withdrawals to authenticated;
grant select, insert on public.audit_logs to authenticated;
grant all on public.members, public.fund_settings, public.contributions, public.withdrawals, public.audit_logs to service_role;
grant execute on function public.get_dashboard_snapshot() to authenticated;

-- Member-submitted contribution workflow. Members record the amount paid; admins verify it before it affects the fund.
alter table public.contributions
  add column if not exists payment_method text not null default 'manual' check (payment_method in ('manual','mpesa','cash','bank','other')),
  add column if not exists transaction_reference text,
  add column if not exists payment_date date,
  add column if not exists verification_status text not null default 'verified' check (verification_status in ('pending','verified','rejected')),
  add column if not exists verified_by uuid references public.members(id) on delete set null,
  add column if not exists verified_at timestamptz;

update public.contributions
set verification_status = 'verified'
where verification_status is null;

create unique index if not exists contributions_transaction_reference_unique
on public.contributions (lower(transaction_reference))
where transaction_reference is not null;

create index if not exists contributions_verification_status_idx on public.contributions (verification_status);
create index if not exists contributions_member_period_idx on public.contributions (member_id, year, month);

drop policy if exists "contributions_admin_insert" on public.contributions;
create policy "contributions_insert_scope"
on public.contributions for insert
to authenticated
with check (
  public.is_admin()
  or (
    member_id = public.current_member_id()
    and verification_status = 'pending'
    and payment_method = 'manual'
    and recorded_by = public.current_member_id()
  )
);

drop policy if exists "contributions_admin_update" on public.contributions;
create policy "contributions_admin_update"
on public.contributions for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.contributions to authenticated;
grant all on public.contributions to service_role;

-- Rebuild the dashboard RPC so unverified/rejected submissions never affect balances or dues.
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
  select currency, start_date into fund_currency, fund_start_date from public.fund_settings where id = 1;
  if fund_start_date is null then fund_start_date := date_trunc('month', now())::date; end if;

  with months as (
    select date_trunc('month', gs)::date as month_start
    from generate_series(
      greatest(date_trunc('month', fund_start_date)::date, (date_trunc('month', now()) - interval '11 months')::date),
      date_trunc('month', now())::date,
      interval '1 month'
    ) as gs
  ),
  month_totals as (
    select m.month_start,
      coalesce((select sum(c.amount) from public.contributions c where c.verification_status = 'verified' and make_date(c.year,c.month,1)=m.month_start),0) as contribution_total,
      coalesce((select sum(w.amount) from public.withdrawals w where w.status='approved' and w.reviewed_at is not null and date_trunc('month',w.reviewed_at)::date=m.month_start),0) as withdrawal_total
    from months m
  ),
  growth as (
    select month_start, extract(month from month_start)::int as month, extract(year from month_start)::int as year,
      to_char(month_start,'Mon YY') as label, contribution_total as "contributionTotal", withdrawal_total as "withdrawalTotal",
      sum(contribution_total-withdrawal_total) over(order by month_start) as balance
    from month_totals
  ),
  outstanding as (
    select mem.id as member_id, mem.name, mem.monthly_target,
      coalesce(sum(c.amount) filter (where c.verification_status='verified'),0) as paid,
      greatest(mem.monthly_target-coalesce(sum(c.amount) filter (where c.verification_status='verified'),0),0) as owed,
      case when mem.monthly_target<=0 then 'paid'
        when coalesce(sum(c.amount) filter (where c.verification_status='verified'),0)>=mem.monthly_target then 'paid'
        when coalesce(sum(c.amount) filter (where c.verification_status='verified'),0)>0 then 'partial'
        else 'outstanding' end as status
    from public.members mem
    left join public.contributions c on c.member_id=mem.id and c.month=extract(month from now())::int and c.year=extract(year from now())::int
    where mem.role='member' and mem.deleted_at is null
    group by mem.id,mem.name,mem.monthly_target
  ),
  recent as (
    select id,type,title,detail,amount,status,created_at from public.audit_logs order by created_at desc limit 5
  )
  select jsonb_build_object(
    'fundBalance', coalesce((select sum(amount) from public.contributions where verification_status='verified'),0)-coalesce((select sum(amount) from public.withdrawals where status='approved'),0),
    'currency', fund_currency,
    'monthlyGrowth', coalesce((select jsonb_agg(to_jsonb(g)-'month_start' order by g.month_start) from growth g),'[]'::jsonb),
    'outstanding', coalesce((select jsonb_agg(jsonb_build_object('member',jsonb_build_object('id',member_id,'name',name,'monthly_target',monthly_target),'paid',paid,'owed',owed,'status',status) order by owed desc) from outstanding where owed>0),'[]'::jsonb),
    'recentActivity', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from recent r),'[]'::jsonb)
  ) into snapshot;
  return snapshot;
end;
$$;

grant execute on function public.get_dashboard_snapshot() to authenticated;

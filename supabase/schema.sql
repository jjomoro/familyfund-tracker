-- FamilyFund Tracker Supabase schema
-- Run this in Supabase SQL Editor before signing up your first user.
-- The first user who signs up becomes the admin automatically.

create extension if not exists pgcrypto;

-- Clean development reset. Remove this block if you already have real data.
-- drop table if exists public.audit_logs cascade;
-- drop table if exists public.withdrawals cascade;
-- drop table if exists public.contributions cascade;
-- drop table if exists public.fund_settings cascade;
-- drop table if exists public.members cascade;
-- drop function if exists public.get_dashboard_snapshot() cascade;
-- drop function if exists public.handle_new_user() cascade;
-- drop function if exists public.current_member_id() cascade;
-- drop function if exists public.is_admin() cascade;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  email text unique not null,
  monthly_target numeric(12,2) not null default 0 check (monthly_target >= 0),
  role text not null default 'member' check (role in ('admin', 'member')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- Migration-safe additions for projects created with older versions of this app.
alter table public.members add column if not exists deleted_at timestamptz;

create table if not exists public.fund_settings (
  id int primary key default 1 check (id = 1),
  fund_name text not null default 'Family Emergency Fund',
  currency text not null default 'KES',
  start_date date not null default date_trunc('month', now())::date,
  updated_at timestamptz not null default now()
);

insert into public.fund_settings (id, fund_name, currency, start_date)
values (1, 'Family Emergency Fund', 'KES', date_trunc('month', now())::date)
on conflict (id) do nothing;

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  month int not null check (month between 1 and 12),
  year int not null check (year between 2020 and 2100),
  status text not null check (status in ('paid', 'partial', 'outstanding')),
  recorded_by uuid references public.members(id) on delete set null,
  recorded_at timestamptz not null default now()
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  requested_by_member_id uuid not null references public.members(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.members(id) on delete set null,
  reviewed_at timestamptz,
  rejection_note text
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  detail text not null,
  amount numeric(12,2) not null default 0,
  status text,
  actor_member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_members_updated_at on public.members;
create trigger touch_members_updated_at
before update on public.members
for each row execute function public.touch_updated_at();

drop trigger if exists touch_fund_settings_updated_at on public.fund_settings;
create trigger touch_fund_settings_updated_at
before update on public.fund_settings
for each row execute function public.touch_updated_at();

create or replace function public.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.members where user_id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

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
    when not exists (select 1 from public.members) then 'admin'
    else 'member'
  end;

  insert into public.members (user_id, name, email, monthly_target, role)
  values (new.id, resolved_name, new.email, 0, resolved_role)
  on conflict (email) do update
    set user_id = excluded.user_id,
        name = coalesce(public.members.name, excluded.name),
        deleted_at = null,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.members enable row level security;
alter table public.fund_settings enable row level security;
alter table public.contributions enable row level security;
alter table public.withdrawals enable row level security;
alter table public.audit_logs enable row level security;

-- Reset policies for repeatable setup.
drop policy if exists "members_select_authenticated" on public.members;
drop policy if exists "members_admin_insert" on public.members;
drop policy if exists "members_admin_update" on public.members;
drop policy if exists "members_admin_delete" on public.members;
drop policy if exists "settings_select_authenticated" on public.fund_settings;
drop policy if exists "settings_admin_write" on public.fund_settings;
drop policy if exists "contributions_select_scope" on public.contributions;
drop policy if exists "contributions_admin_insert" on public.contributions;
drop policy if exists "contributions_admin_update" on public.contributions;
drop policy if exists "contributions_admin_delete" on public.contributions;
drop policy if exists "withdrawals_select_scope" on public.withdrawals;
drop policy if exists "withdrawals_insert_scope" on public.withdrawals;
drop policy if exists "withdrawals_admin_update" on public.withdrawals;
drop policy if exists "audit_select_authenticated" on public.audit_logs;
drop policy if exists "audit_insert_authenticated" on public.audit_logs;

create policy "members_select_authenticated"
on public.members for select
to authenticated
using (true);

create policy "members_admin_insert"
on public.members for insert
to authenticated
with check (public.is_admin());

create policy "members_admin_update"
on public.members for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "members_admin_delete"
on public.members for delete
to authenticated
using (public.is_admin());

create policy "settings_select_authenticated"
on public.fund_settings for select
to authenticated
using (true);

create policy "settings_admin_write"
on public.fund_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "contributions_select_scope"
on public.contributions for select
to authenticated
using (
  public.is_admin()
  or member_id = public.current_member_id()
);

create policy "contributions_admin_insert"
on public.contributions for insert
to authenticated
with check (public.is_admin());

create policy "contributions_admin_update"
on public.contributions for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "contributions_admin_delete"
on public.contributions for delete
to authenticated
using (public.is_admin());

create policy "withdrawals_select_scope"
on public.withdrawals for select
to authenticated
using (
  public.is_admin()
  or requested_by_member_id = public.current_member_id()
);

create policy "withdrawals_insert_scope"
on public.withdrawals for insert
to authenticated
with check (
  public.is_admin()
  or requested_by_member_id = public.current_member_id()
);

create policy "withdrawals_admin_update"
on public.withdrawals for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "audit_select_authenticated"
on public.audit_logs for select
to authenticated
using (true);

create policy "audit_insert_authenticated"
on public.audit_logs for insert
to authenticated
with check (auth.uid() is not null);

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

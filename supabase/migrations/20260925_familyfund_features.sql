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

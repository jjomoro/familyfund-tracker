-- FamilyFund Tracker: explicit Supabase Data API table grants
--
-- Existing tables retain their current grants, but these explicit grants make
-- the permissions deterministic for migrations, previews, local db reset, and
-- future Supabase Data API behavior. RLS policies remain the row-level guard.
--
-- anon is intentionally NOT granted access: FamilyFund Tracker requires
-- authenticated users for all application data.

-- Existing application tables
grant select, insert, update, delete on table public.members to authenticated;
grant select, insert, update, delete on table public.members to service_role;

grant select, insert, update, delete on table public.fund_settings to authenticated;
grant select, insert, update, delete on table public.fund_settings to service_role;

grant select, insert, update, delete on table public.contributions to authenticated;
grant select, insert, update, delete on table public.contributions to service_role;

grant select, insert, update, delete on table public.withdrawals to authenticated;
grant select, insert, update, delete on table public.withdrawals to service_role;

grant select, insert, update, delete on table public.audit_logs to authenticated;
grant select, insert, update, delete on table public.audit_logs to service_role;

-- Dashboard RPC is consumed by authenticated users.
grant execute on function public.get_dashboard_snapshot() to authenticated;

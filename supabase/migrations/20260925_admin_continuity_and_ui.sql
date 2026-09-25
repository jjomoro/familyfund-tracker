-- Multiple-admin continuity and protection against removing the final active admin.
create or replace function public.prevent_last_admin_removal()
returns trigger language plpgsql security definer set search_path = public as $$
declare remaining_admins integer;
begin
  if OLD.role = 'admin' and (NEW.role <> 'admin' or NEW.deleted_at is not null) then
    select count(*) into remaining_admins from public.members where role = 'admin' and deleted_at is null and id <> OLD.id;
    if remaining_admins = 0 then raise exception 'At least one active admin must remain on the fund.'; end if;
  end if;
  return NEW;
end; $$;

drop trigger if exists prevent_last_admin_removal on public.members;
create trigger prevent_last_admin_removal before update on public.members for each row execute function public.prevent_last_admin_removal();

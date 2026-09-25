-- Replace the old M-Pesa-specific member submission rule with a simple
-- member contribution submission workflow.
-- Members may record their own contribution as pending; admins verify/reject.

drop policy if exists "contributions_insert_scope" on public.contributions;
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

grant insert on public.contributions to authenticated;

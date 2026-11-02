-- Track receipts separately; issued invoice snapshots remain immutable.
alter table public.dashboard_invoices
 add column if not exists payment_status text
 check (payment_status in ('pending','paid'));
grant update(payment_status) on public.dashboard_invoices to authenticated;
drop policy if exists "CRM invoice payment" on public.dashboard_invoices;
create policy "CRM invoice payment" on public.dashboard_invoices
 for update to authenticated
 using (exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in ('admin','editor')))
 with check (exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in ('admin','editor')));

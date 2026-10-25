-- Allow CRM editors to delete invoices; viewer access remains read-only.
begin;
alter table public.dashboard_invoices enable row level security;
grant delete on public.dashboard_invoices to authenticated;
drop policy if exists "CRM invoice delete" on public.dashboard_invoices;
create policy "CRM invoice delete" on public.dashboard_invoices for delete to authenticated
using (exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in ('admin','editor')));
commit;

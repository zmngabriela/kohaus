-- Public pages read only active properties. Dashboard writes remain restricted
-- to authenticated users registered in public.dashboard_users.
alter table public.dashboard_properties enable row level security;

drop policy if exists "public read active dashboard_properties" on public.dashboard_properties;
create policy "public read active dashboard_properties"
on public.dashboard_properties
for select
to anon, authenticated
using (status = 'active');

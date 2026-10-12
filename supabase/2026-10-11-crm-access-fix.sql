begin;
-- Keep older permissive policies from exposing the complete CRM property record.
alter table public.dashboard_properties enable row level security;
drop policy if exists "CRM property membership required" on public.dashboard_properties;
create policy "CRM property membership required" on public.dashboard_properties
as restrictive for select to anon, authenticated
using (exists(select 1 from public.dashboard_users where user_id=auth.uid()));
-- Apply the same read boundary to legacy CRM tables, including installations
-- where their original row-level security was disabled.
alter table public.dashboard_users enable row level security;
drop policy if exists "CRM own membership required" on public.dashboard_users;
create policy "CRM own membership required" on public.dashboard_users
as restrictive for select to anon, authenticated using (user_id=auth.uid());
do $$
declare table_name text;
begin
 foreach table_name in array array['dashboard_clients','dashboard_visits','owner_leads'] loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('drop policy if exists "CRM membership required" on public.%I',table_name);
  execute format('create policy "CRM membership required" on public.%I as restrictive for select to anon, authenticated using (exists(select 1 from public.dashboard_users where user_id=auth.uid()))',table_name);
 end loop;
end $$;
commit;

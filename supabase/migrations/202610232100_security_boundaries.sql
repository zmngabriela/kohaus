-- Apply first on DEV; preserves existing accounts and records. Review membership first.
begin;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_dashboard_user_signup();
alter table public.dashboard_users alter column role set default 'viewer';
-- No browser can grant itself membership, change roles or invoke service-only provisioning.
revoke all on public.dashboard_users from anon, authenticated;
grant select on public.dashboard_users to authenticated;

-- Restrictive guards also protect installations with permissive legacy policies.
do $$
declare t text;
begin
 foreach t in array array['dashboard_properties','dashboard_clients','dashboard_visits','dashboard_tasks','property_private','dashboard_invoices','dashboard_invoice_settings','owner_leads'] loop
  execute format('alter table public.%I enable row level security', t);
  if t <> 'owner_leads' then
   execute format('revoke all on public.%I from anon', t);
  end if;
  execute format('drop policy if exists "security member read" on public.%I',t);
  execute format('create policy "security member read" on public.%I as restrictive for select to anon, authenticated using (exists(select 1 from public.dashboard_users where user_id=auth.uid()))',t);
  execute format('drop policy if exists "security editor update" on public.%I',t);
  execute format('create policy "security editor update" on public.%I as restrictive for update to authenticated using (exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in (''admin'',''editor''))) with check (exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in (''admin'',''editor'')))',t);
  execute format('drop policy if exists "security editor delete" on public.%I',t);
  execute format('create policy "security editor delete" on public.%I as restrictive for delete to authenticated using (exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in (''admin'',''editor'')))',t);
  if t <> 'owner_leads' then
   execute format('drop policy if exists "security editor insert" on public.%I',t);
   execute format('create policy "security editor insert" on public.%I as restrictive for insert to authenticated with check (exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in (''admin'',''editor'')))',t);
  end if;
 end loop;
end $$;

-- Browser submissions are constrained even before the protected form gateway is deployed.
drop policy if exists "security valid public lead" on public.owner_leads;
create policy "security valid public lead" on public.owner_leads as restrictive for insert to anon, authenticated
with check (
 legal_accepted is true and status='nuevo'
 and length(name) between 1 and 150 and length(surname) between 1 and 150
 and length(email) between 3 and 254 and length(phone) between 1 and 40
 and length(city) between 1 and 200 and length(operation) between 1 and 40
 and length(source) between 1 and 100 and length(coalesce(address,''))<=500
 and length(coalesce(comments,''))<=10000
 and language in ('pt','es','en')
);
revoke select, update, delete on public.owner_leads from anon;

-- The browser validates too; enforce upload type/size at Storage.
update storage.buckets set file_size_limit=20971520,
 allowed_mime_types=array['image/jpeg','image/png','image/webp'] where id='property-media';
drop policy if exists "security media insert" on storage.objects;
create policy "security media insert" on storage.objects as restrictive for insert to authenticated
with check (bucket_id<>'property-media' or exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in ('admin','editor')));
drop policy if exists "security media update" on storage.objects;
create policy "security media update" on storage.objects as restrictive for update to authenticated
using (bucket_id<>'property-media' or exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in ('admin','editor')))
with check (bucket_id<>'property-media' or exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in ('admin','editor')));
drop policy if exists "security media delete" on storage.objects;
create policy "security media delete" on storage.objects as restrictive for delete to authenticated
using (bucket_id<>'property-media' or exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in ('admin','editor')));

alter function public.set_updated_at() set search_path = public;
commit;

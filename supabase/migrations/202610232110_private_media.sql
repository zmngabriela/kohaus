-- Deploy the signed-photo frontend BEFORE applying this migration. Test DEV first.
-- Old public links may remain in caches; purge CDN caches and audit old off-market URLs.
begin;
create index if not exists dashboard_properties_photos_gin on public.dashboard_properties using gin(photos jsonb_path_ops);
create or replace function public.is_published_property_photo(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.dashboard_properties p
 where p.status in ('active','closed') and not p.off_market
 and p.photos @> jsonb_build_array(jsonb_build_object('path',object_name)))
$$;
revoke all on function public.is_published_property_photo(text) from public;
grant execute on function public.is_published_property_photo(text) to anon, authenticated;
drop policy if exists "published property media read" on storage.objects;
create policy "published property media read" on storage.objects for select to anon, authenticated
using (bucket_id='property-media' and public.is_published_property_photo(name));
drop policy if exists "property media read boundary" on storage.objects;
create policy "property media read boundary" on storage.objects as restrictive for select to authenticated
using (bucket_id<>'property-media' or public.is_published_property_photo(name)
 or exists(select 1 from public.dashboard_users where user_id=auth.uid()));
drop policy if exists "anonymous media read boundary" on storage.objects;
create policy "anonymous media read boundary" on storage.objects as restrictive for select to anon
using (bucket_id<>'property-media' or public.is_published_property_photo(name));
update storage.buckets set public=false where id='property-media';
commit;

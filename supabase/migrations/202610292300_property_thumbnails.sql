-- Allow thumbnails only for the same published, non-off-market listings as originals.
begin;
create or replace function public.is_published_property_photo(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.dashboard_properties p
 where p.status in ('active','closed') and not p.off_market
 and (p.photos @> jsonb_build_array(jsonb_build_object('path',object_name))
 or p.photos @> jsonb_build_array(jsonb_build_object('thumbnailPath',object_name))))
$$;
revoke all on function public.is_published_property_photo(text) from public;
grant execute on function public.is_published_property_photo(text) to anon, authenticated;
commit;

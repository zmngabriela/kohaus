begin;
alter table public.dashboard_properties add column if not exists country text not null default '';
alter table public.dashboard_properties add constraint dashboard_properties_country_length check (length(country) <= 100);
-- Infer only unambiguous existing locations; never invent a municipality.
update public.dashboard_properties set country = case
 when lower(destination) in ('barcelona','costa-brava','costa brava') then 'ES'
 when lower(destination) = 'portugal' then 'PT'
 when lower(destination) in ('brasil','brazil','itapema','balneario camboriu','balneário camboriú') then 'BR'
 else '' end where country = '';
create or replace function public.save_property_with_address(p_property jsonb, p_address text, p_id text default null)
returns text language plpgsql security invoker set search_path = public as $$
declare saved_id text; current_row public.dashboard_properties;
begin
 if p_id is null then
  insert into public.dashboard_properties(id,title,reference,operation,destination,country,type,price_value,currency,
   surface,rooms,bathrooms,status,observations,history,photos,portal_publications,portal_data,off_market)
  values(p_property->>'id',p_property->>'title',p_property->>'reference',p_property->>'operation',p_property->>'destination',coalesce(p_property->>'country',''),
   p_property->>'type',(p_property->>'price_value')::numeric,p_property->>'currency',
   (p_property->>'surface')::numeric,(p_property->>'rooms')::numeric,(p_property->>'bathrooms')::numeric,
   p_property->>'status',coalesce(p_property->>'observations',''),coalesce(p_property->'history','[]'),
   coalesce(p_property->'photos','[]'),coalesce(p_property->'portal_publications','[]'),coalesce(p_property->'portal_data','{}'),
   coalesce((p_property->>'off_market')::boolean,false)) on conflict(id) do nothing returning id into saved_id;
  if saved_id is null then
   select id into saved_id from public.dashboard_properties where id=p_property->>'id';
   if saved_id is null then raise exception 'Property create denied'; end if;
   return saved_id;
  end if;
 else
  select * into current_row from public.dashboard_properties where id=p_id for update;
  if not found then raise exception 'Property not found or access denied'; end if;
  current_row := jsonb_populate_record(current_row,p_property - 'id' - 'created_at');
  update public.dashboard_properties set title=current_row.title,reference=current_row.reference,
   operation=current_row.operation,destination=current_row.destination,country=current_row.country,type=current_row.type,
   price_value=current_row.price_value,currency=current_row.currency,surface=current_row.surface,
   rooms=current_row.rooms,bathrooms=current_row.bathrooms,status=current_row.status,
   observations=current_row.observations,history=current_row.history,photos=current_row.photos,
   portal_publications=current_row.portal_publications,portal_data=current_row.portal_data,off_market=current_row.off_market
   where id=p_id returning id into saved_id;
  if saved_id is null then raise exception 'Property update denied'; end if;
 end if;
 insert into public.property_private(property_id,address,owner_client_id)
 values(saved_id,coalesce(p_address,''),nullif(p_property->>'owner_client_id',''))
 on conflict(property_id) do update set address=excluded.address,
 owner_client_id=case when p_property ? 'owner_client_id' then excluded.owner_client_id else property_private.owner_client_id end;
 return saved_id;
end $$;
revoke all on function public.save_property_with_address(jsonb,text,text) from public;
grant execute on function public.save_property_with_address(jsonb,text,text) to authenticated;

create or replace view public.public_properties with (security_barrier=true) as
select id, created_at, title, reference, operation, destination, type, price_value, currency,
 surface, rooms, bathrooms, status, off_market,
 case when off_market then '' else observations end as observations,
 case when off_market then '[]'::jsonb else photos end as photos,
 case when off_market then '{}'::jsonb else jsonb_build_object(
 'featuredSlot', portal_data->'featuredSlot',
 'translations', coalesce(portal_data->'translations','{}'::jsonb),
 'extras', coalesce(portal_data->'extras','[]'::jsonb),
 'province',portal_data->'province','municipality',portal_data->'municipality',
 'neighborhood',portal_data->'neighborhood','condition',portal_data->'condition',
 'usefulSurface',portal_data->'usefulSurface','builtSurface',portal_data->'builtSurface',
 'numberOfFloors',portal_data->'numberOfFloors',
 'nearCityCenter',portal_data->'nearCityCenter','nearShops',portal_data->'nearShops',
 'nearSchools',portal_data->'nearSchools','nearPharmacy',portal_data->'nearPharmacy',
 'nearParks',portal_data->'nearParks','nearPolice',portal_data->'nearPolice',
 'nearPublicTransport',portal_data->'nearPublicTransport',
 'orientation',portal_data->'orientation','buildingYear',portal_data->'buildingYear',
 'energyConsumptionRating',portal_data->'energyConsumptionRating','energyEmissionsRating',portal_data->'energyEmissionsRating'
 ) end as portal_data, country
from public.dashboard_properties where status in ('active', 'closed');
revoke all on public.public_properties from public;
grant select on public.public_properties to anon, authenticated;
commit;

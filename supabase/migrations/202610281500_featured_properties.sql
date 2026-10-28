begin;

-- Four numbered homepage slots; the unique index also protects concurrent saves.
alter table public.dashboard_properties drop constraint if exists dashboard_properties_featured_slot_valid;
alter table public.dashboard_properties add constraint dashboard_properties_featured_slot_valid
 check (portal_data->>'featuredSlot' is null or portal_data->>'featuredSlot' in ('1','2','3','4'));
create unique index if not exists dashboard_properties_featured_slot_unique
 on public.dashboard_properties ((portal_data->>'featuredSlot'))
 where status = 'active' and not off_market and portal_data->>'featuredSlot' is not null;

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
 ) end as portal_data
from public.dashboard_properties where status in ('active', 'closed');
revoke all on public.public_properties from public;
grant select on public.public_properties to anon, authenticated;
commit;

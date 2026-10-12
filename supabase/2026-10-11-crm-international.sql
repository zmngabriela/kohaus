begin;
alter table public.owner_leads add column if not exists language text check (language in ('es','en','pt'));
alter table public.dashboard_clients add column if not exists language text check (language in ('es','en','pt'));
alter table public.dashboard_properties add column if not exists off_market boolean not null default false;

create table if not exists public.property_private (
 property_id text primary key references public.dashboard_properties(id) on delete cascade,
 address text not null default ''
);
alter table public.property_private enable row level security;
grant select, insert, update on public.property_private to authenticated;
drop policy if exists "CRM private property access" on public.property_private;
drop policy if exists "CRM private property read" on public.property_private;
create policy "CRM private property read" on public.property_private for select to authenticated
using (exists(select 1 from public.dashboard_users where user_id=auth.uid()));
create policy "CRM private property access" on public.property_private for all to authenticated
using (exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in ('admin','editor')))
with check (exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in ('admin','editor')));

-- Publish only approved property fields. Private addresses, history and portal contacts stay in the CRM.
-- Observations are the existing public listing description; off-market listings omit them.
drop policy if exists "public read active dashboard_properties" on public.dashboard_properties;
create or replace view public.public_properties with (security_barrier=true) as
select id, created_at, title, reference, operation, destination, type, price_value, currency,
 surface, rooms, bathrooms, status, off_market,
 case when off_market then '' else observations end as observations,
 case when off_market then '[]'::jsonb else photos end as photos,
 case when off_market then '{}'::jsonb else jsonb_build_object(
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
from public.dashboard_properties where status='active';
revoke all on public.public_properties from public;
grant select on public.public_properties to anon, authenticated;

create table if not exists public.dashboard_invoice_settings (
 id boolean primary key default true check(id),
 issuer jsonb not null default '{}'::jsonb
);
create table if not exists public.dashboard_invoices (
 id uuid primary key default gen_random_uuid(),
 number text not null unique check(btrim(number)<>''),
 created_at timestamptz not null default now(),
 snapshot jsonb not null
);
alter table public.dashboard_invoice_settings enable row level security;
alter table public.dashboard_invoices enable row level security;
grant select,insert,update on public.dashboard_invoice_settings to authenticated;
grant select,insert on public.dashboard_invoices to authenticated;
drop policy if exists "CRM invoice settings" on public.dashboard_invoice_settings;
create policy "CRM invoice settings" on public.dashboard_invoice_settings for all to authenticated
using (exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in ('admin','editor')))
with check (exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in ('admin','editor')));
drop policy if exists "CRM invoice read" on public.dashboard_invoices;
create policy "CRM invoice read" on public.dashboard_invoices for select to authenticated
using (exists(select 1 from public.dashboard_users where user_id=auth.uid()));
drop policy if exists "CRM invoice create" on public.dashboard_invoices;
create policy "CRM invoice create" on public.dashboard_invoices for insert to authenticated
with check (exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in ('admin','editor')));
-- Configure issuer details privately in the CRM invoice screen.
insert into public.dashboard_invoice_settings(id,issuer) values(true,'{}'::jsonb)
on conflict(id) do nothing;

-- Save the property and its private address in one transaction. RLS remains active.
create or replace function public.save_property_with_address(p_property jsonb, p_address text, p_id text default null)
returns text language plpgsql security invoker set search_path = public as $$
declare saved_id text; current_row public.dashboard_properties;
begin
 if p_id is null then
  insert into public.dashboard_properties(id,title,reference,operation,destination,type,price_value,currency,
   surface,rooms,bathrooms,status,observations,history,photos,portal_publications,portal_data,off_market)
  values(p_property->>'id',p_property->>'title',p_property->>'reference',p_property->>'operation',p_property->>'destination',
   p_property->>'type',(p_property->>'price_value')::numeric,p_property->>'currency',
   (p_property->>'surface')::numeric,(p_property->>'rooms')::numeric,(p_property->>'bathrooms')::numeric,
   p_property->>'status',coalesce(p_property->>'observations',''),coalesce(p_property->'history','[]'),
   coalesce(p_property->'photos','[]'),coalesce(p_property->'portal_publications','[]'),coalesce(p_property->'portal_data','{}'),
   coalesce((p_property->>'off_market')::boolean,false)) returning id into saved_id;
 else
  select * into current_row from public.dashboard_properties where id=p_id for update;
  if not found then raise exception 'Property not found or access denied'; end if;
  current_row := jsonb_populate_record(current_row,p_property - 'id' - 'created_at');
  update public.dashboard_properties set title=current_row.title,reference=current_row.reference,
   operation=current_row.operation,destination=current_row.destination,type=current_row.type,
   price_value=current_row.price_value,currency=current_row.currency,surface=current_row.surface,
   rooms=current_row.rooms,bathrooms=current_row.bathrooms,status=current_row.status,
   observations=current_row.observations,history=current_row.history,photos=current_row.photos,
   portal_publications=current_row.portal_publications,portal_data=current_row.portal_data,off_market=current_row.off_market
   where id=p_id returning id into saved_id;
  if saved_id is null then raise exception 'Property update denied'; end if;
 end if;
 insert into public.property_private(property_id,address) values(saved_id,coalesce(p_address,''))
 on conflict(property_id) do update set address=excluded.address;
 return saved_id;
end $$;
revoke all on function public.save_property_with_address(jsonb,text,text) from public;
grant execute on function public.save_property_with_address(jsonb,text,text) to authenticated;

commit;

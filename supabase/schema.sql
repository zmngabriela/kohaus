-- KOHAUS: canonical schema and compatibility upgrades.
-- INSTALAÇÃO PROD: executar este arquivo inteiro no SQL Editor do NOVO projeto.
-- Não copia dados de DEV e não cria imóveis, clientes, visitas, tarefas ou faturas.
-- Cria somente a estrutura, bucket e configuração vazia do emissor de faturas.
-- Usuários são criados separadamente em Authentication > Users; não inserir senhas via SQL.
-- Passo a passo e configuração de acesso: docs/AMBIENTES.md.
-- Repeatable compatibility bootstrap; use incremental migrations after installation.
-- Preserves existing data; ambiguous legacy prices abort the transaction.
-- Keep public Auth signups disabled. Explicit CRM membership is required.
begin;

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.owner_leads (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (btrim(name) <> ''),
  surname text not null check (btrim(surname) <> ''),
  phone text not null check (btrim(phone) <> ''),
  email text not null check (btrim(email) <> ''),
  address text,
  city text not null check (btrim(city) <> ''),
  operation text not null check (btrim(operation) <> ''),
  source text not null check (btrim(source) <> ''),
  comments text,
  status text not null default 'nuevo' check (btrim(status) <> ''),
  legal_accepted boolean not null default false,
  newsletter_accepted boolean not null default false
);

create table if not exists public.dashboard_properties (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null check (btrim(title) <> ''),
  reference text not null check (btrim(reference) <> ''),
  operation text not null check (btrim(operation) <> ''),
  destination text not null check (btrim(destination) <> ''),
  type text not null check (btrim(type) <> ''),
  price_value numeric(12, 2) check (price_value >= 0),
  surface numeric(10, 2) not null default 0 check (surface >= 0),
  rooms numeric(6, 2) not null default 0 check (rooms >= 0),
  bathrooms numeric(6, 2) not null default 0 check (bathrooms >= 0),
  status text not null default 'draft' check (btrim(status) <> ''),
  observations text not null default '',
  history jsonb not null default '[]'::jsonb,
  photos jsonb not null default '[]'::jsonb,
  portal_publications jsonb not null default '[]'::jsonb,
  portal_data jsonb not null default '{}'::jsonb,
  constraint dashboard_properties_history_is_array check (jsonb_typeof(history) = 'array'),
  constraint dashboard_properties_photos_is_array check (jsonb_typeof(photos) = 'array'),
  constraint dashboard_properties_portal_publications_is_array check (jsonb_typeof(portal_publications) = 'array'),
  constraint dashboard_properties_portal_data_is_object check (jsonb_typeof(portal_data) = 'object')
);

alter table public.dashboard_properties
add column if not exists portal_publications jsonb not null default '[]'::jsonb;

alter table public.dashboard_properties
add column if not exists portal_data jsonb not null default '{}'::jsonb;

comment on column public.dashboard_properties.portal_data is
'Structured property details for public listings and portal exports: address, neighbourhood, floor, orientation, building, areas, surroundings, energy certificate and contact data.';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'dashboard_properties_portal_data_is_object'
  ) then
    alter table public.dashboard_properties
    add constraint dashboard_properties_portal_data_is_object
    check (jsonb_typeof(portal_data) = 'object');
  end if;
end;
$$;

alter table public.dashboard_properties
add column if not exists bathrooms numeric(6, 2) not null default 0 check (bathrooms >= 0);

-- Price is optional: NULL means the property is intentionally listed without a price.
alter table public.dashboard_properties
alter column price_value drop not null,
alter column price_value drop default;

alter table public.dashboard_properties
alter column id set default ('property-' || gen_random_uuid()::text);

create sequence if not exists public.dashboard_property_reference_seq;

create or replace function public.assign_dashboard_property_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is null or btrim(new.id) = '' then
    new.id := 'property-' || gen_random_uuid()::text;
  end if;

  if new.reference is null or btrim(new.reference) = '' then
    loop
      new.reference := 'KH-' || lpad(nextval('public.dashboard_property_reference_seq')::text, 6, '0');
      exit when not exists (
        select 1
        from public.dashboard_properties
        where lower(reference) = lower(new.reference)
      );
    end loop;
  else
    new.reference := btrim(new.reference);
  end if;

  return new;
end;
$$;

drop trigger if exists assign_dashboard_property_reference on public.dashboard_properties;
drop trigger if exists assign_dashboard_property_identity on public.dashboard_properties;
create trigger assign_dashboard_property_identity
before insert on public.dashboard_properties
for each row
execute function public.assign_dashboard_property_identity();

drop function if exists public.assign_dashboard_property_reference();

create table if not exists public.dashboard_clients (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (btrim(name) <> ''),
  surname text not null default '',
  phone text not null default '',
  email text not null default '',
  operation text not null check (btrim(operation) <> ''),
  destinations jsonb not null default '[]'::jsonb,
  types jsonb not null default '[]'::jsonb,
  budget_min numeric(12, 2) not null default 0 check (budget_min >= 0),
  budget_max numeric(12, 2) not null default 0 check (budget_max >= 0),
  min_rooms numeric(6, 2) not null default 0 check (min_rooms >= 0),
  min_surface numeric(10, 2) not null default 0 check (min_surface >= 0),
  status text not null default 'new' check (btrim(status) <> ''),
  notes text not null default '',
  history jsonb not null default '[]'::jsonb,
  constraint dashboard_clients_budget_range check (budget_max = 0 or budget_max >= budget_min),
  constraint dashboard_clients_destinations_is_array check (jsonb_typeof(destinations) = 'array'),
  constraint dashboard_clients_types_is_array check (jsonb_typeof(types) = 'array'),
  constraint dashboard_clients_history_is_array check (jsonb_typeof(history) = 'array')
);

create table if not exists public.dashboard_visits (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id text references public.dashboard_clients (id) on delete set null,
  property_id text references public.dashboard_properties (id) on delete set null,
  lead_id text references public.owner_leads (id) on delete set null,
  contact_name text not null check (btrim(contact_name) <> ''),
  contact_phone text not null default '',
  contact_email text not null default '',
  location text not null default '',
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  status text not null default 'scheduled' check (status in ('scheduled', 'confirmed', 'completed', 'cancelled')),
  notes text not null default '',
  history jsonb not null default '[]'::jsonb,
  constraint dashboard_visits_history_is_array check (jsonb_typeof(history) = 'array')
);

create table if not exists public.dashboard_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null check (btrim(email) <> ''),
  display_name text not null default '',
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer'))
);

drop trigger if exists set_owner_leads_updated_at on public.owner_leads;
create trigger set_owner_leads_updated_at
before update on public.owner_leads
for each row
execute function public.set_updated_at();

drop trigger if exists set_dashboard_properties_updated_at on public.dashboard_properties;
create trigger set_dashboard_properties_updated_at
before update on public.dashboard_properties
for each row
execute function public.set_updated_at();

drop trigger if exists set_dashboard_clients_updated_at on public.dashboard_clients;
create trigger set_dashboard_clients_updated_at
before update on public.dashboard_clients
for each row
execute function public.set_updated_at();

drop trigger if exists set_dashboard_visits_updated_at on public.dashboard_visits;
create trigger set_dashboard_visits_updated_at
before update on public.dashboard_visits
for each row
execute function public.set_updated_at();

drop trigger if exists set_dashboard_users_updated_at on public.dashboard_users;
create trigger set_dashboard_users_updated_at
before update on public.dashboard_users
for each row
execute function public.set_updated_at();

-- Auth identity does not grant CRM membership. Membership is assigned explicitly in SQL.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_dashboard_user_signup();

create unique index if not exists dashboard_properties_reference_unique_idx
on public.dashboard_properties (lower(reference));

create index if not exists owner_leads_created_at_idx
on public.owner_leads (created_at desc);

create index if not exists owner_leads_status_idx
on public.owner_leads (status);

create index if not exists owner_leads_operation_idx
on public.owner_leads (operation);

create index if not exists owner_leads_city_idx
on public.owner_leads (city);

create index if not exists owner_leads_email_idx
on public.owner_leads (lower(email));

create index if not exists owner_leads_phone_idx
on public.owner_leads (phone);

create index if not exists dashboard_properties_created_at_idx
on public.dashboard_properties (created_at desc);

create index if not exists dashboard_properties_status_idx
on public.dashboard_properties (status);

create index if not exists dashboard_properties_operation_idx
on public.dashboard_properties (operation);

create index if not exists dashboard_properties_destination_idx
on public.dashboard_properties (destination);

create index if not exists dashboard_properties_type_idx
on public.dashboard_properties (type);

create index if not exists dashboard_properties_price_value_idx
on public.dashboard_properties (price_value);

create index if not exists dashboard_clients_created_at_idx
on public.dashboard_clients (created_at desc);

create index if not exists dashboard_clients_status_idx
on public.dashboard_clients (status);

create index if not exists dashboard_clients_operation_idx
on public.dashboard_clients (operation);

create index if not exists dashboard_clients_email_idx
on public.dashboard_clients (lower(email));

create index if not exists dashboard_clients_phone_idx
on public.dashboard_clients (phone);

create index if not exists dashboard_clients_budget_min_idx
on public.dashboard_clients (budget_min);

create index if not exists dashboard_clients_budget_max_idx
on public.dashboard_clients (budget_max);

create index if not exists dashboard_clients_destinations_gin_idx
on public.dashboard_clients
using gin (destinations jsonb_path_ops);

create index if not exists dashboard_clients_types_gin_idx
on public.dashboard_clients
using gin (types jsonb_path_ops);

create index if not exists dashboard_visits_scheduled_at_idx
on public.dashboard_visits (scheduled_at asc);

create index if not exists dashboard_visits_status_idx
on public.dashboard_visits (status);

create index if not exists dashboard_visits_client_id_idx
on public.dashboard_visits (client_id);

create index if not exists dashboard_visits_property_id_idx
on public.dashboard_visits (property_id);

create unique index if not exists dashboard_users_email_unique_idx
on public.dashboard_users (lower(email));

alter table public.owner_leads enable row level security;
alter table public.dashboard_properties enable row level security;
alter table public.dashboard_clients enable row level security;
alter table public.dashboard_visits enable row level security;
alter table public.dashboard_users enable row level security;

drop policy if exists "dashboard users select own access" on public.dashboard_users;
create policy "dashboard users select own access"
on public.dashboard_users
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "public insert owner_leads" on public.owner_leads;
create policy "public insert owner_leads"
on public.owner_leads
for insert
to anon, authenticated
with check (true);

drop policy if exists "dashboard read owner_leads" on public.owner_leads;
create policy "dashboard read owner_leads"
on public.owner_leads
for select
to authenticated
using (
  exists (
    select 1
    from public.dashboard_users
    where dashboard_users.user_id = auth.uid()
  )
);

drop policy if exists "dashboard update owner_leads" on public.owner_leads;
create policy "dashboard update owner_leads"
on public.owner_leads
for update
to authenticated
using (
  exists (
    select 1
    from public.dashboard_users
    where dashboard_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.dashboard_users
    where dashboard_users.user_id = auth.uid()
  )
);

drop policy if exists "dashboard delete owner_leads" on public.owner_leads;
create policy "dashboard delete owner_leads"
on public.owner_leads
for delete
to authenticated
using (
  exists (
    select 1
    from public.dashboard_users
    where dashboard_users.user_id = auth.uid()
  )
);

drop policy if exists "dashboard access dashboard_properties" on public.dashboard_properties;
create policy "dashboard access dashboard_properties"
on public.dashboard_properties
for all
to authenticated
using (
  exists (
    select 1
    from public.dashboard_users
    where dashboard_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.dashboard_users
    where dashboard_users.user_id = auth.uid()
  )
);

drop policy if exists "public read active dashboard_properties" on public.dashboard_properties;

drop policy if exists "dashboard access dashboard_clients" on public.dashboard_clients;
create policy "dashboard access dashboard_clients"
on public.dashboard_clients
for all
to authenticated
using (
  exists (
    select 1
    from public.dashboard_users
    where dashboard_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.dashboard_users
    where dashboard_users.user_id = auth.uid()
  )
);

drop policy if exists "dashboard access dashboard_visits" on public.dashboard_visits;
create policy "dashboard access dashboard_visits"
on public.dashboard_visits
for all
to authenticated
using (
  exists (
    select 1
    from public.dashboard_users
    where dashboard_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.dashboard_users
    where dashboard_users.user_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public)
values ('property-media', 'property-media', true)
on conflict (id) do nothing;

drop policy if exists "dashboard access property media objects" on storage.objects;
create policy "dashboard access property media objects"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'property-media'
  and exists (
    select 1
    from public.dashboard_users
    where dashboard_users.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'property-media'
  and exists (
    select 1
    from public.dashboard_users
    where dashboard_users.user_id = auth.uid()
  )
);

-- Tasks
create table if not exists public.dashboard_tasks (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null check (length(btrim(title)) between 1 and 200),
  due_date date not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  client_id text references public.dashboard_clients(id) on delete set null,
  lead_id text references public.owner_leads(id) on delete set null,
  property_id text references public.dashboard_properties(id) on delete set null
);
create index if not exists dashboard_tasks_status_due_idx on public.dashboard_tasks(status, due_date);
drop trigger if exists set_dashboard_tasks_updated_at on public.dashboard_tasks;
create trigger set_dashboard_tasks_updated_at before update on public.dashboard_tasks
for each row execute function public.set_updated_at();
alter table public.dashboard_tasks enable row level security;
grant select, insert, update, delete on public.dashboard_tasks to authenticated;
drop policy if exists "dashboard read tasks" on public.dashboard_tasks;
create policy "dashboard read tasks" on public.dashboard_tasks for select to authenticated
using (exists (select 1 from public.dashboard_users where user_id = auth.uid()));
drop policy if exists "dashboard write tasks" on public.dashboard_tasks;
create policy "dashboard write tasks" on public.dashboard_tasks for all to authenticated
using (exists (select 1 from public.dashboard_users where user_id = auth.uid() and role in ('admin', 'editor')))
with check (exists (select 1 from public.dashboard_users where user_id = auth.uid() and role in ('admin', 'editor')));
-- New search criteria; existing client profiles retain unrestricted defaults.
alter table public.dashboard_clients
  add column if not exists min_bathrooms integer not null default 0 check (min_bathrooms >= 0),
  add column if not exists required_extras jsonb not null default '[]'::jsonb check (jsonb_typeof(required_extras) = 'array');
-- Property extras use the existing portal_data JSON object (extras array).
-- Existing records retain EUR, the previously used currency.
alter table public.dashboard_properties add column if not exists currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$');
alter table public.dashboard_clients add column if not exists currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$');
-- One canonical price: price_value. Display is derived by the app using currency.
-- Atomic migration: unknown or conflicting amounts abort BEFORE dropping anything.
lock table public.dashboard_properties in access exclusive mode;
do $$
declare
  item record;
  raw text;
  normalized text;
  amount numeric;
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'dashboard_properties' and column_name = 'price_label') then
    return;
  end if;
  for item in execute 'select id, reference, price_value, price_label from public.dashboard_properties' loop
    raw := regexp_replace(coalesce(item.price_label, ''), '[[:space:]' || chr(160) || '€]', '', 'g');
    if raw = '' then continue; end if;
    if raw ~ '^[0-9]{1,3}([.,][0-9]{3})+([.,][0-9]{1,2})?$' then
      if raw ~ '[.,][0-9]{1,2}$' then
        normalized := regexp_replace(regexp_replace(raw, '[.,][0-9]{1,2}$', ''), '[.,]', '', 'g') || '.' || substring(raw from '[.,]([0-9]{1,2})$');
      else
        normalized := regexp_replace(raw, '[.,]', '', 'g');
      end if;
    elsif raw ~ '^[0-9]+([.,][0-9]{1,2})?$' then
      normalized := replace(raw, ',', '.');
    else
      raise exception 'Preço não reconhecido no imóvel %. Revise antes de migrar: %', item.reference, item.price_label;
    end if;
    amount := normalized::numeric;
    if item.price_value > 0 and item.price_value <> amount then
      raise exception 'Preços divergentes no imóvel %: numérico %, visível %. Revise antes de migrar.', item.reference, item.price_value, item.price_label;
    end if;
    update public.dashboard_properties set price_value = amount where id = item.id and (price_value is null or price_value = 0);
  end loop;
  alter table public.dashboard_properties drop column price_label;
end $$;

-- CRM international: language, private addresses, off-market and invoices.
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
grant select,insert,delete on public.dashboard_invoices to authenticated;
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
drop policy if exists "CRM invoice delete" on public.dashboard_invoices;
create policy "CRM invoice delete" on public.dashboard_invoices for delete to authenticated
using (exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in ('admin','editor')));
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


-- Security baseline (also available as incremental migration).
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


create index if not exists dashboard_properties_photos_gin on public.dashboard_properties using gin(photos jsonb_path_ops);
create or replace function public.is_published_property_photo(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.dashboard_properties p
 where p.status in ('active','closed') and not p.off_market
 and (p.photos @> jsonb_build_array(jsonb_build_object('path',object_name))
 or p.photos @> jsonb_build_array(jsonb_build_object('thumbnailPath',object_name))))
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


-- Public form submissions are mediated by the protected Pages Function.
drop policy if exists "public insert owner_leads" on public.owner_leads;
revoke insert on public.owner_leads from anon, authenticated;
commit;

-- Optional property copy assistant; authenticated editors only.
begin;
create table if not exists public.property_ai_usage (
 user_id uuid primary key references auth.users(id) on delete cascade,
 window_start timestamptz not null,
 calls integer not null
);
alter table public.property_ai_usage enable row level security;
revoke all on public.property_ai_usage from public, anon, authenticated;
create or replace function public.consume_property_ai_quota() returns boolean
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
 if auth.uid() is null or not exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in ('admin','editor')) then
  raise insufficient_privilege;
 end if;
 insert into public.property_ai_usage as u(user_id,window_start,calls)
 values(auth.uid(),date_trunc('hour',now()),1)
 on conflict(user_id) do update set
 calls=case when u.window_start=date_trunc('hour',now()) then u.calls+1 else 1 end,
 window_start=date_trunc('hour',now()) returning calls into n;
 return n<=20;
end $$;
revoke all on function public.consume_property_ai_quota() from public,anon;
grant execute on function public.consume_property_ai_quota() to authenticated;
commit;

-- DEV first. Existing references remain unchanged. No existing duplicate listing is deleted.
begin;
alter table public.property_private add column if not exists owner_client_id text references public.dashboard_clients(id) on delete set null;
create sequence if not exists public.property_kh_reference_seq start with 115;
select setval('public.property_kh_reference_seq',greatest(115,(select last_value + case when is_called then 1 else 0 end from public.property_kh_reference_seq),coalesce((select max(substring(reference from 3)::bigint)+1 from public.dashboard_properties where reference ~ '^KH[0-9]{4,}$'),115)),false);
create or replace function public.assign_dashboard_property_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare n text;
begin
 if new.id is null or btrim(new.id)='' then new.id:='property-'||gen_random_uuid()::text; end if;
 if new.reference is null or btrim(new.reference)='' then
  loop
   n:=nextval('public.property_kh_reference_seq')::text;
   new.reference:='KH'||lpad(n,greatest(4,length(n)),'0');
   exit when not exists(select 1 from public.dashboard_properties where lower(reference)=lower(new.reference));
  end loop;
 else new.reference:=btrim(new.reference);
 end if;
 return new;
end $$;
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
   operation=current_row.operation,destination=current_row.destination,type=current_row.type,
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
commit;


-- Four numbered homepage slots; the unique index also protects concurrent saves.
alter table public.dashboard_properties drop constraint if exists dashboard_properties_featured_slot_valid;
alter table public.dashboard_properties add constraint dashboard_properties_featured_slot_valid
 check (portal_data->>'featuredSlot' is null or portal_data->>'featuredSlot' in ('1','2','3','4'));
create unique index if not exists dashboard_properties_featured_slot_unique
 on public.dashboard_properties ((portal_data->>'featuredSlot'))
 where status = 'active' and not off_market and portal_data->>'featuredSlot' is not null;

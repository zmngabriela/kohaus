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
-- Track receipts separately; issued invoice snapshots remain immutable.
alter table public.dashboard_invoices
 add column if not exists payment_status text
 check (payment_status in ('pending','paid'));
grant update(payment_status) on public.dashboard_invoices to authenticated;
drop policy if exists "CRM invoice payment" on public.dashboard_invoices;
create policy "CRM invoice payment" on public.dashboard_invoices
 for update to authenticated
 using (exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in ('admin','editor')))
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

-- Separate country from the existing municipality/city field.
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

-- Append-only business events; relationship IDs survive deletion of source records.
create table if not exists public.dashboard_activity_events (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 actor_id uuid,
 source_type text not null check (source_type in ('visit','task')),
 source_id text not null,
 action text not null check (action in ('created','updated','deleted','snapshot')),
 client_ids text[] not null default '{}',
 property_ids text[] not null default '{}',
 lead_ids text[] not null default '{}',
 before_data jsonb,
 after_data jsonb
);
create index if not exists activity_clients_idx on public.dashboard_activity_events using gin(client_ids);
create index if not exists activity_properties_idx on public.dashboard_activity_events using gin(property_ids);
alter table public.dashboard_activity_events enable row level security;
revoke all on public.dashboard_activity_events from anon, authenticated;
grant select on public.dashboard_activity_events to authenticated;
drop policy if exists "CRM read activity events" on public.dashboard_activity_events;
create policy "CRM read activity events" on public.dashboard_activity_events for select to authenticated
using (exists(select 1 from public.dashboard_users where user_id=auth.uid()));
create or replace function public.capture_commercial_activity() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare
 b jsonb; a jsonb; pids text[]; cids text[]; lids text[];
begin
 if TG_OP <> 'INSERT' then b=to_jsonb(old)-'history'-'updated_at'; end if;
 if TG_OP <> 'DELETE' then a=to_jsonb(new)-'history'-'updated_at'; end if;
 if TG_OP='UPDATE' and a=b then return new; end if;
 select coalesce(array_agg(distinct v), '{}') into pids from unnest(array[b->>'property_id',a->>'property_id']) v where nullif(v,'') is not null;
 select coalesce(array_agg(distinct v), '{}') into cids from (
 select unnest(array[b->>'client_id',a->>'client_id']) v
 union select owner_client_id from public.property_private where property_id=any(pids)
 ) ids where nullif(v,'') is not null;
 select coalesce(array_agg(distinct v), '{}') into lids from unnest(array[b->>'lead_id',a->>'lead_id']) v where nullif(v,'') is not null;
 insert into public.dashboard_activity_events(actor_id,source_type,source_id,action,client_ids,property_ids,lead_ids,before_data,after_data)
 values(auth.uid(),case TG_TABLE_NAME when 'dashboard_visits' then 'visit' else 'task' end,
 coalesce(a->>'id',b->>'id'),case TG_OP when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end,cids,pids,lids,b,a);
 if TG_OP='DELETE' then return old; end if;
 return new;
end $$;
revoke all on function public.capture_commercial_activity() from public,anon,authenticated;
drop trigger if exists capture_visit_activity on public.dashboard_visits;
create trigger capture_visit_activity after insert or update or delete on public.dashboard_visits
for each row execute function public.capture_commercial_activity();
drop trigger if exists capture_task_activity on public.dashboard_tasks;
create trigger capture_task_activity after insert or update or delete on public.dashboard_tasks
for each row execute function public.capture_commercial_activity();

-- Baseline existing records without pretending their earlier changes were captured.
insert into public.dashboard_activity_events(source_type,source_id,action,client_ids,property_ids,lead_ids,after_data)
select source_type, row_data->>'id', 'snapshot',
 array(select distinct x from unnest(array[row_data->>'client_id',p.owner_client_id]) x where nullif(x,'') is not null),
 array_remove(array[nullif(row_data->>'property_id','')],null),
 array_remove(array[nullif(row_data->>'lead_id','')],null), row_data
from (
 select 'visit'::text source_type,to_jsonb(v)-'history'-'updated_at' row_data from public.dashboard_visits v
 union all select 'task',to_jsonb(t)-'updated_at' from public.dashboard_tasks t
) sources left join public.property_private p on p.property_id=row_data->>'property_id'
where not exists(select 1 from public.dashboard_activity_events e where e.source_type=sources.source_type and e.source_id=row_data->>'id');


-- CRM inbox / WhatsApp (202611220100)
-- Private CRM inbox. Run after 202611211200_commercial_activity.sql.
-- No credentials or customer messages are embedded in this migration.
begin;
create table if not exists public.crm_conversations (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 channel text not null check(channel in ('whatsapp','form','email')),
 external_key text unique,
 subject text not null check(length(btrim(subject)) between 1 and 240),
 contact_name text not null default '',
 contact_phone text not null default '',
 contact_email text not null default '',
 status text not null default 'open' check(status in ('open','waiting','resolved')),
 priority text not null default 'normal' check(priority in ('normal','high')),
 assigned_to uuid references public.dashboard_users(user_id) on delete set null,
 client_id text references public.dashboard_clients(id) on delete set null,
 lead_id text references public.owner_leads(id) on delete set null,
 property_id text references public.dashboard_properties(id) on delete set null,
 visit_id text references public.dashboard_visits(id) on delete set null,
 last_inbound_at timestamptz,
 last_message_at timestamptz,
 first_response_at timestamptz,
 resolved_at timestamptz,
 created_by uuid
);
create unique index if not exists crm_whatsapp_recipient on public.crm_conversations ((regexp_replace(contact_phone,'[^0-9]','','g'))) where channel='whatsapp';
create index if not exists crm_conversations_recent on public.crm_conversations(last_message_at desc nulls last);
create index if not exists crm_conversations_client on public.crm_conversations(client_id);
create index if not exists crm_conversations_property on public.crm_conversations(property_id);
create table if not exists public.crm_messages (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.crm_conversations(id),
 created_at timestamptz not null default now(),
 actor_id uuid,
 direction text not null check(direction in ('inbound','outbound','internal')),
 kind text not null default 'text' check(kind in ('text','template','image','audio','video','document','sticker','unsupported','note')),
 body text not null default '' check(length(body)<=10000),
 status text not null default 'received' check(status in ('received','note','draft','sending','sent','delivered','read','failed','uncertain')),
 provider_id text unique,
 media_id text,
 media_name text,
 error_code text,
 template_data jsonb,
 provider_at timestamptz,
 delivered_at timestamptz,
 read_at timestamptz
);
create index if not exists crm_messages_thread on public.crm_messages(conversation_id,created_at,id);
create table if not exists public.crm_conversation_reads (
 conversation_id uuid not null references public.crm_conversations(id),
 user_id uuid not null,
 read_at timestamptz not null default now(),
 primary key(conversation_id,user_id)
);
-- Append-only events carry historical relationships even after a ticket is re-linked.
create table if not exists public.crm_inbox_events (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 conversation_id uuid not null references public.crm_conversations(id),
 message_id uuid references public.crm_messages(id),
 actor_id uuid,
 action text not null,
 client_ids text[] not null default '{}',
 property_ids text[] not null default '{}',
 lead_ids text[] not null default '{}',
 before_data jsonb,
 after_data jsonb
);
create index if not exists inbox_events_clients on public.crm_inbox_events using gin(client_ids);
create index if not exists inbox_events_properties on public.crm_inbox_events using gin(property_ids);
create index if not exists inbox_events_thread on public.crm_inbox_events(conversation_id,created_at);

create or replace function public.crm_can_edit() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in ('admin','editor'));
$$;
revoke all on function public.crm_can_edit() from public;
grant execute on function public.crm_can_edit() to authenticated;

do $$ declare t text; begin
 foreach t in array array['crm_conversations','crm_messages','crm_conversation_reads','crm_inbox_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('drop policy if exists "CRM inbox read" on public.%I',t);
 execute format('create policy "CRM inbox read" on public.%I for select to authenticated using (exists(select 1 from public.dashboard_users where user_id=auth.uid()))',t);
 end loop;
end $$;
grant insert(conversation_id,user_id,read_at),update(read_at) on public.crm_conversation_reads to authenticated;
drop policy if exists "Own inbox read marker" on public.crm_conversation_reads;
create policy "Own inbox read marker" on public.crm_conversation_reads for all to authenticated
using(user_id=auth.uid() and exists(select 1 from public.dashboard_users where user_id=auth.uid()))
with check(user_id=auth.uid() and exists(select 1 from public.dashboard_users where user_id=auth.uid()));

create or replace function public.crm_record_event() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare b jsonb; a jsonb; c public.crm_conversations; pids text[]; cids text[]; lids text[]; mid uuid;
begin
 if TG_TABLE_NAME='crm_conversations' then
  a=to_jsonb(new)-'updated_at'-'last_message_at'-'last_inbound_at'-'first_response_at';
  if TG_OP='UPDATE' then b=to_jsonb(old)-'updated_at'-'last_message_at'-'last_inbound_at'-'first_response_at'; end if;
  if a=b then return new; end if;
  c=new;
 else
  select * into c from public.crm_conversations where id=new.conversation_id;
  a=jsonb_build_object('status',new.status,'direction',new.direction,'kind',new.kind);
  if TG_OP='UPDATE' then
   b=jsonb_build_object('status',old.status,'direction',old.direction,'kind',old.kind);
   if a=b then return new; end if;
  end if;
  mid=new.id;
 end if;
 select coalesce(array_agg(distinct x),'{}') into pids from (select unnest(array[c.property_id,b->>'property_id',a->>'property_id']) x union select property_id from public.dashboard_visits where id=any(array[c.visit_id,b->>'visit_id',a->>'visit_id'])) ids where nullif(x,'') is not null;
 select coalesce(array_agg(distinct x),'{}') into cids from (
  select unnest(array[c.client_id,b->>'client_id',a->>'client_id']) x
  union select owner_client_id from public.property_private where property_id=any(pids)
  union select client_id from public.dashboard_visits where id=any(array[c.visit_id,b->>'visit_id',a->>'visit_id'])
 ) ids where nullif(x,'') is not null;
 select coalesce(array_agg(distinct x),'{}') into lids from (select unnest(array[c.lead_id,b->>'lead_id',a->>'lead_id']) x union select lead_id from public.dashboard_visits where id=any(array[c.visit_id,b->>'visit_id',a->>'visit_id'])) ids where nullif(x,'') is not null;
 insert into public.crm_inbox_events(conversation_id,message_id,actor_id,action,client_ids,property_ids,lead_ids,before_data,after_data)
 values(c.id,mid,coalesce(auth.uid(),case when TG_TABLE_NAME='crm_messages' then (to_jsonb(new)->>'actor_id')::uuid end),
 (case when mid is null then 'ticket' else 'message' end)||'.'||lower(TG_OP),cids,pids,lids,b,a);
 return new;
end $$;
revoke all on function public.crm_record_event() from public,anon,authenticated;
drop trigger if exists crm_ticket_audit on public.crm_conversations;
create trigger crm_ticket_audit after insert or update on public.crm_conversations for each row execute function public.crm_record_event();
drop trigger if exists crm_message_audit on public.crm_messages;
create trigger crm_message_audit after insert or update on public.crm_messages for each row execute function public.crm_record_event();

-- Mark only the caller's read state; clients cannot forge another user's marker.
create or replace function public.crm_mark_read(p_ticket uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from public.dashboard_users where user_id=auth.uid()) then raise exception 'Forbidden' using errcode='42501'; end if;
 insert into public.crm_conversation_reads(conversation_id,user_id,read_at) values(p_ticket,auth.uid(),now())
 on conflict(conversation_id,user_id) do update set read_at=excluded.read_at;
end $$;
revoke all on function public.crm_mark_read(uuid) from public;
grant execute on function public.crm_mark_read(uuid) to authenticated;

-- Authenticated writes go through narrow RPCs. Delivery state is server-owned.
create or replace function public.crm_save_ticket(p_id uuid,p_data jsonb) returns public.crm_conversations
language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.crm_conversations;
begin
 if not public.crm_can_edit() then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_id is null then
  if p_data->>'channel'='whatsapp' and coalesce(regexp_replace(p_data->>'contact_phone','[^0-9]','','g'),'') !~ '^[1-9][0-9]{6,14}$' then raise exception 'International phone required'; end if;
  insert into public.crm_conversations(channel,subject,contact_name,contact_phone,contact_email,created_by,client_id,lead_id,property_id,visit_id)
  values(p_data->>'channel',btrim(p_data->>'subject'),left(coalesce(p_data->>'contact_name',''),200),left(coalesce(p_data->>'contact_phone',''),40),left(coalesce(p_data->>'contact_email',''),254),auth.uid(),nullif(p_data->>'client_id',''),nullif(p_data->>'lead_id',''),nullif(p_data->>'property_id',''),nullif(p_data->>'visit_id','')) returning * into c;
  p_id=c.id;
 end if;
 update public.crm_conversations set
 subject=case when p_data ? 'subject' then btrim(p_data->>'subject') else subject end,
 status=coalesce(p_data->>'status',status),priority=coalesce(p_data->>'priority',priority),
 assigned_to=case when p_data ? 'assigned_to' then nullif(p_data->>'assigned_to','')::uuid else assigned_to end,
 client_id=case when p_data ? 'client_id' then nullif(p_data->>'client_id','') else client_id end,
 lead_id=case when p_data ? 'lead_id' then nullif(p_data->>'lead_id','') else lead_id end,
 property_id=case when p_data ? 'property_id' then nullif(p_data->>'property_id','') else property_id end,
 visit_id=case when p_data ? 'visit_id' then nullif(p_data->>'visit_id','') else visit_id end,
 resolved_at=case when p_data->>'status'='resolved' then coalesce(resolved_at,now()) when p_data->>'status' in ('open','waiting') then null else resolved_at end,
 updated_at=now()
 where id=p_id returning * into c;
 if c.id is null then raise exception 'Ticket not found'; end if;
 return c;
end $$;
revoke all on function public.crm_save_ticket(uuid,jsonb) from public;
grant execute on function public.crm_save_ticket(uuid,jsonb) to authenticated;

create or replace function public.crm_add_note(p_ticket uuid,p_body text,p_id uuid) returns public.crm_messages
language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.crm_messages;
begin
 if not public.crm_can_edit() then raise exception 'Forbidden' using errcode='42501'; end if;
 if length(btrim(p_body)) not between 1 and 10000 then raise exception 'Invalid note'; end if;
 insert into public.crm_messages(id,conversation_id,actor_id,direction,kind,body,status)
 values(p_id,p_ticket,auth.uid(),'internal','note',btrim(p_body),'note') on conflict(id) do nothing returning * into m;
 if m.id is null then select * into m from public.crm_messages where id=p_id and conversation_id=p_ticket and actor_id=auth.uid() and direction='internal' and body=btrim(p_body); end if;
 if m.id is null then raise exception 'Invalid idempotency key'; end if;
 return m;
end $$;
revoke all on function public.crm_add_note(uuid,text,uuid) from public;
grant execute on function public.crm_add_note(uuid,text,uuid) to authenticated;

-- Public form submissions become private tickets in the SAME transaction.
create or replace function public.crm_form_ticket() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare cid uuid;
begin
 insert into public.crm_conversations(channel,external_key,subject,contact_name,contact_phone,contact_email,lead_id,last_inbound_at,last_message_at)
 values('form','lead:'||new.id,left('KOHAUS · '||new.name||' '||new.surname,240),new.name||' '||new.surname,new.phone,new.email,new.id,new.created_at,new.created_at)
 on conflict(external_key) do nothing returning id into cid;
 if cid is not null then
 insert into public.crm_messages(conversation_id,created_at,direction,kind,body,status,provider_id)
 values(cid,new.created_at,'inbound','text',left(concat_ws(E'\n',new.comments,new.city,new.operation),10000),'received','lead:'||new.id);
 end if;
 return new;
end $$;
revoke all on function public.crm_form_ticket() from public,anon,authenticated;
drop trigger if exists crm_capture_form on public.owner_leads;
create trigger crm_capture_form after insert on public.owner_leads for each row execute function public.crm_form_ticket();

-- Existing form messages retain their submission dates; no past delivery is invented.
insert into public.crm_conversations(channel,external_key,subject,contact_name,contact_phone,contact_email,lead_id,last_inbound_at,last_message_at)
select 'form','lead:'||id,left('KOHAUS · '||name||' '||surname,240),name||' '||surname,phone,email,id,created_at,created_at from public.owner_leads
on conflict(external_key) do nothing;
insert into public.crm_messages(conversation_id,created_at,direction,kind,body,status,provider_id)
select c.id,l.created_at,'inbound','text',left(concat_ws(E'\n',l.comments,l.city,l.operation),10000),'received','lead:'||l.id
from public.owner_leads l join public.crm_conversations c on c.external_key='lead:'||l.id
on conflict(provider_id) do nothing;

-- Verified webhook writes only. Unique provider IDs make retries safe.
create or replace function public.crm_receive_whatsapp(p_message jsonb) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare cid uuid; linked text; linked_lead text; mid uuid; phone text=p_message->>'phone'; occurred timestamptz=(p_message->>'at')::timestamptz;
begin
 if phone !~ '^[1-9][0-9]{6,14}$' or nullif(p_message->>'provider_id','') is null then raise exception 'Invalid message'; end if;
 if exists(select 1 from public.crm_messages where provider_id=p_message->>'provider_id') then return null; end if;
 -- Match only exact international numbers; never guess country or merge ambiguous contacts.
 select min(id) into linked from public.dashboard_clients dc where regexp_replace(dc.phone,'[^0-9]','','g')=p_message->>'phone' having count(*)=1;
 select min(id) into linked_lead from public.owner_leads ol where regexp_replace(ol.phone,'[^0-9]','','g')=p_message->>'phone' having count(*)=1;
 insert into public.crm_conversations(channel,external_key,subject,contact_name,contact_phone,client_id,lead_id)
 values('whatsapp','wa:'||(p_message->>'phone_id')||':'||phone,coalesce(nullif(p_message->>'name',''),'WhatsApp · '||phone),coalesce(p_message->>'name',''),phone,linked,linked_lead)
 on conflict ((regexp_replace(contact_phone,'[^0-9]','','g'))) where channel='whatsapp' do update set external_key=excluded.external_key returning id into cid;
 insert into public.crm_messages(conversation_id,direction,kind,body,status,provider_id,media_id,media_name,provider_at)
 values(cid,'inbound',p_message->>'kind',left(coalesce(p_message->>'body',''),10000),'received',p_message->>'provider_id',p_message->>'media_id',left(p_message->>'media_name',240),occurred)
 on conflict(provider_id) do nothing returning id into mid;
 if mid is not null then
 update public.crm_conversations set last_inbound_at=greatest(last_inbound_at,occurred),last_message_at=greatest(last_message_at,occurred),status=case when occurred>=coalesce(resolved_at,'-infinity'::timestamptz) then 'open' else status end,resolved_at=case when occurred>=coalesce(resolved_at,'-infinity'::timestamptz) then null else resolved_at end,updated_at=now() where id=cid;
 end if;
 return mid;
end $$;
revoke all on function public.crm_receive_whatsapp(jsonb) from public,anon,authenticated;
grant execute on function public.crm_receive_whatsapp(jsonb) to service_role;

create or replace function public.crm_whatsapp_receipt(p_provider text,p_local uuid,p_status text,p_at timestamptz,p_error text default null) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_status not in ('sent','delivered','read','failed') then return; end if;
 update public.crm_messages set
 provider_id=coalesce(provider_id,p_provider),
 status=case when status='read' then status when status='delivered' and p_status<>'read' then status when status='sent' and p_status='failed' then p_status else p_status end,
 delivered_at=case when p_status in ('delivered','read') then coalesce(delivered_at,p_at) else delivered_at end,
 read_at=case when p_status='read' then coalesce(read_at,p_at) else read_at end,
 error_code=case when p_status='failed' then left(p_error,100) else error_code end
 where direction='outbound' and (provider_id=p_provider or (id=p_local and provider_id is null));
end $$;
revoke all on function public.crm_whatsapp_receipt(text,uuid,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.crm_whatsapp_receipt(text,uuid,text,timestamptz,text) to service_role;
-- Security-invoker view keeps every underlying RLS check active.
create or replace view public.crm_inbox with (security_invoker=true) as
select c.*,
 (select left(body,180) from public.crm_messages m where m.conversation_id=c.id order by m.created_at desc,m.id desc limit 1) last_body,
 (select count(*) from public.crm_messages m where m.conversation_id=c.id and m.direction='inbound' and m.created_at>coalesce((select r.read_at from public.crm_conversation_reads r where r.conversation_id=c.id and r.user_id=auth.uid()),'-infinity'::timestamptz)) unread_count
from public.crm_conversations c;
revoke all on public.crm_inbox from anon;
grant select on public.crm_inbox to authenticated;
commit;

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

create or replace function public.handle_dashboard_user_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.dashboard_users (user_id, email, display_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(new.email, ''), '@', 1),
      'KOHAUS Admin'
    ),
    'admin'
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    display_name = excluded.display_name,
    role = 'admin',
    updated_at = now();

  return new;
end;
$$;

create table if not exists public.dashboard_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null check (btrim(email) <> ''),
  display_name text not null default '',
  role text not null default 'admin' check (role in ('admin', 'editor', 'viewer'))
);

alter table public.dashboard_properties
add column if not exists portal_publications jsonb not null default '[]'::jsonb;

update public.dashboard_properties
set portal_publications = '[]'::jsonb
where portal_publications is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dashboard_properties_portal_publications_is_array'
      and conrelid = 'public.dashboard_properties'::regclass
  ) then
    alter table public.dashboard_properties
    add constraint dashboard_properties_portal_publications_is_array
    check (jsonb_typeof(portal_publications) = 'array');
  end if;
end;
$$;

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_dashboard_user_signup();

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

alter table public.dashboard_visits enable row level security;
alter table public.dashboard_users enable row level security;

drop policy if exists "dashboard users select own access" on public.dashboard_users;
create policy "dashboard users select own access"
on public.dashboard_users
for select
to authenticated
using (auth.uid() = user_id);

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

insert into public.dashboard_users (user_id, email, display_name, role)
select
  users.id,
  coalesce(users.email, ''),
  coalesce(
    nullif(users.raw_user_meta_data ->> 'display_name', ''),
    nullif(users.raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(users.email, ''), '@', 1),
    'KOHAUS Admin'
  ),
  'admin'
from auth.users as users
on conflict (user_id) do update
set
  email = excluded.email,
  display_name = excluded.display_name,
  role = 'admin',
  updated_at = now();

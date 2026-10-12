-- New search criteria; existing client profiles retain unrestricted defaults.
alter table public.dashboard_clients
  add column if not exists min_bathrooms integer not null default 0 check (min_bathrooms >= 0),
  add column if not exists required_extras jsonb not null default '[]'::jsonb check (jsonb_typeof(required_extras) = 'array');
-- Property extras use the existing portal_data JSON object (extras array).

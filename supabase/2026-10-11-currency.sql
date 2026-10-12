-- Existing records retain EUR, the previously used currency.
alter table public.dashboard_properties add column if not exists currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$');
alter table public.dashboard_clients add column if not exists currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$');

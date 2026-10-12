-- One canonical price: price_value. Display is derived by the app using currency.
-- Atomic migration: unknown or conflicting amounts abort BEFORE dropping anything.
begin;
alter table public.dashboard_properties add column if not exists currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$');
alter table public.dashboard_clients add column if not exists currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$');
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
commit;

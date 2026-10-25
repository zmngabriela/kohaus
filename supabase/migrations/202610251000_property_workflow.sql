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

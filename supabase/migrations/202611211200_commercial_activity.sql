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

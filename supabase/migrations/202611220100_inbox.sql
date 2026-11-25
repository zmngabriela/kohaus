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

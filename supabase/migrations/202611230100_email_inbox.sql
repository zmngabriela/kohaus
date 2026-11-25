-- Run after inbox migration. Credentials never enter SQL or browser storage.
begin;
alter table public.crm_conversations add column if not exists mailbox_email text;
create table if not exists public.crm_email_references (
 mailbox_email text not null,
 message_id text not null,
 conversation_id uuid not null references public.crm_conversations(id),
 primary key(mailbox_email,message_id)
);
alter table public.crm_email_references enable row level security;
revoke all on public.crm_email_references from public,anon,authenticated;
grant all on public.crm_email_references to service_role;
create or replace function public.crm_receive_email(p_message jsonb) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare cid uuid; mid uuid; linked text; linked_lead text; box text=p_message->>'mailbox'; sender text=lower(p_message->>'from'); occurred timestamptz=(p_message->>'at')::timestamptz;
begin
 if box is null or box not in ('hola@kohausrealestate.com','guilherme@kohausrealestate.com') or sender is null or sender !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or nullif(p_message->>'provider_id','') is null then raise exception 'Invalid email'; end if;
 perform pg_advisory_xact_lock(hashtextextended(box,0));
 if exists(select 1 from public.crm_messages where provider_id=p_message->>'provider_id') then return null; end if;
 -- Never join on subject alone. References must belong to this mailbox AND sender.
 select r.conversation_id into cid from public.crm_email_references r
 join public.crm_conversations c on c.id=r.conversation_id
 where r.mailbox_email=box and lower(c.contact_email)=sender and r.message_id in (select jsonb_array_elements_text(coalesce(p_message->'references','[]'::jsonb)))
 order by c.created_at desc limit 1;
 if cid is null then
  select min(id) into linked from public.dashboard_clients where lower(btrim(email))=sender having count(*)=1;
  select min(id) into linked_lead from public.owner_leads where lower(btrim(email))=sender having count(*)=1;
  insert into public.crm_conversations(channel,external_key,mailbox_email,subject,contact_name,contact_email,client_id,lead_id)
  values('email',p_message->>'provider_id',box,left(coalesce(nullif(p_message->>'subject',''),'E-mail'),240),left(coalesce(p_message->>'name',sender),200),sender,linked,linked_lead) returning id into cid;
 end if;
 insert into public.crm_messages(conversation_id,direction,kind,body,status,provider_id,provider_at)
 values(cid,'inbound','text',left(coalesce(p_message->>'body',''),10000),'received',p_message->>'provider_id',occurred) returning id into mid;
 if nullif(p_message->>'message_id','') is not null then
 insert into public.crm_email_references(mailbox_email,message_id,conversation_id) values(box,p_message->>'message_id',cid) on conflict do nothing;
 end if;
 update public.crm_conversations set last_inbound_at=greatest(last_inbound_at,occurred),last_message_at=greatest(last_message_at,occurred),status=case when occurred>=coalesce(resolved_at,'-infinity'::timestamptz) then 'open' else status end,resolved_at=case when occurred>=coalesce(resolved_at,'-infinity'::timestamptz) then null else resolved_at end,updated_at=now() where id=cid;
 return mid;
end $$;
revoke all on function public.crm_receive_email(jsonb) from public,anon,authenticated;
grant execute on function public.crm_receive_email(jsonb) to service_role;
-- Append the mailbox column after existing view columns to preserve view compatibility.
create or replace view public.crm_inbox with(security_invoker=true) as
select c.id,c.created_at,c.updated_at,c.channel,c.external_key,c.subject,c.contact_name,c.contact_phone,c.contact_email,c.status,c.priority,c.assigned_to,c.client_id,c.lead_id,c.property_id,c.visit_id,c.last_inbound_at,c.last_message_at,c.first_response_at,c.resolved_at,c.created_by,
 (select left(body,180) from public.crm_messages m where m.conversation_id=c.id order by m.created_at desc,m.id desc limit 1) last_body,
 (select count(*) from public.crm_messages m where m.conversation_id=c.id and m.direction='inbound' and m.created_at>coalesce((select r.read_at from public.crm_conversation_reads r where r.conversation_id=c.id and r.user_id=auth.uid()),'-infinity'::timestamptz)) unread_count,c.mailbox_email
from public.crm_conversations c;
commit;

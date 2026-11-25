begin;
create or replace function public.crm_import_sent_email(p_message jsonb) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare cid uuid; mid uuid; linked text; linked_lead text; box text=p_message->>'mailbox'; recipient text=lower(p_message->>'from'); occurred timestamptz=(p_message->>'at')::timestamptz;
begin
 if box is null or box not in ('hola@kohausrealestate.com','guilherme@kohausrealestate.com') or recipient is null or recipient !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or nullif(p_message->>'provider_id','') is null then raise exception 'Invalid email'; end if;
 perform pg_advisory_xact_lock(hashtextextended(box,0));
 select id into mid from public.crm_email_outbox where mailbox_email=box and message_id=p_message->>'message_id';
 if mid is not null then
  update public.crm_messages set status='sent' where id=mid and status in ('sending','uncertain');
  return mid;
 end if;
 if exists(select 1 from public.crm_messages where provider_id=p_message->>'provider_id') then return null; end if;
 select r.conversation_id into cid from public.crm_email_references r join public.crm_conversations c on c.id=r.conversation_id
 where r.mailbox_email=box and lower(c.contact_email)=recipient and r.message_id in(select jsonb_array_elements_text(coalesce(p_message->'references','[]'::jsonb))) order by r.created_at desc limit 1;
 if cid is null then
  select min(id) into linked from public.dashboard_clients where lower(btrim(email))=recipient having count(*)=1;
  select min(id) into linked_lead from public.owner_leads where lower(btrim(email))=recipient having count(*)=1;
  insert into public.crm_conversations(channel,external_key,mailbox_email,subject,contact_name,contact_email,client_id,lead_id)
  values('email',p_message->>'provider_id',box,left(coalesce(nullif(p_message->>'subject',''),'E-mail'),240),left(coalesce(p_message->>'name',recipient),200),recipient,linked,linked_lead) returning id into cid;
 end if;
 insert into public.crm_messages(conversation_id,direction,kind,body,status,provider_id,provider_at)
 values(cid,'outbound','text',left(coalesce(p_message->>'body',''),10000),'sent',p_message->>'provider_id',occurred) returning id into mid;
 if nullif(p_message->>'message_id','') is not null then
 insert into public.crm_email_references(mailbox_email,message_id,conversation_id) values(box,p_message->>'message_id',cid) on conflict do nothing;
 end if;
 update public.crm_conversations set last_message_at=greatest(last_message_at,occurred),first_response_at=coalesce(first_response_at,occurred),updated_at=now() where id=cid;
 return mid;
end $$;
revoke all on function public.crm_import_sent_email(jsonb) from public,anon,authenticated;
grant execute on function public.crm_import_sent_email(jsonb) to service_role;
commit;

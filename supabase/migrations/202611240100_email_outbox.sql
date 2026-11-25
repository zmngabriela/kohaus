-- Server-only SMTP reservation. The API authenticates the actor; this RPC checks membership again.
begin;
alter table public.crm_email_references add column if not exists created_at timestamptz not null default now();
create table if not exists public.crm_email_outbox (
 id uuid primary key references public.crm_messages(id),
 mailbox_email text not null,
 recipient text not null,
 subject text not null,
 message_id text not null unique,
 references_ids text[] not null default '{}',
 created_at timestamptz not null default now()
);
alter table public.crm_email_outbox enable row level security;
revoke all on public.crm_email_outbox from public,anon,authenticated;
grant all on public.crm_email_outbox to service_role;
create or replace function public.crm_reserve_email(p_actor uuid,p_ticket uuid,p_id uuid,p_body text,p_mailbox text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.crm_conversations; m public.crm_messages; o public.crm_email_outbox; refs text[];
begin
 if not exists(select 1 from public.dashboard_users where user_id=p_actor and role in ('admin','editor')) then raise exception 'Forbidden'; end if;
 if p_id is null or p_body is null or length(btrim(p_body)) not between 1 and 10000 then raise exception 'Invalid body'; end if;
 if p_mailbox is null or p_mailbox not in ('hola@kohausrealestate.com','guilherme@kohausrealestate.com') then raise exception 'Invalid mailbox'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_mailbox,0));
 select * into m from public.crm_messages where id=p_id;
 if found then
  if m.conversation_id<>p_ticket or m.actor_id is distinct from p_actor or m.body<>btrim(p_body) or not exists(select 1 from public.crm_email_outbox where id=p_id and mailbox_email=p_mailbox) then raise exception 'Idempotency conflict'; end if;
  return jsonb_build_object('replayed',true,'status',m.status);
 end if;
 select * into t from public.crm_conversations where id=p_ticket for update;
 if not found or t.channel not in ('email','form') or t.contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid recipient'; end if;
 if t.mailbox_email is not null and t.mailbox_email<>p_mailbox then raise exception 'Wrong mailbox'; end if;
 -- Conservative shared limit, including failed/uncertain attempts. Not an allowance for campaigns.
 if (select count(*) from public.crm_email_outbox where mailbox_email=p_mailbox and created_at>now()-interval '1 hour')>=20 then raise exception 'Hourly limit'; end if;
 select coalesce(array_agg(message_id order by created_at),'{}') into refs from (select message_id,created_at from public.crm_email_references where conversation_id=p_ticket and mailbox_email=p_mailbox order by created_at desc limit 30) r;
 insert into public.crm_messages(id,conversation_id,actor_id,direction,kind,body,status)
 values(p_id,p_ticket,p_actor,'outbound','text',btrim(p_body),'sending');
 insert into public.crm_email_outbox(id,mailbox_email,recipient,subject,message_id,references_ids)
 values(p_id,p_mailbox,t.contact_email,case when t.subject ~* '^re:' then t.subject else 'Re: '||t.subject end,'<'||p_id||'@kohausrealestate.com>',refs) returning * into o;
 insert into public.crm_email_references(mailbox_email,message_id,conversation_id) values(p_mailbox,o.message_id,p_ticket);
 update public.crm_conversations set mailbox_email=p_mailbox,updated_at=now() where id=p_ticket;
 return to_jsonb(o)||jsonb_build_object('body',btrim(p_body),'replayed',false);
end $$;
revoke all on function public.crm_reserve_email(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.crm_reserve_email(uuid,uuid,uuid,text,text) to service_role;
create or replace function public.crm_finish_email(p_id uuid,p_status text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare cid uuid;
begin
 if p_status not in ('sent','failed','uncertain') then raise exception 'Invalid status'; end if;
 update public.crm_messages set status=p_status where id=p_id and status='sending' and exists(select 1 from public.crm_email_outbox where id=p_id) returning conversation_id into cid;
 if cid is not null and p_status='sent' then
 update public.crm_conversations set first_response_at=coalesce(first_response_at,now()),last_message_at=now(),updated_at=now() where id=cid;
 end if;
end $$;
revoke all on function public.crm_finish_email(uuid,text) from public,anon,authenticated;
grant execute on function public.crm_finish_email(uuid,text) to service_role;
commit;

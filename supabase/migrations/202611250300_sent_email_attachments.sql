begin;
create table if not exists public.crm_sent_email_files (
  message_id uuid primary key references public.crm_messages(id) on delete cascade,
  files jsonb not null
);
alter table public.crm_sent_email_files enable row level security;
revoke all on public.crm_sent_email_files from public, anon, authenticated;
grant select, insert on public.crm_sent_email_files to service_role;

create or replace function public.crm_store_sent_email_files(p_id uuid, p_files jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.crm_email_outbox where id = p_id) then
    raise exception 'Email reservation required';
  end if;
  insert into public.crm_sent_email_files(message_id, files) values (p_id, p_files);
  update public.crm_messages
    set email_attachments = (
      select jsonb_agg(jsonb_build_object('index', ord-1, 'name', file->>'name', 'size', (file->>'size')::integer) order by ord)
      from jsonb_array_elements(p_files) with ordinality as parts(file, ord)
    )
    where id = p_id;
end;
$$;
revoke all on function public.crm_store_sent_email_files(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.crm_store_sent_email_files(uuid,jsonb) to service_role;
commit;

begin;
create table public.crm_email_sync_cursor (
  mailbox_email text not null,
  folder text not null,
  validity text not null,
  uid bigint not null check (uid > 0),
  primary key (mailbox_email, folder)
);
alter table public.crm_email_sync_cursor enable row level security;
revoke all on public.crm_email_sync_cursor from public, anon, authenticated;
grant select, insert, update on public.crm_email_sync_cursor to service_role;

create function public.crm_advance_email_cursor(p_mailbox text, p_folder text, p_validity text, p_uid bigint)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.crm_email_sync_cursor as c (mailbox_email, folder, validity, uid)
  values (p_mailbox, p_folder, p_validity, p_uid)
  on conflict (mailbox_email, folder) do update set uid = greatest(c.uid, excluded.uid)
  where c.validity = excluded.validity;
  if not found then raise exception 'Mailbox UID validity changed'; end if;
end;
$$;
revoke all on function public.crm_advance_email_cursor(text,text,text,bigint) from public, anon, authenticated;
grant execute on function public.crm_advance_email_cursor(text,text,text,bigint) to service_role;
commit;

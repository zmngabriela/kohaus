alter table public.crm_messages
  add column if not exists email_attachments jsonb not null default '[]';
create table if not exists public.crm_email_attachment_sources (
  message_id uuid primary key references public.crm_messages(id) on delete cascade,
  mailbox_email text not null,
  folder text not null,
  uid_validity text not null,
  uid bigint not null
);
alter table public.crm_email_attachment_sources enable row level security;
revoke all on public.crm_email_attachment_sources from public, anon, authenticated;
grant select, insert, update on public.crm_email_attachment_sources to service_role;

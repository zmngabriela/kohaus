begin;
create table if not exists public.property_ai_usage (
 user_id uuid primary key references auth.users(id) on delete cascade,
 window_start timestamptz not null,
 calls integer not null
);
alter table public.property_ai_usage enable row level security;
revoke all on public.property_ai_usage from public, anon, authenticated;
create or replace function public.consume_property_ai_quota() returns boolean
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
 if auth.uid() is null or not exists(select 1 from public.dashboard_users where user_id=auth.uid() and role in ('admin','editor')) then
  raise insufficient_privilege;
 end if;
 insert into public.property_ai_usage as u(user_id,window_start,calls)
 values(auth.uid(),date_trunc('hour',now()),1)
 on conflict(user_id) do update set
 calls=case when u.window_start=date_trunc('hour',now()) then u.calls+1 else 1 end,
 window_start=date_trunc('hour',now()) returning calls into n;
 return n<=20;
end $$;
revoke all on function public.consume_property_ai_quota() from public,anon;
grant execute on function public.consume_property_ai_quota() to authenticated;
commit;

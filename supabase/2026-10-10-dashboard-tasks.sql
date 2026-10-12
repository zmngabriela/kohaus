-- Apply once through the authorized Supabase SQL editor after the base schema.
create table if not exists public.dashboard_tasks (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null check (length(btrim(title)) between 1 and 200),
  due_date date not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  client_id text references public.dashboard_clients(id) on delete set null,
  lead_id text references public.owner_leads(id) on delete set null,
  property_id text references public.dashboard_properties(id) on delete set null
);
create index if not exists dashboard_tasks_status_due_idx on public.dashboard_tasks(status, due_date);
drop trigger if exists set_dashboard_tasks_updated_at on public.dashboard_tasks;
create trigger set_dashboard_tasks_updated_at before update on public.dashboard_tasks
for each row execute function public.set_updated_at();
alter table public.dashboard_tasks enable row level security;
grant select, insert, update, delete on public.dashboard_tasks to authenticated;
drop policy if exists "dashboard read tasks" on public.dashboard_tasks;
create policy "dashboard read tasks" on public.dashboard_tasks for select to authenticated
using (exists (select 1 from public.dashboard_users where user_id = auth.uid()));
drop policy if exists "dashboard write tasks" on public.dashboard_tasks;
create policy "dashboard write tasks" on public.dashboard_tasks for all to authenticated
using (exists (select 1 from public.dashboard_users where user_id = auth.uid() and role in ('admin', 'editor')))
with check (exists (select 1 from public.dashboard_users where user_id = auth.uid() and role in ('admin', 'editor')));

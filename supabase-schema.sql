create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  client text not null,
  option_name text,
  extra_options text,
  status text not null default '입금 대기' check (status in ('입금 대기', '결제 완료', '디자인', '디자인 컨펌', '이식', '이식 컨펌', '완료')),
  start_date date,
  due_date date,
  price integer not null default 0,
  designer_fee integer not null default 0,
  designer_paid boolean not null default false,
  notes text,
  material_url text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

drop policy if exists "tasks select authenticated" on public.tasks;
drop policy if exists "tasks insert admin" on public.tasks;
drop policy if exists "tasks update admin" on public.tasks;
drop policy if exists "tasks delete admin" on public.tasks;
drop policy if exists "tasks select public" on public.tasks;
drop policy if exists "tasks insert public" on public.tasks;
drop policy if exists "tasks update public" on public.tasks;
drop policy if exists "tasks delete public" on public.tasks;

create policy "tasks select public"
on public.tasks for select
to anon, authenticated
using (true);

create policy "tasks insert public"
on public.tasks for insert
to anon, authenticated
with check (true);

create policy "tasks update public"
on public.tasks for update
to anon, authenticated
using (true)
with check (true);

create policy "tasks delete public"
on public.tasks for delete
to anon, authenticated
using (true);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

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
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "profiles select own or admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles insert own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "profiles update admin"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "tasks select authenticated"
on public.tasks for select
to authenticated
using (true);

create policy "tasks insert admin"
on public.tasks for insert
to authenticated
with check (public.is_admin());

create policy "tasks update admin"
on public.tasks for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "tasks delete admin"
on public.tasks for delete
to authenticated
using (public.is_admin());

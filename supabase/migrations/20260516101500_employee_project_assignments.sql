create table if not exists public.employee_project_assignments (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  employee_id uuid not null references public.employees(id) on delete cascade,
  client_name text not null,
  project_name text not null,
  role_name text,
  bill_rate numeric(10,2),
  start_date date,
  end_date date,
  is_default boolean not null default false,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists employee_project_assignments_entity_idx
  on public.employee_project_assignments(entity_id, employee_id)
  where deleted_at is null;

create unique index if not exists employee_project_assignments_default_idx
  on public.employee_project_assignments(employee_id)
  where is_default = true and deleted_at is null;

drop trigger if exists employee_project_assignments_updated_at on public.employee_project_assignments;
create trigger employee_project_assignments_updated_at
before update on public.employee_project_assignments
for each row execute function public.set_updated_at();

alter table public.employee_project_assignments enable row level security;

drop policy if exists "employee_project_assignments entity read" on public.employee_project_assignments;
create policy "employee_project_assignments entity read" on public.employee_project_assignments
for select using (public.is_entity_member(entity_id));

drop policy if exists "employee_project_assignments entity insert" on public.employee_project_assignments;
create policy "employee_project_assignments entity insert" on public.employee_project_assignments
for insert with check (public.is_entity_member(entity_id));

drop policy if exists "employee_project_assignments entity update" on public.employee_project_assignments;
create policy "employee_project_assignments entity update" on public.employee_project_assignments
for update using (public.is_entity_member(entity_id)) with check (public.is_entity_member(entity_id));

insert into public.permissions (code, description)
values ('project_assignment:manage:entity', 'Assign client projects to employees for time capture')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role, permission_id)
select role_name::public.app_role, p.id
from public.permissions p
cross join (values ('super_admin'), ('admin'), ('company_admin'), ('accounts_manager')) roles(role_name)
where p.code = 'project_assignment:manage:entity'
on conflict do nothing;

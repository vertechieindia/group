alter table public.employee_project_assignments
  add column if not exists rate_type text not null default 'hourly' check (rate_type in ('hourly', 'salary'));

create index if not exists employee_project_assignments_rate_type_idx
  on public.employee_project_assignments(entity_id, rate_type)
  where deleted_at is null;

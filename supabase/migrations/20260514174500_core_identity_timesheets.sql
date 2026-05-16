create extension if not exists pgcrypto;

create type public.app_role as enum (
  'super_admin',
  'admin',
  'hr',
  'accounts_manager',
  'recruiter',
  'marketing',
  'team_lead',
  'operations',
  'viewer',
  'employee',
  'candidate'
);

create type public.timesheet_period_type as enum ('weekly', 'monthly');
create type public.timesheet_status as enum (
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'correction_requested',
  'exported',
  'locked'
);

create table public.business_entities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  legal_name text,
  slug text not null unique,
  is_active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  entity_id uuid not null references public.business_entities(id),
  email text not null unique,
  full_name text not null,
  role public.app_role not null default 'employee',
  department text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.business_entities
  add constraint business_entities_created_by_fkey foreign key (created_by) references public.profiles(id),
  add constraint business_entities_updated_by_fkey foreign key (updated_by) references public.profiles(id);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id),
  entity_id uuid not null references public.business_entities(id),
  employee_number text not null,
  department text,
  title text,
  manager_id uuid references public.employees(id),
  employment_status text not null default 'active',
  hire_date date,
  payroll_metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(entity_id, employee_number)
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references public.business_entities(id),
  code text not null unique,
  description text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references public.business_entities(id),
  role public.app_role not null,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(role, permission_id, entity_id)
);

create table public.timesheets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  entity_id uuid not null references public.business_entities(id),
  client_name text,
  project_name text,
  period_type public.timesheet_period_type not null,
  period_start date not null,
  period_end date not null,
  status public.timesheet_status not null default 'draft',
  total_hours numeric(8,2) not null default 0,
  billable_hours numeric(8,2) not null default 0,
  non_billable_hours numeric(8,2) not null default 0,
  employee_notes text,
  reviewer_comments text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  exported_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint valid_timesheet_period check (period_end >= period_start)
);

create table public.timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  entity_id uuid not null references public.business_entities(id),
  work_date date not null,
  hours_worked numeric(5,2) not null default 0 check (hours_worked >= 0 and hours_worked <= 24),
  is_billable boolean not null default true,
  client_name text,
  project_name text,
  task_description text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(timesheet_id, work_date)
);

create table public.timesheet_attachments (
  id uuid primary key default gen_random_uuid(),
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  entity_id uuid not null references public.business_entities(id),
  file_name text not null,
  file_path text not null unique,
  file_type text,
  file_size bigint,
  attachment_type text not null check (attachment_type in ('client_approved_timecard', 'supporting_document', 'other')),
  uploaded_by uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.timesheet_activity (
  id uuid primary key default gen_random_uuid(),
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  entity_id uuid not null references public.business_entities(id),
  actor_id uuid references public.profiles(id),
  action text not null,
  old_status public.timesheet_status,
  new_status public.timesheet_status,
  comments text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  recipient_id uuid not null references public.profiles(id),
  channel text not null default 'in_app' check (channel in ('in_app', 'email', 'slack', 'teams')),
  type text not null,
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references public.business_entities(id),
  actor_id uuid references public.profiles(id),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  request_id text,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index profiles_entity_id_idx on public.profiles(entity_id) where deleted_at is null;
create index employees_entity_id_idx on public.employees(entity_id) where deleted_at is null;
create index employees_profile_id_idx on public.employees(profile_id) where deleted_at is null;
create index timesheets_entity_status_idx on public.timesheets(entity_id, status) where deleted_at is null;
create index timesheets_employee_period_idx on public.timesheets(employee_id, period_start, period_end) where deleted_at is null;
create index timesheet_entries_timesheet_id_idx on public.timesheet_entries(timesheet_id) where deleted_at is null;
create index timesheet_attachments_timesheet_id_idx on public.timesheet_attachments(timesheet_id) where deleted_at is null;
create index timesheet_activity_timesheet_id_idx on public.timesheet_activity(timesheet_id);
create index audit_logs_entity_created_idx on public.audit_logs(entity_id, created_at desc);
create index notifications_recipient_read_idx on public.notifications(recipient_id, read_at) where deleted_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger business_entities_updated_at before update on public.business_entities for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger employees_updated_at before update on public.employees for each row execute function public.set_updated_at();
create trigger permissions_updated_at before update on public.permissions for each row execute function public.set_updated_at();
create trigger role_permissions_updated_at before update on public.role_permissions for each row execute function public.set_updated_at();
create trigger timesheets_updated_at before update on public.timesheets for each row execute function public.set_updated_at();
create trigger timesheet_entries_updated_at before update on public.timesheet_entries for each row execute function public.set_updated_at();
create trigger timesheet_attachments_updated_at before update on public.timesheet_attachments for each row execute function public.set_updated_at();
create trigger timesheet_activity_updated_at before update on public.timesheet_activity for each row execute function public.set_updated_at();
create trigger notifications_updated_at before update on public.notifications for each row execute function public.set_updated_at();
create trigger audit_logs_updated_at before update on public.audit_logs for each row execute function public.set_updated_at();

create or replace function public.recalculate_timesheet_totals()
returns trigger
language plpgsql
as $$
declare
  target_timesheet_id uuid;
begin
  target_timesheet_id = coalesce(new.timesheet_id, old.timesheet_id);

  update public.timesheets
  set total_hours = coalesce((
        select sum(hours_worked) from public.timesheet_entries
        where timesheet_id = target_timesheet_id and deleted_at is null
      ), 0),
      billable_hours = coalesce((
        select sum(hours_worked) from public.timesheet_entries
        where timesheet_id = target_timesheet_id and is_billable = true and deleted_at is null
      ), 0),
      non_billable_hours = coalesce((
        select sum(hours_worked) from public.timesheet_entries
        where timesheet_id = target_timesheet_id and is_billable = false and deleted_at is null
      ), 0),
      updated_at = now()
  where id = target_timesheet_id;

  return coalesce(new, old);
end;
$$;

create trigger timesheet_entries_recalculate_totals
after insert or update or delete on public.timesheet_entries
for each row execute function public.recalculate_timesheet_totals();

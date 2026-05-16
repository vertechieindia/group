create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  name text not null,
  code text,
  leader_id uuid references public.employees(id),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(entity_id, name)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  department_id uuid references public.departments(id),
  name text not null,
  lead_id uuid references public.employees(id),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(entity_id, name)
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  department_id uuid references public.departments(id),
  title text not null,
  slug text not null,
  location text,
  employment_type text,
  status text not null default 'draft' check (status in ('draft', 'open', 'paused', 'closed', 'archived')),
  description text,
  requirements text,
  salary_min numeric(12,2),
  salary_max numeric(12,2),
  posted_at timestamptz,
  closed_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(entity_id, slug)
);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  owner_id uuid references public.profiles(id),
  full_name text not null,
  email text,
  phone text,
  source text,
  stage text not null default 'new',
  status text not null default 'active' check (status in ('active', 'hired', 'rejected', 'withdrawn', 'archived')),
  resume_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  job_id uuid not null references public.jobs(id),
  candidate_id uuid not null references public.candidates(id),
  recruiter_id uuid references public.profiles(id),
  stage text not null default 'applied',
  status text not null default 'active' check (status in ('active', 'offer', 'hired', 'rejected', 'withdrawn', 'archived')),
  applied_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(job_id, candidate_id)
);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  candidate_id uuid not null references public.candidates(id),
  application_id uuid references public.job_applications(id),
  evaluator_id uuid references public.profiles(id),
  score numeric(5,2),
  recommendation text check (recommendation in ('strong_yes', 'yes', 'neutral', 'no', 'strong_no')),
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.offer_letters (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  candidate_id uuid not null references public.candidates(id),
  application_id uuid references public.job_applications(id),
  employee_id uuid references public.employees(id),
  status text not null default 'draft' check (status in ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'withdrawn')),
  template_key text,
  docx_path text,
  pdf_path text,
  secure_token_hash text,
  expires_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.onboarding_invites (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  candidate_id uuid references public.candidates(id),
  employee_id uuid references public.employees(id),
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'started', 'completed', 'expired', 'revoked')),
  token_hash text,
  expires_at timestamptz,
  sent_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  invite_id uuid not null references public.onboarding_invites(id),
  candidate_id uuid references public.candidates(id),
  employee_id uuid references public.employees(id),
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'submitted', 'approved', 'rejected')),
  progress numeric(5,2) not null default 0,
  form_data jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  employee_id uuid not null references public.employees(id),
  work_date date not null,
  status text not null default 'present' check (status in ('present', 'absent', 'leave', 'holiday', 'partial')),
  total_minutes integer not null default 0,
  overtime_minutes integer not null default 0,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(employee_id, work_date)
);

create table if not exists public.work_sessions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  employee_id uuid not null references public.employees(id),
  attendance_id uuid references public.attendance(id),
  clock_in_at timestamptz not null,
  clock_out_at timestamptz,
  source text not null default 'web',
  notes text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.break_sessions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  work_session_id uuid not null references public.work_sessions(id) on delete cascade,
  employee_id uuid not null references public.employees(id),
  break_start_at timestamptz not null,
  break_end_at timestamptz,
  reason text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.productivity_logs (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  employee_id uuid references public.employees(id),
  recruiter_id uuid references public.profiles(id),
  log_date date not null default current_date,
  metric_type text not null,
  metric_value numeric(12,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.document_records (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  owner_profile_id uuid references public.profiles(id),
  employee_id uuid references public.employees(id),
  candidate_id uuid references public.candidates(id),
  bucket_id text not null,
  file_path text not null unique,
  file_name text not null,
  file_type text,
  file_size bigint,
  version integer not null default 1,
  classification text not null default 'private',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists departments_entity_idx on public.departments(entity_id) where deleted_at is null;
create index if not exists teams_entity_idx on public.teams(entity_id) where deleted_at is null;
create index if not exists jobs_entity_status_idx on public.jobs(entity_id, status) where deleted_at is null;
create index if not exists candidates_entity_owner_idx on public.candidates(entity_id, owner_id) where deleted_at is null;
create index if not exists job_applications_job_idx on public.job_applications(job_id) where deleted_at is null;
create index if not exists evaluations_candidate_idx on public.evaluations(candidate_id) where deleted_at is null;
create index if not exists offer_letters_candidate_idx on public.offer_letters(candidate_id) where deleted_at is null;
create index if not exists onboarding_invites_entity_status_idx on public.onboarding_invites(entity_id, status) where deleted_at is null;
create index if not exists onboarding_sessions_invite_idx on public.onboarding_sessions(invite_id) where deleted_at is null;
create index if not exists attendance_employee_date_idx on public.attendance(employee_id, work_date) where deleted_at is null;
create index if not exists work_sessions_employee_idx on public.work_sessions(employee_id, clock_in_at desc) where deleted_at is null;
create index if not exists break_sessions_work_session_idx on public.break_sessions(work_session_id) where deleted_at is null;
create index if not exists productivity_logs_entity_date_idx on public.productivity_logs(entity_id, log_date desc) where deleted_at is null;
create index if not exists document_records_owner_idx on public.document_records(entity_id, owner_profile_id) where deleted_at is null;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'departments',
    'teams',
    'jobs',
    'candidates',
    'job_applications',
    'evaluations',
    'offer_letters',
    'onboarding_invites',
    'onboarding_sessions',
    'attendance',
    'work_sessions',
    'break_sessions',
    'productivity_logs',
    'document_records'
  ]
  loop
    execute format('drop trigger if exists %I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

create or replace function public.is_entity_member(target_entity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.deleted_at is null
      and p.is_active = true
      and (p.role = 'super_admin' or p.entity_id = target_entity_id)
  );
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'departments',
    'teams',
    'jobs',
    'candidates',
    'job_applications',
    'evaluations',
    'offer_letters',
    'onboarding_invites',
    'onboarding_sessions',
    'attendance',
    'work_sessions',
    'break_sessions',
    'productivity_logs',
    'document_records'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || ' entity read', table_name);
    execute format('create policy %I on public.%I for select using (public.is_entity_member(entity_id))', table_name || ' entity read', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || ' entity insert', table_name);
    execute format('create policy %I on public.%I for insert with check (public.is_entity_member(entity_id))', table_name || ' entity insert', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || ' entity update', table_name);
    execute format('create policy %I on public.%I for update using (public.is_entity_member(entity_id)) with check (public.is_entity_member(entity_id))', table_name || ' entity update', table_name);
  end loop;
end;
$$;

insert into public.permissions (code, description)
values
  ('department:manage:entity', 'Manage departments in assigned entity'),
  ('team:manage:entity', 'Manage teams in assigned entity'),
  ('job:manage:entity', 'Manage jobs in assigned entity'),
  ('candidate:manage:entity', 'Manage candidates in assigned entity'),
  ('candidate:view:assigned', 'View assigned candidates'),
  ('offer:manage:entity', 'Manage entity offer letters'),
  ('onboarding:manage:entity', 'Manage entity onboarding'),
  ('attendance:manage:entity', 'Manage entity attendance'),
  ('document:manage:entity', 'Manage entity documents'),
  ('executive_dashboard:view:all', 'View executive dashboard across all entities')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role, permission_id)
select role_name::public.app_role, p.id
from public.permissions p
cross join (values ('super_admin'), ('admin')) roles(role_name)
where p.code in (
  'department:manage:entity',
  'team:manage:entity',
  'job:manage:entity',
  'candidate:manage:entity',
  'candidate:view:assigned',
  'offer:manage:entity',
  'onboarding:manage:entity',
  'attendance:manage:entity',
  'document:manage:entity',
  'executive_dashboard:view:all'
)
on conflict do nothing;

insert into public.role_permissions (role, permission_id)
select 'hr'::public.app_role, id
from public.permissions
where code in ('department:manage:entity', 'team:manage:entity', 'candidate:manage:entity', 'offer:manage:entity', 'onboarding:manage:entity', 'document:manage:entity')
on conflict do nothing;

insert into public.role_permissions (role, permission_id)
select 'recruiter'::public.app_role, id
from public.permissions
where code in ('job:manage:entity', 'candidate:view:assigned')
on conflict do nothing;

insert into public.role_permissions (role, permission_id)
select 'operations'::public.app_role, id
from public.permissions
where code in ('attendance:manage:entity', 'executive_dashboard:view:all')
on conflict do nothing;

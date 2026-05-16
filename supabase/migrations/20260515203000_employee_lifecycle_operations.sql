alter table public.employees
  add column if not exists employee_type text not null default 'paid_project' check (employee_type in ('unpaid', 'paid_internal_bench', 'paid_project')),
  add column if not exists supervisor_id uuid references public.employees(id),
  add column if not exists onboarding_status text not null default 'not_started' check (onboarding_status in ('not_started', 'invited', 'in_progress', 'submitted', 'approved', 'rejected', 'completed')),
  add column if not exists client_name text,
  add column if not exists project_name text;

create table if not exists public.onboarding_form_submissions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  invite_id uuid references public.onboarding_invites(id),
  employee_id uuid references public.employees(id),
  candidate_id uuid references public.candidates(id),
  personal_info jsonb not null default '{}'::jsonb,
  emergency_contacts jsonb not null default '[]'::jsonb,
  work_authorization jsonb not null default '{}'::jsonb,
  tax_info jsonb not null default '{}'::jsonb,
  banking_info jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  reviewer_comments text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.offer_templates (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  name text not null,
  description text,
  template_body text not null,
  is_default boolean not null default false,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(entity_id, name)
);

create table if not exists public.learning_materials (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  title text not null,
  description text,
  content_url text,
  file_path text,
  material_type text not null default 'link' check (material_type in ('link', 'document', 'video', 'policy', 'training')),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.learning_assignments (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  material_id uuid not null references public.learning_materials(id) on delete cascade,
  employee_id uuid not null references public.employees(id),
  assigned_by uuid references public.profiles(id),
  due_date date,
  status text not null default 'assigned' check (status in ('assigned', 'viewed', 'acknowledged', 'completed')),
  acknowledged_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(material_id, employee_id)
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  name text not null,
  billing_email text,
  billing_address text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(entity_id, name)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  client_id uuid references public.clients(id),
  name text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(entity_id, name)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  client_id uuid references public.clients(id),
  invoice_number text not null,
  status text not null default 'draft' check (status in ('draft', 'issued', 'paid', 'void')),
  period_start date,
  period_end date,
  total_hours numeric(10,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  issued_at timestamptz,
  due_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(entity_id, invoice_number)
);

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  timesheet_id uuid references public.timesheets(id),
  employee_id uuid references public.employees(id),
  description text not null,
  hours numeric(8,2) not null default 0,
  rate numeric(10,2) not null default 0,
  amount numeric(12,2) generated always as (hours * rate) stored,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists employees_supervisor_idx on public.employees(supervisor_id) where deleted_at is null;
create index if not exists onboarding_form_submissions_entity_status_idx on public.onboarding_form_submissions(entity_id, status) where deleted_at is null;
create index if not exists offer_templates_entity_idx on public.offer_templates(entity_id) where deleted_at is null;
create index if not exists learning_materials_entity_idx on public.learning_materials(entity_id) where deleted_at is null;
create index if not exists learning_assignments_employee_idx on public.learning_assignments(employee_id, status) where deleted_at is null;
create index if not exists clients_entity_idx on public.clients(entity_id) where deleted_at is null;
create index if not exists projects_entity_idx on public.projects(entity_id) where deleted_at is null;
create index if not exists invoices_entity_status_idx on public.invoices(entity_id, status) where deleted_at is null;
create index if not exists invoice_line_items_invoice_idx on public.invoice_line_items(invoice_id) where deleted_at is null;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'onboarding_form_submissions',
    'offer_templates',
    'learning_materials',
    'learning_assignments',
    'clients',
    'projects',
    'invoices',
    'invoice_line_items'
  ]
  loop
    execute format('drop trigger if exists %I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || ' entity read', table_name);
    execute format('create policy %I on public.%I for select using (public.is_entity_member(entity_id))', table_name || ' entity read', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || ' entity insert', table_name);
    execute format('create policy %I on public.%I for insert with check (public.is_entity_member(entity_id))', table_name || ' entity insert', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || ' entity update', table_name);
    execute format('create policy %I on public.%I for update using (public.is_entity_member(entity_id)) with check (public.is_entity_member(entity_id))', table_name || ' entity update', table_name);
  end loop;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'onboarding-documents',
  'onboarding-documents',
  false,
  20971520,
  array['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into public.permissions (code, description)
values
  ('employee_lifecycle:manage:entity', 'Manage employee lifecycle in assigned entity'),
  ('onboarding_invite:create:entity', 'Create onboarding invitations'),
  ('offer_template:manage:entity', 'Manage offer letter templates'),
  ('learning:manage:entity', 'Manage learning materials and assignments'),
  ('invoice:manage:entity', 'Create invoices from approved timesheets')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role, permission_id)
select role_name::public.app_role, p.id
from public.permissions p
cross join (values ('super_admin'), ('admin'), ('company_admin'), ('hr')) roles(role_name)
where p.code in ('employee_lifecycle:manage:entity','onboarding_invite:create:entity','offer_template:manage:entity','learning:manage:entity')
on conflict do nothing;

insert into public.role_permissions (role, permission_id)
select role_name::public.app_role, p.id
from public.permissions p
cross join (values ('super_admin'), ('admin'), ('company_admin'), ('accounts_manager')) roles(role_name)
where p.code in ('invoice:manage:entity')
on conflict do nothing;

insert into public.offer_templates (entity_id, name, description, template_body, is_default)
select id,
       'Standard Employment Offer',
       'Default offer letter template with company and employee placeholders.',
       'Dear {{candidate_name}},\n\nWe are pleased to offer you the position of {{job_title}} with {{company_name}}. Your expected start date is {{start_date}}. Compensation, employment type, and project details are provided below.\n\nSincerely,\n{{company_name}} HR',
       true
from public.business_entities
on conflict (entity_id, name) do nothing;

alter type public.app_role add value if not exists 'company_admin' after 'admin';

alter table public.business_entities
  add column if not exists brand_name text,
  add column if not exists brand_logo_url text,
  add column if not exists primary_color text not null default '#0f766e',
  add column if not exists accent_color text not null default '#f59e0b',
  add column if not exists portal_slug text,
  add column if not exists custom_domain text,
  add column if not exists branding jsonb not null default '{}'::jsonb;

update public.business_entities
set portal_slug = slug,
    brand_name = coalesce(brand_name, name)
where portal_slug is null;

create unique index if not exists business_entities_portal_slug_idx on public.business_entities(portal_slug) where deleted_at is null;

create table if not exists public.company_roles (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  name text not null,
  slug text not null,
  description text,
  permissions text[] not null default '{}'::text[],
  is_system boolean not null default false,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(entity_id, slug)
);

create table if not exists public.profile_role_assignments (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  company_role_id uuid not null references public.company_roles(id) on delete cascade,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(profile_id, company_role_id)
);

create index if not exists company_roles_entity_idx on public.company_roles(entity_id) where deleted_at is null;
create index if not exists profile_role_assignments_profile_idx on public.profile_role_assignments(profile_id) where deleted_at is null;

drop trigger if exists company_roles_updated_at on public.company_roles;
create trigger company_roles_updated_at before update on public.company_roles for each row execute function public.set_updated_at();

drop trigger if exists profile_role_assignments_updated_at on public.profile_role_assignments;
create trigger profile_role_assignments_updated_at before update on public.profile_role_assignments for each row execute function public.set_updated_at();

alter table public.company_roles enable row level security;
alter table public.profile_role_assignments enable row level security;

create or replace function public.has_permission(permission_code text, target_entity_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    left join public.permissions perm on perm.code = permission_code and perm.deleted_at is null
    left join public.role_permissions rp on rp.permission_id = perm.id and rp.role = p.role and rp.deleted_at is null
    where p.id = auth.uid()
      and p.deleted_at is null
      and p.is_active = true
      and (
        p.role = 'super_admin'
        or (
          rp.id is not null
          and (target_entity_id is null or p.entity_id = target_entity_id or rp.entity_id is null or rp.entity_id = target_entity_id)
        )
        or exists (
          select 1
          from public.profile_role_assignments pra
          join public.company_roles cr on cr.id = pra.company_role_id
          where pra.profile_id = p.id
            and pra.deleted_at is null
            and cr.deleted_at is null
            and permission_code = any(cr.permissions)
            and (target_entity_id is null or pra.entity_id = target_entity_id)
        )
      )
  );
$$;

drop policy if exists "company roles scoped read" on public.company_roles;
create policy "company roles scoped read" on public.company_roles
  for select using (public.is_entity_member(entity_id));

drop policy if exists "company roles scoped insert" on public.company_roles;
create policy "company roles scoped insert" on public.company_roles
  for insert with check (
    public.has_permission('company_role:manage:entity', entity_id)
    or public.current_role() = 'super_admin'
  );

drop policy if exists "company roles scoped update" on public.company_roles;
create policy "company roles scoped update" on public.company_roles
  for update using (
    public.has_permission('company_role:manage:entity', entity_id)
    or public.current_role() = 'super_admin'
  )
  with check (
    public.has_permission('company_role:manage:entity', entity_id)
    or public.current_role() = 'super_admin'
  );

drop policy if exists "profile role assignments scoped read" on public.profile_role_assignments;
create policy "profile role assignments scoped read" on public.profile_role_assignments
  for select using (public.is_entity_member(entity_id));

drop policy if exists "profile role assignments scoped insert" on public.profile_role_assignments;
create policy "profile role assignments scoped insert" on public.profile_role_assignments
  for insert with check (
    public.has_permission('user:manage:entity', entity_id)
    or public.current_role() = 'super_admin'
  );

drop policy if exists "profile role assignments scoped update" on public.profile_role_assignments;
create policy "profile role assignments scoped update" on public.profile_role_assignments
  for update using (
    public.has_permission('user:manage:entity', entity_id)
    or public.current_role() = 'super_admin'
  )
  with check (
    public.has_permission('user:manage:entity', entity_id)
    or public.current_role() = 'super_admin'
  );

insert into public.permissions (code, description)
values
  ('user:manage:entity', 'Create and manage users in assigned company'),
  ('company_role:manage:entity', 'Create and manage company custom roles'),
  ('branding:manage:entity', 'Manage company branding'),
  ('company_dashboard:view:entity', 'View company-level dashboard'),
  ('company_admin:create', 'Create company admin credentials')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role, permission_id)
select 'company_admin'::public.app_role, id
from public.permissions
where code in (
  'user:manage:entity',
  'company_role:manage:entity',
  'branding:manage:entity',
  'company_dashboard:view:entity',
  'timesheet:view:entity',
  'timesheet:approve:entity',
  'timesheet:reject:entity',
  'timesheet:request_correction:entity',
  'timesheet:export:entity',
  'timesheet_attachment:view:entity',
  'report:export',
  'payroll:view',
  'audit:view:entity',
  'department:manage:entity',
  'team:manage:entity',
  'job:manage:entity',
  'candidate:manage:entity',
  'offer:manage:entity',
  'onboarding:manage:entity',
  'attendance:manage:entity',
  'document:manage:entity'
)
on conflict do nothing;

insert into public.role_permissions (role, permission_id)
select role_name::public.app_role, p.id
from public.permissions p
cross join (values ('super_admin'), ('admin')) roles(role_name)
where p.code in (
  'user:manage:entity',
  'company_role:manage:entity',
  'branding:manage:entity',
  'company_dashboard:view:entity',
  'company_admin:create'
)
on conflict do nothing;

insert into public.company_roles (entity_id, name, slug, description, permissions, is_system)
select be.id,
       role_name,
       role_slug,
       role_description,
       permissions,
       true
from public.business_entities be
cross join (
  values
    ('Company Admin', 'company-admin', 'Full company administration', array['user:manage:entity','company_role:manage:entity','branding:manage:entity','company_dashboard:view:entity','timesheet:view:entity','timesheet:approve:entity','timesheet:export:entity','report:export','payroll:view']),
    ('HR Manager', 'hr-manager', 'HR and onboarding operations', array['user:manage:entity','onboarding:manage:entity','document:manage:entity','candidate:manage:entity']),
    ('Accounts Manager', 'accounts-manager', 'Timesheet review and payroll exports', array['timesheet:view:entity','timesheet:approve:entity','timesheet:reject:entity','timesheet:request_correction:entity','timesheet:export:entity','report:export','payroll:view']),
    ('Employee', 'employee', 'Employee self-service access', array['timesheet:create:self','timesheet:edit:self','timesheet:submit:self','timesheet:view:self','timesheet_attachment:upload:self'])
) defaults(role_name, role_slug, role_description, permissions)
on conflict (entity_id, slug) do update
set description = excluded.description,
    permissions = excluded.permissions,
    is_system = excluded.is_system;

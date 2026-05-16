insert into public.permissions (code, description)
values
  ('company_admin:password:update', 'Update company admin credentials'),
  ('company:dashboard:view:all', 'View active companies and active user counts across the group'),
  ('candidate:view:assigned', 'View recruiter-assigned candidate profiles'),
  ('bench:view:entity', 'View entity bench candidates and employees available for requirements'),
  ('candidate:submit:requirement', 'Submit assigned or bench candidates to requirements')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role, permission_id)
select role_name::public.app_role, p.id
from public.permissions p
cross join (values ('super_admin'), ('admin')) roles(role_name)
on conflict do nothing;

delete from public.role_permissions
where role in ('company_admin', 'hr', 'accounts_manager', 'team_lead', 'employee', 'recruiter', 'marketing', 'operations', 'viewer')
  and permission_id in (select id from public.permissions);

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
  'timesheet:payment:entity',
  'timesheet:delete_refill:entity',
  'report:export',
  'payroll:view',
  'employee_lifecycle:manage:entity',
  'onboarding_invite:create:entity',
  'onboarding_template:manage:entity',
  'offer_template:manage:entity',
  'offer:send:entity',
  'learning:manage:entity',
  'discord_group:manage:entity',
  'invoice:manage:entity',
  'project_assignment:manage:entity'
);

insert into public.role_permissions (role, permission_id)
select 'hr'::public.app_role, id
from public.permissions
where code in (
  'employee_lifecycle:manage:entity',
  'onboarding_invite:create:entity',
  'onboarding_template:manage:entity',
  'onboarding:manage:entity',
  'offer_template:manage:entity',
  'offer:send:entity',
  'offer:manage:entity',
  'document:manage:entity',
  'learning:manage:entity',
  'discord_group:manage:entity',
  'candidate:manage:entity'
);

insert into public.role_permissions (role, permission_id)
select 'accounts_manager'::public.app_role, id
from public.permissions
where code in (
  'timesheet:view:entity',
  'timesheet:approve:entity',
  'timesheet:reject:entity',
  'timesheet:request_correction:entity',
  'timesheet:export:entity',
  'timesheet:payment:entity',
  'timesheet:delete_refill:entity',
  'report:export',
  'payroll:view',
  'invoice:manage:entity',
  'project_assignment:manage:entity'
);

insert into public.role_permissions (role, permission_id)
select 'team_lead'::public.app_role, id
from public.permissions
where code in (
  'timesheet:view:entity',
  'timesheet:approve:entity',
  'timesheet:reject:entity',
  'timesheet:request_correction:entity',
  'learning:manage:entity'
);

insert into public.role_permissions (role, permission_id)
select 'employee'::public.app_role, id
from public.permissions
where code in (
  'learning:manage:entity',
  'timesheet:create:self',
  'timesheet:edit:self',
  'timesheet:submit:self',
  'timesheet:view:self',
  'timesheet_attachment:upload:self'
);

insert into public.role_permissions (role, permission_id)
select 'recruiter'::public.app_role, id
from public.permissions
where code in (
  'candidate:view:assigned',
  'bench:view:entity',
  'candidate:submit:requirement'
);

insert into public.role_permissions (role, permission_id)
select role_name::public.app_role, p.id
from public.permissions p
join (values
  ('marketing', array['candidate:manage:entity','bench:view:entity']),
  ('operations', array['company_dashboard:view:entity','timesheet:view:entity','report:export']),
  ('viewer', array['company_dashboard:view:entity','timesheet:view:entity','report:export'])
) grants(role_name, codes) on p.code = any(grants.codes);

update public.company_roles
set permissions = array['user:manage:entity','company_role:manage:entity','branding:manage:entity','company_dashboard:view:entity','timesheet:view:entity','timesheet:approve:entity','timesheet:reject:entity','timesheet:request_correction:entity','timesheet:export:entity','timesheet:payment:entity','timesheet:delete_refill:entity','report:export','payroll:view','employee_lifecycle:manage:entity','onboarding_invite:create:entity','onboarding_template:manage:entity','offer_template:manage:entity','offer:send:entity','learning:manage:entity','discord_group:manage:entity','invoice:manage:entity','project_assignment:manage:entity']
where slug = 'company-admin' and is_system = true;

update public.company_roles
set permissions = array['employee_lifecycle:manage:entity','onboarding_invite:create:entity','onboarding_template:manage:entity','onboarding:manage:entity','offer_template:manage:entity','offer:send:entity','offer:manage:entity','document:manage:entity','learning:manage:entity','discord_group:manage:entity','candidate:manage:entity']
where slug = 'hr-manager' and is_system = true;

update public.company_roles
set permissions = array['timesheet:view:entity','timesheet:approve:entity','timesheet:reject:entity','timesheet:request_correction:entity','timesheet:export:entity','timesheet:payment:entity','timesheet:delete_refill:entity','report:export','payroll:view','invoice:manage:entity','project_assignment:manage:entity']
where slug = 'accounts-manager' and is_system = true;

update public.company_roles
set permissions = array['timesheet:view:entity','timesheet:approve:entity','timesheet:reject:entity','timesheet:request_correction:entity','learning:manage:entity']
where slug in ('supervisor', 'team-lead') and is_system = true;

update public.company_roles
set permissions = array['learning:manage:entity','timesheet:create:self','timesheet:edit:self','timesheet:submit:self','timesheet:view:self','timesheet_attachment:upload:self']
where slug = 'employee' and is_system = true;

insert into public.company_roles (entity_id, name, slug, description, permissions, is_system)
select id, 'Recruiter', 'recruiter', 'Assigned profiles and entity bench submissions', array['candidate:view:assigned','bench:view:entity','candidate:submit:requirement'], true
from public.business_entities
where deleted_at is null
on conflict (entity_id, slug) do update
set description = excluded.description,
    permissions = excluded.permissions,
    is_system = true;

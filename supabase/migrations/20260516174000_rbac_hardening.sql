insert into public.permissions (code, description)
values
  ('timesheet:payment:entity', 'Mark approved entity-scoped timesheets as client-paid or employee-paid'),
  ('timesheet:delete_refill:entity', 'Delete a rejected timesheet and require the employee to refill it'),
  ('offer:send:entity', 'Generate and send entity-scoped offer letters'),
  ('discord_group:manage:entity', 'Create and manage supervisor learning groups'),
  ('notification:view:entity', 'View entity-scoped notifications'),
  ('audit:view:entity', 'View entity-scoped audit activity'),
  ('audit:view:all', 'View audit activity across every entity'),
  ('entity:view:all', 'View all business entities'),
  ('profile:view:all', 'View all profiles'),
  ('employee:view:all', 'View all employees'),
  ('department:manage:entity', 'Manage entity departments'),
  ('team:manage:entity', 'Manage entity teams'),
  ('job:manage:entity', 'Manage entity jobs'),
  ('candidate:manage:entity', 'Manage entity candidates and marketing pipeline'),
  ('attendance:manage:entity', 'Manage entity attendance operations'),
  ('document:manage:entity', 'Manage entity documents'),
  ('offer:manage:entity', 'Manage entity offer letters'),
  ('onboarding:manage:entity', 'Manage entity onboarding operations'),
  ('invoice:manage:entity', 'Manage entity client invoices'),
  ('project_assignment:manage:entity', 'Assign entity client projects to employees'),
  ('learning:manage:entity', 'Manage entity learning materials'),
  ('employee_lifecycle:manage:entity', 'Manage entity employee lifecycle records'),
  ('onboarding_invite:create:entity', 'Create entity onboarding invitations'),
  ('onboarding_template:manage:entity', 'Manage entity onboarding form templates'),
  ('offer_template:manage:entity', 'Manage entity offer templates')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role, permission_id)
select role_name::public.app_role, p.id
from public.permissions p
cross join (values ('super_admin'), ('admin')) roles(role_name)
on conflict do nothing;

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
  'timesheet_attachment:view:entity',
  'report:export',
  'payroll:view',
  'notification:view:entity',
  'audit:view:entity',
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
  'invoice:manage:entity',
  'project_assignment:manage:entity',
  'department:manage:entity',
  'team:manage:entity',
  'job:manage:entity',
  'candidate:manage:entity',
  'attendance:manage:entity'
)
on conflict do nothing;

insert into public.role_permissions (role, permission_id)
select 'hr'::public.app_role, id
from public.permissions
where code in (
  'timesheet:view:entity',
  'timesheet_attachment:view:entity',
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
  'candidate:manage:entity',
  'notification:view:entity'
)
on conflict do nothing;

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
  'timesheet_attachment:view:entity',
  'report:export',
  'payroll:view',
  'invoice:manage:entity',
  'project_assignment:manage:entity',
  'audit:view:entity'
)
on conflict do nothing;

insert into public.role_permissions (role, permission_id)
select 'team_lead'::public.app_role, id
from public.permissions
where code in (
  'timesheet:create:self',
  'timesheet:edit:self',
  'timesheet:submit:self',
  'timesheet:view:self',
  'timesheet_attachment:upload:self',
  'timesheet_attachment:view:self',
  'learning:manage:entity',
  'discord_group:manage:entity'
)
on conflict do nothing;

insert into public.role_permissions (role, permission_id)
select role_name::public.app_role, p.id
from public.permissions p
join (values
  ('recruiter', array['candidate:manage:entity','onboarding_invite:create:entity','employee_lifecycle:manage:entity']),
  ('marketing', array['candidate:manage:entity','employee_lifecycle:manage:entity']),
  ('operations', array['timesheet:view:entity','report:export','company_dashboard:view:entity','learning:manage:entity','discord_group:manage:entity']),
  ('viewer', array['company_dashboard:view:entity','timesheet:view:entity','report:export'])
) grants(role_name, codes) on p.code = any(grants.codes)
on conflict do nothing;

update public.company_roles
set permissions = array['user:manage:entity','company_role:manage:entity','branding:manage:entity','company_dashboard:view:entity','timesheet:view:entity','timesheet:approve:entity','timesheet:reject:entity','timesheet:request_correction:entity','timesheet:export:entity','timesheet:payment:entity','timesheet:delete_refill:entity','report:export','payroll:view','employee_lifecycle:manage:entity','onboarding_invite:create:entity','onboarding_template:manage:entity','offer_template:manage:entity','offer:send:entity','learning:manage:entity','discord_group:manage:entity','invoice:manage:entity','project_assignment:manage:entity']
where slug = 'company-admin' and is_system = true;

update public.company_roles
set permissions = array['employee_lifecycle:manage:entity','onboarding_invite:create:entity','onboarding_template:manage:entity','onboarding:manage:entity','offer_template:manage:entity','offer:send:entity','offer:manage:entity','document:manage:entity','learning:manage:entity','discord_group:manage:entity','candidate:manage:entity']
where slug = 'hr-manager' and is_system = true;

update public.company_roles
set permissions = array['timesheet:view:entity','timesheet:approve:entity','timesheet:reject:entity','timesheet:request_correction:entity','timesheet:export:entity','timesheet:payment:entity','timesheet:delete_refill:entity','timesheet_attachment:view:entity','report:export','payroll:view','invoice:manage:entity','project_assignment:manage:entity']
where slug = 'accounts-manager' and is_system = true;

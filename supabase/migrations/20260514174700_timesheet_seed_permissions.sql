insert into public.business_entities (name, legal_name, slug)
values
  ('VerTechie LLC', 'VerTechie LLC', 'vertechie-llc'),
  ('Code4U.AI', 'Code4U.AI', 'code4u-ai'),
  ('XeroBookz', 'XeroBookz', 'xerobookz'),
  ('FavNFresh', 'FavNFresh', 'favnfresh'),
  ('United Bible Hub', 'United Bible Hub', 'united-bible-hub'),
  ('United Cyber Hub', 'United Cyber Hub', 'united-cyber-hub'),
  ('United SAP Hub', 'United SAP Hub', 'united-sap-hub')
on conflict (slug) do nothing;

insert into public.permissions (code, description)
values
  ('entity:view:all', 'View all business entities'),
  ('profile:view:all', 'View all profiles'),
  ('employee:view:all', 'View employees across entities'),
  ('timesheet:create:self', 'Create own timesheets'),
  ('timesheet:edit:self', 'Edit own draft or correction-requested timesheets'),
  ('timesheet:submit:self', 'Submit own timesheets'),
  ('timesheet:view:self', 'View own timesheets'),
  ('timesheet:view:entity', 'View timesheets in assigned entity'),
  ('timesheet:view:all', 'View timesheets across all entities'),
  ('timesheet:approve:entity', 'Approve entity-scoped timesheets'),
  ('timesheet:reject:entity', 'Reject entity-scoped timesheets'),
  ('timesheet:request_correction:entity', 'Request entity-scoped timesheet corrections'),
  ('timesheet:export:entity', 'Export approved entity-scoped timesheets'),
  ('timesheet:export:all', 'Export approved timesheets across entities'),
  ('timesheet_attachment:upload:self', 'Upload own timesheet attachments'),
  ('timesheet_attachment:view:self', 'View own timesheet attachments'),
  ('timesheet_attachment:view:entity', 'View entity-scoped timesheet attachments'),
  ('report:export', 'Export operational reports'),
  ('payroll:view', 'View payroll-ready timesheet reporting'),
  ('audit:view:entity', 'View entity-scoped audit logs'),
  ('audit:view:all', 'View all audit logs'),
  ('notification:view:entity', 'View entity-scoped notifications')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role, permission_id)
select role_name::public.app_role, p.id
from public.permissions p
cross join (
  values
    ('super_admin'),
    ('admin')
) roles(role_name)
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
  'timesheet_attachment:view:entity',
  'report:export',
  'payroll:view',
  'audit:view:entity'
)
on conflict do nothing;

insert into public.role_permissions (role, permission_id)
select 'employee'::public.app_role, id
from public.permissions
where code in (
  'timesheet:create:self',
  'timesheet:edit:self',
  'timesheet:submit:self',
  'timesheet:view:self',
  'timesheet_attachment:upload:self',
  'timesheet_attachment:view:self'
)
on conflict do nothing;

insert into public.role_permissions (role, permission_id)
select 'viewer'::public.app_role, id
from public.permissions
where code in ('timesheet:view:entity')
on conflict do nothing;

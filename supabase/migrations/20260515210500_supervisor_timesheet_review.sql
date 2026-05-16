insert into public.role_permissions (role, permission_id)
select role_name::public.app_role, p.id
from public.permissions p
cross join (values ('team_lead'), ('operations')) roles(role_name)
where p.code in ('timesheet:view:entity','timesheet:approve:entity','timesheet:reject:entity','timesheet:request_correction:entity','learning:manage:entity')
on conflict do nothing;

insert into public.company_roles (entity_id, name, slug, description, permissions, is_system)
select id,
       'Supervisor',
       'supervisor',
       'Review assigned employee timesheets and publish learning material',
       array['timesheet:view:entity','timesheet:approve:entity','timesheet:reject:entity','timesheet:request_correction:entity','learning:manage:entity'],
       true
from public.business_entities
on conflict (entity_id, slug) do update
set permissions = excluded.permissions,
    description = excluded.description,
    updated_at = now();

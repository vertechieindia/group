insert into public.role_permissions (role, permission_id)
select 'accounts_manager'::public.app_role, id
from public.permissions
where code in ('employee_lifecycle:manage:entity')
on conflict do nothing;

update public.company_roles
set permissions = array(
  select distinct permission
  from unnest(permissions || array['employee_lifecycle:manage:entity']) as permission
)
where slug = 'accounts-manager'
  and is_system = true;

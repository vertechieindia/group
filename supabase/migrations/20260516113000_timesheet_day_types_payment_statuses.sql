alter type public.timesheet_status add value if not exists 'client_paid';
alter type public.timesheet_status add value if not exists 'employee_paid';
alter type public.timesheet_status add value if not exists 'deleted';

alter table public.timesheet_entries
  add column if not exists day_type text not null default 'work'
    check (day_type in ('work', 'paid_leave', 'unpaid_leave', 'paid_holiday', 'unpaid_holiday')),
  add column if not exists is_paid boolean not null default true;

alter table public.timesheets
  add column if not exists client_payment_received_at timestamptz,
  add column if not exists employee_paid_at timestamptz,
  add column if not exists deleted_for_refill_at timestamptz,
  add column if not exists deleted_for_refill_by uuid references public.profiles(id);

insert into public.permissions (code, description)
values
  ('timesheet:payment:entity', 'Mark client payment and employee payment for entity timesheets'),
  ('timesheet:delete_refill:entity', 'Mark a timesheet deleted and requiring employee refill')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role, permission_id)
select role_name::public.app_role, p.id
from public.permissions p
cross join (values ('super_admin'), ('admin'), ('company_admin'), ('accounts_manager')) roles(role_name)
where p.code in ('timesheet:payment:entity', 'timesheet:delete_refill:entity')
on conflict do nothing;

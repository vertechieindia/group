alter table public.business_entities enable row level security;
alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.timesheets enable row level security;
alter table public.timesheet_entries enable row level security;
alter table public.timesheet_attachments enable row level security;
alter table public.timesheet_activity enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select p from public.profiles p where p.id = auth.uid() and p.deleted_at is null and p.is_active = true;
$$;

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and deleted_at is null and is_active = true;
$$;

create or replace function public.current_entity_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select entity_id from public.profiles where id = auth.uid() and deleted_at is null and is_active = true;
$$;

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
      )
  );
$$;

create or replace function public.is_own_employee(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.employees e
    where e.id = target_employee_id
      and e.profile_id = auth.uid()
      and e.deleted_at is null
  );
$$;

create policy "entity self read" on public.business_entities
  for select using (public.has_permission('entity:view:all') or id = public.current_entity_id());

create policy "profiles scoped read" on public.profiles
  for select using (public.has_permission('profile:view:all') or entity_id = public.current_entity_id() or id = auth.uid());

create policy "employees scoped read" on public.employees
  for select using (public.has_permission('employee:view:all') or entity_id = public.current_entity_id() or profile_id = auth.uid());

create policy "permissions readable by authenticated" on public.permissions
  for select to authenticated using (true);

create policy "role permissions readable by authenticated" on public.role_permissions
  for select to authenticated using (true);

create policy "timesheets employee read own" on public.timesheets
  for select using (
    public.has_permission('timesheet:view:all', entity_id)
    or public.has_permission('timesheet:view:entity', entity_id)
    or public.is_own_employee(employee_id)
  );

create policy "timesheets employee create own" on public.timesheets
  for insert with check (
    public.has_permission('timesheet:create:self', entity_id)
    and public.is_own_employee(employee_id)
    and status in ('draft', 'submitted')
  );

create policy "timesheets employee update own editable" on public.timesheets
  for update using (
    public.is_own_employee(employee_id)
    and status in ('draft', 'correction_requested')
  )
  with check (
    public.is_own_employee(employee_id)
    and status in ('draft', 'submitted', 'correction_requested')
  );

create policy "timesheets entity reviewers update" on public.timesheets
  for update using (
    public.has_permission('timesheet:approve:entity', entity_id)
    or public.has_permission('timesheet:reject:entity', entity_id)
    or public.has_permission('timesheet:request_correction:entity', entity_id)
    or public.has_permission('timesheet:export:entity', entity_id)
    or public.has_permission('timesheet:export:all', entity_id)
  );

create policy "timesheet entries scoped read" on public.timesheet_entries
  for select using (
    exists (
      select 1 from public.timesheets t
      where t.id = timesheet_id
        and (
          public.is_own_employee(t.employee_id)
          or public.has_permission('timesheet:view:entity', t.entity_id)
          or public.has_permission('timesheet:view:all', t.entity_id)
        )
    )
  );

create policy "timesheet entries own editable" on public.timesheet_entries
  for all using (
    exists (
      select 1 from public.timesheets t
      where t.id = timesheet_id
        and public.is_own_employee(t.employee_id)
        and t.status in ('draft', 'correction_requested')
    )
  )
  with check (
    exists (
      select 1 from public.timesheets t
      where t.id = timesheet_id
        and public.is_own_employee(t.employee_id)
        and t.status in ('draft', 'correction_requested')
    )
  );

create policy "timesheet attachments scoped read" on public.timesheet_attachments
  for select using (
    exists (
      select 1 from public.timesheets t
      where t.id = timesheet_id
        and (
          public.is_own_employee(t.employee_id)
          or public.has_permission('timesheet_attachment:view:entity', t.entity_id)
          or public.has_permission('timesheet:view:all', t.entity_id)
        )
    )
  );

create policy "timesheet attachments own upload" on public.timesheet_attachments
  for insert with check (
    public.has_permission('timesheet_attachment:upload:self', entity_id)
    and exists (
      select 1 from public.timesheets t
      where t.id = timesheet_id
        and public.is_own_employee(t.employee_id)
        and t.status in ('draft', 'correction_requested')
    )
  );

create policy "timesheet activity scoped read" on public.timesheet_activity
  for select using (
    public.has_permission('timesheet:view:all', entity_id)
    or public.has_permission('timesheet:view:entity', entity_id)
    or exists (
      select 1 from public.timesheets t
      where t.id = timesheet_id and public.is_own_employee(t.employee_id)
    )
  );

create policy "notifications recipient read" on public.notifications
  for select using (recipient_id = auth.uid() or public.has_permission('notification:view:entity', entity_id));

create policy "audit logs privileged read" on public.audit_logs
  for select using (public.has_permission('audit:view:all', entity_id) or public.has_permission('audit:view:entity', entity_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('employee-documents', 'employee-documents', false, 20971520, array['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('candidate-documents', 'candidate-documents', false, 20971520, array['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('timesheet-attachments', 'timesheet-attachments', false, 20971520, array['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "timesheet storage authenticated read via signed url metadata"
on storage.objects for select to authenticated
using (
  bucket_id = 'timesheet-attachments'
  and exists (
    select 1 from public.timesheet_attachments a
    join public.timesheets t on t.id = a.timesheet_id
    where a.file_path = name
      and (
        public.is_own_employee(t.employee_id)
        or public.has_permission('timesheet_attachment:view:entity', t.entity_id)
        or public.has_permission('timesheet:view:all', t.entity_id)
      )
  )
);

create policy "timesheet storage own upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'timesheet-attachments'
  and public.has_permission('timesheet_attachment:upload:self', public.current_entity_id())
  and split_part(name, '/', 1) = public.current_entity_id()::text
);

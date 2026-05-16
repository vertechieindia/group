alter table public.learning_materials
  add column if not exists course_name text,
  add column if not exists required boolean not null default true,
  add column if not exists estimated_minutes integer,
  add column if not exists published_at timestamptz not null default now();

create table if not exists public.discord_learning_groups (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  supervisor_id uuid references public.employees(id),
  name text not null,
  discord_url text not null,
  description text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.discord_learning_group_members (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  group_id uuid not null references public.discord_learning_groups(id) on delete cascade,
  employee_id uuid not null references public.employees(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(group_id, employee_id)
);

create index if not exists learning_assignments_material_idx on public.learning_assignments(material_id) where deleted_at is null;
create index if not exists discord_learning_groups_entity_idx on public.discord_learning_groups(entity_id) where deleted_at is null;
create index if not exists discord_learning_group_members_group_idx on public.discord_learning_group_members(group_id) where deleted_at is null;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['discord_learning_groups', 'discord_learning_group_members']
  loop
    execute format('drop trigger if exists %I_updated_at on public.%I', table_name, table_name);
    if table_name = 'discord_learning_groups' then
      execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
    end if;
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

insert into public.permissions (code, description)
values
  ('discord_group:manage:entity', 'Manage supervisor Discord learning groups')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role, permission_id)
select role_name::public.app_role, p.id
from public.permissions p
cross join (values ('super_admin'), ('admin'), ('company_admin'), ('hr'), ('team_lead'), ('operations')) roles(role_name)
where p.code in ('learning:manage:entity', 'discord_group:manage:entity')
on conflict do nothing;

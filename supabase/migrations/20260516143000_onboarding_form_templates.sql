create table if not exists public.onboarding_form_templates (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.business_entities(id),
  name text not null,
  description text,
  fields jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  version integer not null default 1,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists onboarding_form_templates_entity_active_idx
  on public.onboarding_form_templates(entity_id, is_active, created_at desc)
  where deleted_at is null;

drop trigger if exists onboarding_form_templates_updated_at on public.onboarding_form_templates;
create trigger onboarding_form_templates_updated_at
before update on public.onboarding_form_templates
for each row execute function public.set_updated_at();

alter table public.onboarding_form_templates enable row level security;

drop policy if exists "onboarding_form_templates entity read" on public.onboarding_form_templates;
create policy "onboarding_form_templates entity read" on public.onboarding_form_templates
for select using (public.is_entity_member(entity_id));

drop policy if exists "onboarding_form_templates entity insert" on public.onboarding_form_templates;
create policy "onboarding_form_templates entity insert" on public.onboarding_form_templates
for insert with check (public.is_entity_member(entity_id));

drop policy if exists "onboarding_form_templates entity update" on public.onboarding_form_templates;
create policy "onboarding_form_templates entity update" on public.onboarding_form_templates
for update using (public.is_entity_member(entity_id)) with check (public.is_entity_member(entity_id));

insert into public.permissions (code, description)
values ('onboarding_template:manage:entity', 'Create and manage onboarding form templates')
on conflict (code) do update set description = excluded.description;

insert into public.role_permissions (role, permission_id)
select role_name::public.app_role, p.id
from public.permissions p
cross join (values ('super_admin'), ('admin'), ('company_admin'), ('hr')) roles(role_name)
where p.code = 'onboarding_template:manage:entity'
on conflict do nothing;

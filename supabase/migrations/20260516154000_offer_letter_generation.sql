alter table public.offer_templates
  add column if not exists required_fields jsonb not null default '[]'::jsonb,
  add column if not exists source_file_name text;

alter table public.offer_letters
  add column if not exists candidate_name text,
  add column if not exists candidate_email text,
  add column if not exists template_id uuid references public.offer_templates(id),
  add column if not exists draft_body text,
  add column if not exists email_subject text,
  add column if not exists email_message text,
  add column if not exists sent_by uuid references public.profiles(id),
  add column if not exists metadata jsonb not null default '{}'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'offer-letters',
  'offer-letters',
  false,
  10485760,
  array[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "offer_letters_private_entity_access" on storage.objects;
create policy "offer_letters_private_entity_access"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'offer-letters'
  and (
    public.has_permission('offer:manage:entity', ((storage.foldername(name))[1])::uuid)
    or public.has_permission('document:manage:entity', ((storage.foldername(name))[1])::uuid)
  )
);

insert into public.permissions (code, description)
values
  ('offer:send:entity', 'Generate and send entity offer letters')
on conflict (code) do nothing;

insert into public.role_permissions (role, permission_id)
select role_name::public.app_role, p.id
from unnest(array['super_admin','admin','hr']::text[]) as role_name
cross join public.permissions p
where p.code = 'offer:send:entity'
on conflict do nothing;

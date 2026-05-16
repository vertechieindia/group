insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brand-assets',
  'brand-assets',
  true,
  5242880,
  array['image/png','image/jpeg','image/webp','image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "brand assets public read" on storage.objects;
create policy "brand assets public read"
on storage.objects for select
using (bucket_id = 'brand-assets');

drop policy if exists "brand assets entity upload" on storage.objects;
create policy "brand assets entity upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'brand-assets'
  and split_part(name, '/', 1) = public.current_entity_id()::text
  and (
    public.current_role() = 'super_admin'
    or public.has_permission('branding:manage:entity', public.current_entity_id())
  )
);

drop policy if exists "brand assets entity update" on storage.objects;
create policy "brand assets entity update"
on storage.objects for update to authenticated
using (
  bucket_id = 'brand-assets'
  and split_part(name, '/', 1) = public.current_entity_id()::text
  and (
    public.current_role() = 'super_admin'
    or public.has_permission('branding:manage:entity', public.current_entity_id())
  )
)
with check (
  bucket_id = 'brand-assets'
  and split_part(name, '/', 1) = public.current_entity_id()::text
  and (
    public.current_role() = 'super_admin'
    or public.has_permission('branding:manage:entity', public.current_entity_id())
  )
);

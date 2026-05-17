update public.business_entities be
set name = 'VerTechie Group LLC',
    legal_name = 'VerTechie Group LLC',
    brand_name = 'VerTechie Group LLC',
    slug = 'vertechie-group-llc',
    portal_slug = 'vertechie-group',
    updated_at = now()
where be.deleted_at is null
  and be.name = 'VerTechie LLC'
  and exists (
    select 1
    from public.profiles p
    where p.entity_id = be.id
      and p.role = 'super_admin'
      and p.deleted_at is null
  );

update public.business_entities be
set deleted_at = now(),
    updated_at = now()
where be.deleted_at is null
  and be.name = 'VerTechie'
  and not exists (
    select 1
    from public.profiles p
    where p.entity_id = be.id
      and p.deleted_at is null
  );

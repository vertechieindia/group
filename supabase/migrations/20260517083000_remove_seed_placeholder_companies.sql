update public.business_entities be
set deleted_at = now(),
    updated_at = now()
where be.slug in (
  'code4u-ai',
  'xerobookz',
  'favnfresh',
  'united-bible-hub',
  'united-cyber-hub',
  'united-sap-hub'
)
and be.deleted_at is null
and not exists (
  select 1
  from public.profiles p
  where p.entity_id = be.id
    and p.deleted_at is null
);

alter table public.business_entities
  add column if not exists home_state_business_id text,
  add column if not exists operating_state_registrations jsonb not null default '[]'::jsonb;

create index if not exists business_entities_operating_state_registrations_idx
  on public.business_entities using gin (operating_state_registrations);

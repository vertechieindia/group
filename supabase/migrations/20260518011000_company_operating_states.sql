alter table public.business_entities
  add column if not exists operating_states text[] not null default '{}';

update public.business_entities
set operating_states = array[company_home_state]
where cardinality(operating_states) = 0
  and company_home_state is not null;

create index if not exists business_entities_operating_states_idx
  on public.business_entities using gin (operating_states);

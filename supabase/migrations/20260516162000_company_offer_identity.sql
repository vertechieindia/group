alter table public.business_entities
  add column if not exists company_address text,
  add column if not exists company_ein text,
  add column if not exists e_verify_number text,
  add column if not exists company_home_state text,
  add column if not exists company_phone text,
  add column if not exists company_website text,
  add column if not exists hr_email text;

update public.business_entities
set company_home_state = coalesce(company_home_state, 'KS')
where company_home_state is null;

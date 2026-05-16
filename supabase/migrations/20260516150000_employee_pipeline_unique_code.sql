alter table public.employees
  add column if not exists unique_employee_code text,
  add column if not exists updated_resume_provided boolean not null default false,
  add column if not exists resume_status text not null default 'pending' check (resume_status in ('pending', 'received', 'reviewed', 'rejected')),
  add column if not exists offer_letter_status text not null default 'no_offer_letter' check (offer_letter_status in ('usc_offer_letter', 'gc_offer_letter', 'h1b_offer_letter', 'stem', 'initial_opt', 'cpt_offer_letter', 'no_offer_letter', 'gc_ead_offer_letter', 'h4_ead_offer_letter', 'l2s_offer_letter', 'terminated')),
  add column if not exists interview_prep_status text not null default 'pending' check (interview_prep_status in ('pending', 'scheduled', 'completed', 'failed')),
  add column if not exists interview_prep_count integer not null default 0,
  add column if not exists interview_feedback text,
  add column if not exists linkedin_review_status text not null default 'pending' check (linkedin_review_status in ('pending', 'reviewed', 'needs_update', 'approved')),
  add column if not exists marketing_status text not null default 'not_started' check (marketing_status in ('not_started', 'active', 'paused', 'stopped', 'placed')),
  add column if not exists marketing_technology text,
  add column if not exists candidate_status text not null default 'form_submission' check (candidate_status in ('form_submission', 'resume_done', 'linkedin_review', 'evaluation_call_1', 'evaluation_call_2', 'final_mock_interview', 'documents_done', 'active_marketing', 'placed', 'stopped_marketing')),
  add column if not exists recruiter_assigned_id uuid references public.profiles(id);

create unique index if not exists employees_entity_unique_employee_code_idx
  on public.employees(entity_id, unique_employee_code)
  where unique_employee_code is not null and deleted_at is null;

create index if not exists employees_pipeline_status_idx
  on public.employees(entity_id, marketing_status, candidate_status, recruiter_assigned_id)
  where deleted_at is null;

create or replace function public.generate_employee_unique_code(
  entity_name text,
  first_name text,
  dob text,
  ssn_last4 text
)
returns text
language plpgsql
immutable
as $$
declare
  company_part text;
  name_part text;
  dob_part text;
  ssn_part text;
begin
  company_part := upper(left(regexp_replace(coalesce(entity_name, 'COM'), '[^a-zA-Z0-9]', '', 'g'), 3));
  name_part := upper(left(regexp_replace(coalesce(first_name, 'EMP'), '[^a-zA-Z0-9]', '', 'g'), 3));
  dob_part := regexp_replace(coalesce(dob, ''), '[^0-9]', '', 'g');
  if length(dob_part) >= 8 then
    dob_part := substring(dob_part from 1 for 4);
  else
    dob_part := right(('0000' || dob_part), 4);
  end if;
  ssn_part := right(('0000' || regexp_replace(coalesce(ssn_last4, ''), '[^0-9]', '', 'g')), 4);
  return company_part || name_part || dob_part || ssn_part;
end;
$$;

create or replace function public.apply_onboarding_employee_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  entity_name text;
  first_name text;
  dob_value text;
  ssn_value text;
  generated_code text;
begin
  if new.employee_id is null or new.status not in ('submitted', 'approved') then
    return new;
  end if;

  select name into entity_name from public.business_entities where id = new.entity_id;
  first_name := coalesce(new.personal_info->>'first_name', new.personal_info->>'firstName');
  dob_value := coalesce(new.personal_info->>'dob', new.personal_info->>'date_of_birth', new.personal_info->>'dateOfBirth');
  ssn_value := coalesce(new.personal_info->>'ssn_last_4', new.personal_info->>'ssnLast4');

  if first_name is null or dob_value is null or ssn_value is null then
    return new;
  end if;

  generated_code := public.generate_employee_unique_code(entity_name, first_name, dob_value, ssn_value);

  update public.employees
  set unique_employee_code = generated_code,
      employee_number = generated_code,
      onboarding_status = case when new.status = 'approved' then 'approved' else 'submitted' end,
      updated_by = coalesce(new.updated_by, new.created_by),
      updated_at = now()
  where id = new.employee_id
    and entity_id = new.entity_id
    and deleted_at is null;

  return new;
end;
$$;

drop trigger if exists onboarding_form_submissions_employee_code on public.onboarding_form_submissions;
create trigger onboarding_form_submissions_employee_code
after insert or update of status, personal_info
on public.onboarding_form_submissions
for each row execute function public.apply_onboarding_employee_code();

alter table public.timesheet_entries
  drop constraint if exists timesheet_entries_timesheet_id_work_date_key;

create index if not exists timesheet_entries_timesheet_date_idx
  on public.timesheet_entries(timesheet_id, work_date);

import { TimesheetCalendarForm } from "@/components/timesheets/TimesheetCalendarForm";

export default function NewTimesheetPage() {
  return (
    <div className="grid gap-5">
      <div><h1 className="text-2xl font-semibold">New Timesheet</h1><p className="text-sm text-muted-foreground">Line-based weekly or monthly time capture for client, project, task, billable status, and daily hours.</p></div>
      <TimesheetCalendarForm />
    </div>
  );
}

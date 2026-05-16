import { TimesheetReviewQueue } from "@/components/accounts/TimesheetReviewQueue";

export default function AccountsTimesheetsPage() {
  return (
    <div className="grid gap-5">
      <div><h1 className="text-2xl font-semibold">Timesheet Operations</h1><p className="text-sm text-muted-foreground">Review submitted time, monitor payroll readiness, and export approved hours with company-level controls.</p></div>
      <TimesheetReviewQueue />
    </div>
  );
}

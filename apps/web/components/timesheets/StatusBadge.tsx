import { Badge } from "@vertechie/ui";
import type { TimesheetStatus } from "@vertechie/types";

const tone: Record<TimesheetStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "border-accent bg-accent/15 text-foreground",
  under_review: "border-accent bg-accent/15 text-foreground",
  approved: "border-primary bg-primary/10 text-primary",
  rejected: "border-destructive bg-destructive/10 text-destructive",
  correction_requested: "border-accent bg-accent/15 text-foreground",
  exported: "border-primary bg-primary/10 text-primary",
  locked: "bg-foreground text-white",
  client_paid: "border-sky-500 bg-sky-50 text-sky-700",
  employee_paid: "border-emerald-600 bg-emerald-50 text-emerald-700",
  deleted: "border-slate-500 bg-slate-100 text-slate-700"
};

export function StatusBadge({ status }: { status: TimesheetStatus }) {
  return <Badge className={tone[status]}>{status.replaceAll("_", " ")}</Badge>;
}

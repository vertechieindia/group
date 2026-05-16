import { TimesheetDetail } from "@/components/timesheets/TimesheetDetail";

export default function TimesheetPage({ params }: { params: { id: string } }) {
  return <TimesheetDetail id={params.id} />;
}

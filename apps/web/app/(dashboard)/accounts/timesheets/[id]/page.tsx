import { TimesheetReview } from "@/components/accounts/TimesheetReview";

export default function AccountTimesheetPage({ params }: { params: { id: string } }) {
  return <TimesheetReview id={params.id} />;
}

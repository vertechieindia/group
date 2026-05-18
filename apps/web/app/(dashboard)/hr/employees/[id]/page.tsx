import { EmployeeProfilePanel } from "@/components/hr/EmployeeProfilePanel";

export default function EmployeeProfilePage({ params }: { params: { id: string } }) {
  return <EmployeeProfilePanel employeeId={params.id} />;
}

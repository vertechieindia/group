import { redirectCompanyRoute } from "@/lib/company-redirect";

export default function CompanyHrEmployeesPage({ params }: { params: { company: string } }) {
  redirectCompanyRoute(params.company, "/hr/employees");
}

import { redirectCompanyRoute } from "@/lib/company-redirect";

export default function CompanyAdminDashboardPage({ params }: { params: { company: string } }) {
  redirectCompanyRoute(params.company, "/admin/dashboard");
}

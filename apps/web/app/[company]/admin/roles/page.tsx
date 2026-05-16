import { redirectCompanyRoute } from "@/lib/company-redirect";

export default function CompanyAdminRolesPage({ params }: { params: { company: string } }) {
  redirectCompanyRoute(params.company, "/admin/roles");
}

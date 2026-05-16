import { redirectCompanyRoute } from "@/lib/company-redirect";

export default function CompanyAdminUsersPage({ params }: { params: { company: string } }) {
  redirectCompanyRoute(params.company, "/admin/users");
}

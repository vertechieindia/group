import { redirectCompanyRoute } from "@/lib/company-redirect";

export default function CompanyAccountsProjectsPage({ params }: { params: { company: string } }) {
  redirectCompanyRoute(params.company, "/accounts/projects");
}

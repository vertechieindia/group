import { redirectCompanyRoute } from "@/lib/company-redirect";

export default function TenantCompanySetupPage({ params }: { params: { company: string } }) {
  redirectCompanyRoute(params.company, "/admin/company-setup");
}

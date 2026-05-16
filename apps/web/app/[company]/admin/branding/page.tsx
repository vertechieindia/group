import { redirectCompanyRoute } from "@/lib/company-redirect";

export default function CompanyAdminBrandingPage({ params }: { params: { company: string } }) {
  redirectCompanyRoute(params.company, "/admin/branding");
}

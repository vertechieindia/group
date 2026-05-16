import { redirectCompanyRoute } from "@/lib/company-redirect";

export default function CompanyHrOffersPage({ params }: { params: { company: string } }) {
  redirectCompanyRoute(params.company, "/hr/offers");
}

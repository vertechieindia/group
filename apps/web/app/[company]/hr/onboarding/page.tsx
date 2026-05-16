import { redirectCompanyRoute } from "@/lib/company-redirect";

export default function CompanyHrOnboardingPage({ params }: { params: { company: string } }) {
  redirectCompanyRoute(params.company, "/hr/onboarding");
}

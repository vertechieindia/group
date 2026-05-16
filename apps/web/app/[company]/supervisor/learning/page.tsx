import { redirectCompanyRoute } from "@/lib/company-redirect";

export default function CompanySupervisorLearningPage({ params }: { params: { company: string } }) {
  redirectCompanyRoute(params.company, "/supervisor/learning");
}

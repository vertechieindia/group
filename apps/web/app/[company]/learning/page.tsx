import { redirectCompanyRoute } from "@/lib/company-redirect";

export default function CompanyLearningPage({ params }: { params: { company: string } }) {
  redirectCompanyRoute(params.company, "/learning");
}

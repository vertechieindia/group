import { redirectCompanyRoute } from "@/lib/company-redirect";

export default function CompanyTimesheetsPage({ params }: { params: { company: string } }) {
  redirectCompanyRoute(params.company, "/timesheets");
}

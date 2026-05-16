import { redirectCompanyRoute } from "@/lib/company-redirect";

export default function CompanyAccountsInvoicesPage({ params }: { params: { company: string } }) {
  redirectCompanyRoute(params.company, "/accounts/invoices");
}

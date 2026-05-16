import { AccountsReportDashboard } from "@/components/accounts/AccountsReportDashboard";

export default function AccountsReportsPage() {
  return (
    <div className="grid gap-5">
      <div><h1 className="text-2xl font-semibold">Payroll Reports</h1><p className="text-sm text-muted-foreground">Payroll-ready summaries, entity totals, and client-wise approved billable hours.</p></div>
      <AccountsReportDashboard />
    </div>
  );
}

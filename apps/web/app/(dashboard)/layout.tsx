import { QueryProvider } from "@/components/QueryProvider";
import { DashboardShell } from "@/components/admin/DashboardShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <DashboardShell>{children}</DashboardShell>
    </QueryProvider>
  );
}

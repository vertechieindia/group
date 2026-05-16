"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpenCheck, BriefcaseBusiness, Building2, Clock3, FileSpreadsheet, MailPlus, Palette, Plus, ReceiptText, Rows3, ShieldCheck, UserCog, UsersRound } from "lucide-react";
import { Skeleton } from "@vertechie/ui";
import { useCurrentUser } from "@/features/admin/hooks";
import { TenantFavicon } from "@/components/branding/TenantFavicon";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useCurrentUser();
  const pathname = usePathname();
  const brandName = data?.entity.brandName || data?.entity.name || "Workforce OS";
  const logo = data?.entity.brandLogoUrl || "/logos/vertechie-logo.jpg";
  const canAdmin = data?.role === "super_admin" || data?.role === "admin" || data?.role === "company_admin";
  const canAccounts = canAdmin || data?.role === "accounts_manager";
  const canHr = canAdmin || data?.role === "hr";
  const canSupervisor = canAdmin || data?.role === "hr" || data?.role === "team_lead" || data?.role === "operations";
  const canSelfService = data?.role === "employee" || data?.role === "team_lead" || data?.role === "hr" || data?.role === "accounts_manager";
  const companySlug = data?.entity.portalSlug || data?.entity.slug;
  const linkClass = (href: string) => {
    const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
    return [
      "flex items-center gap-2 rounded-md px-3 py-2 font-medium transition",
      active ? "bg-primary text-white shadow-sm shadow-primary/20 [&_svg]:text-white" : "hover:bg-muted"
    ].join(" ");
  };

  return (
    <div className="min-h-screen">
      <TenantFavicon logoUrl={data?.entity.brandLogoUrl} />
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-border bg-white p-5 shadow-sm lg:flex">
        <div className="shrink-0">
          <Link className="flex items-center gap-3" href={companySlug ? `/${companySlug}` : "/"}>
            <span className="grid size-11 place-items-center rounded-lg border border-border bg-background">
              <Image alt={brandName} className="size-8 object-contain" height={40} src={logo} width={40} />
            </span>
            <span>
              <span className="block font-semibold">{brandName}</span>
              <span className="block text-xs text-muted-foreground">{isLoading ? "Loading workspace" : `${data?.role.replaceAll("_", " ")} portal`}</span>
            </span>
          </Link>
        </div>
        <nav className="mt-8 grid min-h-0 flex-1 content-start gap-1 overflow-y-auto pr-1 text-sm">
          {canSelfService && (
            <>
              <Link className={linkClass("/learning")} href="/learning"><BookOpenCheck className="size-4 text-primary" />My Learning</Link>
              <Link className={linkClass("/timesheets")} href="/timesheets"><Rows3 className="size-4 text-primary" />My Timesheets</Link>
              <Link className={linkClass("/timesheets/new")} href="/timesheets/new"><Plus className="size-4 text-primary" />New Timesheet</Link>
            </>
          )}
          {canAccounts && (
            <>
              <div className="mt-5 px-3 text-xs font-semibold uppercase text-muted-foreground">Accounts</div>
              <Link className={linkClass("/accounts/timesheets")} href="/accounts/timesheets"><Clock3 className="size-4 text-primary" />Timesheet Review</Link>
              <Link className={linkClass("/accounts/projects")} href="/accounts/projects"><BriefcaseBusiness className="size-4 text-primary" />Project Assignments</Link>
              <Link className={linkClass("/accounts/reports")} href="/accounts/reports"><FileSpreadsheet className="size-4 text-primary" />Payroll Reports</Link>
              <Link className={linkClass("/accounts/invoices")} href="/accounts/invoices"><ReceiptText className="size-4 text-primary" />Client Invoices</Link>
            </>
          )}
          {canHr && (
            <>
              <div className="mt-5 px-3 text-xs font-semibold uppercase text-muted-foreground">Employee Lifecycle</div>
              <Link className={linkClass("/hr/employees")} href="/hr/employees"><BriefcaseBusiness className="size-4 text-primary" />Employees</Link>
              <Link className={linkClass("/hr/onboarding")} href="/hr/onboarding"><MailPlus className="size-4 text-primary" />Onboarding</Link>
              <Link className={linkClass("/hr/offers")} href="/hr/offers"><FileSpreadsheet className="size-4 text-primary" />Offer Templates</Link>
            </>
          )}
          {canSupervisor && (
            <>
              <div className="mt-5 px-3 text-xs font-semibold uppercase text-muted-foreground">Supervisor</div>
              {!canAccounts && <Link className={linkClass("/accounts/timesheets")} href="/accounts/timesheets"><Clock3 className="size-4 text-primary" />Timesheet Approvals</Link>}
              <Link className={linkClass("/supervisor/learning")} href="/supervisor/learning"><BookOpenCheck className="size-4 text-primary" />Learning Materials</Link>
            </>
          )}
          {canAdmin && (
            <>
              <div className="mt-5 px-3 text-xs font-semibold uppercase text-muted-foreground">Administration</div>
              {data?.role === "super_admin" && <Link className={linkClass("/admin/dashboard")} href="/admin/dashboard"><Building2 className="size-4 text-primary" />Companies</Link>}
              <Link className={linkClass("/admin/users")} href="/admin/users"><UsersRound className="size-4 text-primary" />Users</Link>
              <Link className={linkClass("/admin/roles")} href="/admin/roles"><ShieldCheck className="size-4 text-primary" />Roles</Link>
              <Link className={linkClass("/admin/branding")} href="/admin/branding"><Palette className="size-4 text-primary" />Branding</Link>
            </>
          )}
        </nav>
        <div className="mt-4 shrink-0 rounded-lg border border-border bg-background p-4">
          {isLoading ? <Skeleton className="h-24" /> : (
            <>
              <UserCog className="size-5 text-primary" />
              <div className="mt-3 text-sm font-semibold">{data?.fullName}</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">{data?.email}</div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><BarChart3 className="size-4 text-primary" /> Entity scoped access</div>
            </>
          )}
        </div>
      </aside>
      <main className="lg:pl-72">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}

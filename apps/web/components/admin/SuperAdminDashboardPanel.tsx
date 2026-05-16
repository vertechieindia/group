"use client";

import Image from "next/image";
import { Building2, UsersRound } from "lucide-react";
import { Card, Skeleton } from "@vertechie/ui";
import { useAdminDashboard } from "@/features/admin/hooks";

export function SuperAdminDashboardPanel() {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading) {
    return <Skeleton className="h-80" />;
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Super Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Group-wide company and active-user visibility.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-3 text-muted-foreground"><Building2 className="size-5 text-primary" />Active companies</div>
          <div className="mt-3 text-3xl font-semibold">{data?.totalActiveCompanies ?? 0}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 text-muted-foreground"><UsersRound className="size-5 text-primary" />Total active users</div>
          <div className="mt-3 text-3xl font-semibold">{data?.totalActiveUsers ?? 0}</div>
        </Card>
      </div>
      <div className="grid gap-3">
        {(data?.companies ?? []).map((company) => (
          <Card className="p-4" key={company.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-lg border border-border bg-background">
                  {company.brandLogoUrl ? <Image alt={company.name} className="size-9 object-contain" height={44} src={company.brandLogoUrl} width={44} /> : <Building2 className="size-5 text-primary" />}
                </span>
                <div>
                  <div className="font-semibold">{company.brandName || company.name}</div>
                  <div className="text-xs text-muted-foreground">/{company.slug}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold">{company.activeUserCount}</div>
                <div className="text-xs text-muted-foreground">active users</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(company.roleCounts).map(([role, count]) => (
                <span className="rounded-full border border-border px-2.5 py-1 text-xs" key={role}>{role.replaceAll("_", " ")}: {count}</span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

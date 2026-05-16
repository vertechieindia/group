"use client";

import Link from "next/link";
import type { Timesheet } from "@vertechie/types";
import { Skeleton } from "@vertechie/ui";
import { StatusBadge } from "./StatusBadge";

const rowTone: Record<string, string> = {
  submitted: "border-l-4 border-l-amber-400",
  under_review: "border-l-4 border-l-amber-400",
  approved: "border-l-4 border-l-teal-600",
  rejected: "border-l-4 border-l-red-500",
  correction_requested: "border-l-4 border-l-orange-500",
  client_paid: "border-l-4 border-l-sky-500",
  employee_paid: "border-l-4 border-l-emerald-600",
  deleted: "border-l-4 border-l-slate-500 opacity-80"
};

export function TimesheetTable({
  rows,
  isLoading,
  accountView = false,
  showEntity = false,
  emptyMessage = "No timesheets found."
}: {
  rows?: Timesheet[];
  isLoading?: boolean;
  accountView?: boolean;
  showEntity?: boolean;
  emptyMessage?: string;
}) {
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Employee</th>
            {showEntity && <th className="px-4 py-3">Company</th>}
            <th className="px-4 py-3">Client</th>
            <th className="px-4 py-3">Period</th>
            <th className="px-4 py-3">Hours</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((row) => (
            <tr key={row.id} className={`border-t border-border hover:bg-muted/40 ${rowTone[row.status] ?? ""}`}>
              <td className="px-4 py-3 font-medium">
                <Link href={accountView ? `/accounts/timesheets/${row.id}` : `/timesheets/${row.id}`}>{row.employeeName ?? "Employee"}</Link>
              </td>
              {showEntity && <td className="px-4 py-3">{row.entityName ?? row.entityId}</td>}
              <td className="px-4 py-3">{row.clientName ?? "Unassigned"}</td>
              <td className="px-4 py-3">{row.periodStart} to {row.periodEnd}</td>
              <td className="px-4 py-3">{row.totalHours}</td>
              <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
            </tr>
          ))}
          {!rows?.length && (
            <tr>
              <td className="px-4 py-8 text-center text-muted-foreground" colSpan={showEntity ? 6 : 5}>{emptyMessage}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

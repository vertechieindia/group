"use client";

import Link from "next/link";
import { ArrowLeft, Download, FileText, Timer } from "lucide-react";
import { Badge, Card, Skeleton } from "@vertechie/ui";
import { useCurrentUser } from "@/features/admin/hooks";
import { useLifecycleEmployees } from "@/features/lifecycle/hooks";
import { useAccountTimesheets } from "@/features/timesheets/hooks";
import { StatusBadge } from "@/components/timesheets/StatusBadge";

export function EmployeeProfilePanel({ employeeId }: { employeeId: string }) {
  const { data: me } = useCurrentUser();
  const entityId = me?.role === "super_admin" ? undefined : me?.entity.id;
  const { data: employees, isLoading } = useLifecycleEmployees(entityId, Boolean(me));
  const employee = (employees ?? []).find((item) => item.id === employeeId);
  const timesheetFilters = employee ? { entityId: employee.entityId, employeeId: employee.id } : undefined;
  const { data: timesheets, isLoading: timesheetsLoading } = useAccountTimesheets(timesheetFilters, Boolean(employee));
  const totalStoredHours = (timesheets ?? []).reduce((sum, timesheet) => sum + timesheet.totalHours, 0);

  if (isLoading) return <Card className="p-6 text-sm text-muted-foreground">Loading employee profile...</Card>;
  if (!employee) return <Card className="p-6 text-sm text-muted-foreground">Employee profile was not found or is outside your company scope.</Card>;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline" href="/hr/employees"><ArrowLeft className="size-4" />Employee Lifecycle</Link>
          <h1 className="text-2xl font-semibold">{employee.fullName}</h1>
          <p className="text-sm text-muted-foreground">{employee.uniqueEmployeeCode || employee.employeeNumber} · {employee.email}</p>
        </div>
        <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-white px-4 text-sm font-medium text-foreground hover:bg-muted" href={`/hr/offers?employeeId=${employee.id}`}>
          <FileText className="size-4" />Issue offer letter
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Status</div>
          <div className="mt-3 grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3"><span>Account</span><Badge>{employee.isActive ? "Active" : "Terminated"}</Badge></div>
            <div className="flex items-center justify-between gap-3"><span>Onboarding</span><Badge>{employee.onboardingStatus.replaceAll("_", " ")}</Badge></div>
            <div className="flex items-center justify-between gap-3"><span>Offer</span><Badge>{employee.offerLetterStatus.replaceAll("_", " ")}</Badge></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Assignment</div>
          <div className="mt-3 grid gap-2 text-sm">
            <div><span className="text-muted-foreground">Category:</span> {employee.employeeType.replaceAll("_", " ")}</div>
            <div><span className="text-muted-foreground">Supervisor:</span> {employee.supervisorName || "Not assigned"}</div>
            <div><span className="text-muted-foreground">Recruiter:</span> {employee.recruiterName || "Not assigned"}</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Marketing</div>
          <div className="mt-3 grid gap-2 text-sm">
            <div><span className="text-muted-foreground">Status:</span> {employee.marketingStatus.replaceAll("_", " ")}</div>
            <div><span className="text-muted-foreground">Candidate:</span> {employee.candidateStatus.replaceAll("_", " ")}</div>
            <div><span className="text-muted-foreground">Technology:</span> {employee.marketingTechnology || "Not selected"}</div>
          </div>
        </Card>
      </div>
      <Card className="p-5">
        <h2 className="font-semibold">Profile details</h2>
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <div><span className="text-muted-foreground">Title:</span> {employee.title || "Not set"}</div>
          <div><span className="text-muted-foreground">Department:</span> {employee.department || "Not set"}</div>
          <div><span className="text-muted-foreground">Client:</span> {employee.clientName || "Not assigned"}</div>
          <div><span className="text-muted-foreground">Project:</span> {employee.projectName || "Not assigned"}</div>
          <div><span className="text-muted-foreground">Resume:</span> {employee.resumeStatus.replaceAll("_", " ")}</div>
          <div><span className="text-muted-foreground">LinkedIn:</span> {employee.linkedinReviewStatus.replaceAll("_", " ")}</div>
          <div className="md:col-span-2"><span className="text-muted-foreground">Interview feedback:</span> {employee.interviewFeedback || "No feedback recorded"}</div>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <div className="flex items-center gap-2">
              <Timer className="size-5 text-primary" />
              <h2 className="font-semibold">Time sheets</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Stored employee time records with PDF downloads.</p>
          </div>
          <div className="text-right text-sm">
            <div className="text-2xl font-semibold">{totalStoredHours.toFixed(2)}</div>
            <div className="text-muted-foreground">stored hours</div>
          </div>
        </div>
        {timesheetsLoading ? (
          <div className="p-5"><Skeleton className="h-28 w-full" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full text-left text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Client / Project</th>
                  <th className="px-4 py-3">Hours</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Download</th>
                </tr>
              </thead>
              <tbody>
                {(timesheets ?? []).map((timesheet) => (
                  <tr className="border-t border-border hover:bg-muted/40" key={timesheet.id}>
                    <td className="px-4 py-3 font-medium">
                      <Link className="hover:underline" href={`/accounts/timesheets/${timesheet.id}`}>{timesheet.periodStart} to {timesheet.periodEnd}</Link>
                      <div className="text-xs text-muted-foreground">{timesheet.periodType}</div>
                    </td>
                    <td className="px-4 py-3">{timesheet.clientName ?? "Unassigned"}<div className="text-xs text-muted-foreground">{timesheet.projectName ?? "No project"}</div></td>
                    <td className="px-4 py-3">{timesheet.totalHours.toFixed(2)}</td>
                    <td className="px-4 py-3"><StatusBadge status={timesheet.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <a className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-medium hover:bg-muted" href={`/api/timesheets/${timesheet.id}/export`}>
                        <Download className="size-4" />PDF
                      </a>
                    </td>
                  </tr>
                ))}
                {!timesheets?.length && (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>No timesheets have been submitted or saved for this employee yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

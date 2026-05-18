"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Badge, Card } from "@vertechie/ui";
import { useCurrentUser } from "@/features/admin/hooks";
import { useLifecycleEmployees } from "@/features/lifecycle/hooks";

export function EmployeeProfilePanel({ employeeId }: { employeeId: string }) {
  const { data: me } = useCurrentUser();
  const entityId = me?.role === "super_admin" ? undefined : me?.entity.id;
  const { data: employees, isLoading } = useLifecycleEmployees(entityId, Boolean(me));
  const employee = (employees ?? []).find((item) => item.id === employeeId);

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
    </div>
  );
}

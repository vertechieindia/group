"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, UserRoundCog } from "lucide-react";
import { Badge, Button, Card, Input, Select, Textarea } from "@vertechie/ui";
import type { LifecycleEmployee } from "@vertechie/types";
import { useCurrentUser } from "@/features/admin/hooks";
import { useLifecycleEmployees, useUpdateLifecycleEmployee } from "@/features/lifecycle/hooks";

const employeeTypeLabel: Record<LifecycleEmployee["employeeType"], string> = {
  unpaid: "Unpaid",
  paid_internal_bench: "Paid internal project / bench",
  paid_project: "Paid client project"
};

const resumeStatuses = [
  ["pending", "Pending"],
  ["received", "Received"],
  ["reviewed", "Reviewed"],
  ["rejected", "Rejected"]
] as const;

const offerLetterStatuses = [
  ["usc_offer_letter", "USC offer letter"],
  ["gc_offer_letter", "GC Offer Letter"],
  ["h1b_offer_letter", "H1B offer letter"],
  ["stem", "STEM"],
  ["initial_opt", "Initial OPT"],
  ["cpt_offer_letter", "CPT Offer Letter"],
  ["no_offer_letter", "No offer Letter"],
  ["gc_ead_offer_letter", "GC EAD offer Letter"],
  ["h4_ead_offer_letter", "H4 EAD offer Letter"],
  ["l2s_offer_letter", "L2S offer Letter"],
  ["terminated", "Terminated"]
] as const;

const interviewStatuses = [
  ["pending", "Pending"],
  ["scheduled", "Scheduled"],
  ["completed", "Completed"],
  ["failed", "Failed"]
] as const;

const linkedinStatuses = [
  ["pending", "Pending"],
  ["reviewed", "Reviewed"],
  ["needs_update", "Needs Update"],
  ["approved", "Approved"]
] as const;

const marketingStatuses = [
  ["not_started", "Not Started"],
  ["active", "Active"],
  ["paused", "Paused"],
  ["stopped", "Stopped"],
  ["placed", "Placed"]
] as const;

const marketingTechnologies = ["Data Engineer", "Data Analyst", "Data Scientist", "Java", ".NET", "SAP", "Oracle", "Testing", "Networking", "Cyber", "frontend", "Project Manager"];

const candidateStatuses = [
  ["form_submission", "Form Submission"],
  ["resume_done", "Resume Done"],
  ["linkedin_review", "LinkedIn Review"],
  ["evaluation_call_1", "Evaluation Call 1"],
  ["evaluation_call_2", "Evaluation Call 2"],
  ["final_mock_interview", "Final Mock Interview"],
  ["documents_done", "Documents Done"],
  ["active_marketing", "Active Marketing"],
  ["placed", "Placed"],
  ["stopped_marketing", "Stopped Marketing"]
] as const;

export function EmployeesLifecyclePanel() {
  const { data: me } = useCurrentUser();
  const entityId = me?.entity.id;
  const { data: employees, isLoading } = useLifecycleEmployees(entityId);
  const updateEmployee = useUpdateLifecycleEmployee();
  const [selectedId, setSelectedId] = useState("");
  const selected = useMemo(() => employees?.find((employee) => employee.id === selectedId), [employees, selectedId]);
  const [draft, setDraft] = useState({
    employeeType: "paid_project",
    supervisorId: "",
    clientName: "",
    projectName: "",
    updatedResumeProvided: false,
    resumeStatus: "pending",
    offerLetterStatus: "no_offer_letter",
    interviewPrepStatus: "pending",
    interviewPrepCount: "0",
    interviewFeedback: "",
    linkedinReviewStatus: "pending",
    marketingStatus: "not_started",
    marketingTechnology: "",
    candidateStatus: "form_submission",
    recruiterAssignedId: ""
  });

  useEffect(() => {
    if (!selected) return;
    setDraft({
      employeeType: selected.employeeType,
      supervisorId: selected.supervisorId ?? "",
      clientName: selected.clientName ?? "",
      projectName: selected.projectName ?? "",
      updatedResumeProvided: selected.updatedResumeProvided,
      resumeStatus: selected.resumeStatus,
      offerLetterStatus: selected.offerLetterStatus,
      interviewPrepStatus: selected.interviewPrepStatus,
      interviewPrepCount: String(selected.interviewPrepCount),
      interviewFeedback: selected.interviewFeedback ?? "",
      linkedinReviewStatus: selected.linkedinReviewStatus,
      marketingStatus: selected.marketingStatus,
      marketingTechnology: selected.marketingTechnology ?? "",
      candidateStatus: selected.candidateStatus,
      recruiterAssignedId: selected.recruiterAssignedId ?? ""
    });
  }, [selected]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !entityId) return;
    await updateEmployee.mutateAsync({
      entityId,
      employeeId: selected.id,
      employeeType: draft.employeeType as LifecycleEmployee["employeeType"],
      supervisorId: draft.supervisorId || null,
      clientName: draft.clientName || null,
      projectName: draft.projectName || null,
      updatedResumeProvided: draft.updatedResumeProvided,
      resumeStatus: draft.resumeStatus as LifecycleEmployee["resumeStatus"],
      offerLetterStatus: draft.offerLetterStatus as LifecycleEmployee["offerLetterStatus"],
      interviewPrepStatus: draft.interviewPrepStatus as LifecycleEmployee["interviewPrepStatus"],
      interviewPrepCount: Number(draft.interviewPrepCount || 0),
      interviewFeedback: draft.interviewFeedback || null,
      linkedinReviewStatus: draft.linkedinReviewStatus as LifecycleEmployee["linkedinReviewStatus"],
      marketingStatus: draft.marketingStatus as LifecycleEmployee["marketingStatus"],
      marketingTechnology: draft.marketingTechnology || null,
      candidateStatus: draft.candidateStatus as LifecycleEmployee["candidateStatus"],
      recruiterAssignedId: draft.recruiterAssignedId || null
    });
  }

  return (
    <div className="grid items-start gap-6">
      <div className="grid min-w-0 content-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Employee Lifecycle</h1>
          <p className="text-sm text-muted-foreground">Company-scoped employee profiles, onboarding status, supervisor assignment, and workforce category.</p>
        </div>
        <div className="w-full overflow-x-auto rounded-lg border border-border bg-white">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Marketing status</th><th className="px-4 py-3">Recruiter</th><th className="px-4 py-3">Candidate status</th><th className="px-4 py-3">Onboarding</th></tr>
            </thead>
            <tbody>
              {(employees ?? []).map((employee) => (
                <tr className={`cursor-pointer border-t border-border hover:bg-muted/40 ${selectedId === employee.id ? "bg-primary/5" : ""}`} key={employee.id} onClick={() => setSelectedId(employee.id)}>
                  <td className="px-4 py-3 font-medium">{employee.fullName}<div className="text-xs text-muted-foreground">{employee.uniqueEmployeeCode || employee.employeeNumber} · {employee.email}</div></td>
                  <td className="px-4 py-3">{employeeTypeLabel[employee.employeeType]}</td>
                  <td className="px-4 py-3"><StatusBadge status={employee.marketingStatus} label={labelFor(marketingStatuses, employee.marketingStatus)} /></td>
                  <td className="px-4 py-3">{employee.recruiterName || "Not assigned"}</td>
                  <td className="px-4 py-3"><StatusBadge status={employee.candidateStatus} label={labelFor(candidateStatuses, employee.candidateStatus)} /></td>
                  <td className="px-4 py-3"><Badge>{employee.onboardingStatus.replaceAll("_", " ")}</Badge></td>
                </tr>
              ))}
              {!isLoading && !employees?.length && <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={6}>No employees found for this company.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {selected && <Card className="h-fit p-5">
        <div className="flex items-center gap-2"><UserRoundCog className="size-5 text-primary" /><h2 className="font-semibold">Lifecycle controls</h2></div>
          <form className="mt-4 grid gap-3" onSubmit={submit}>
            <div className="rounded-md border border-border bg-background p-3 text-sm">
              <div className="font-semibold">{selected.fullName}</div>
              <div className="text-muted-foreground">{selected.uniqueEmployeeCode || selected.employeeNumber} · {selected.title ?? selected.department ?? "Employee"}</div>
              <div className="mt-2 grid gap-2 text-xs text-muted-foreground">
                <span>Supervisor: {selected.supervisorName || "Not assigned"}</span>
                <span>Recruiter: {selected.recruiterName || "Not assigned"}</span>
              </div>
            </div>
            <label className="text-sm font-medium">Employee category<Select value={draft.employeeType} onChange={(event) => setDraft((current) => ({ ...current, employeeType: event.target.value }))}>
              <option value="unpaid">Unpaid</option>
              <option value="paid_internal_bench">Paid for internal projects / on bench</option>
              <option value="paid_project">Paid employee on project</option>
            </Select></label>
            <label className="text-sm font-medium">Supervisor<Select value={draft.supervisorId} onChange={(event) => setDraft((current) => ({ ...current, supervisorId: event.target.value }))}>
              <option value="">No supervisor</option>
              {(employees ?? []).filter((employee) => employee.id !== selected.id).map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
            </Select></label>
            <label className="text-sm font-medium">Client<Input value={draft.clientName} onChange={(event) => setDraft((current) => ({ ...current, clientName: event.target.value }))} /></label>
            <label className="text-sm font-medium">Project<Input value={draft.projectName} onChange={(event) => setDraft((current) => ({ ...current, projectName: event.target.value }))} /></label>
            <div className="grid gap-3 border-t border-border pt-3">
              <label className="flex items-center gap-2 text-sm"><input checked={draft.updatedResumeProvided} type="checkbox" onChange={(event) => setDraft((current) => ({ ...current, updatedResumeProvided: event.target.checked }))} />Updated resume provided</label>
              <label className="text-sm font-medium">Resume status<Select value={draft.resumeStatus} onChange={(event) => setDraft((current) => ({ ...current, resumeStatus: event.target.value }))}>{resumeStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
              <label className="text-sm font-medium">Offer letter status<Select value={draft.offerLetterStatus} onChange={(event) => setDraft((current) => ({ ...current, offerLetterStatus: event.target.value }))}>{offerLetterStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">Interview prep status<Select value={draft.interviewPrepStatus} onChange={(event) => setDraft((current) => ({ ...current, interviewPrepStatus: event.target.value }))}>{interviewStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
                <label className="text-sm font-medium">Prep sessions<Input min={0} type="number" value={draft.interviewPrepCount} onChange={(event) => setDraft((current) => ({ ...current, interviewPrepCount: event.target.value }))} /></label>
              </div>
              <label className="text-sm font-medium">Team feedback<Textarea className="min-h-20" value={draft.interviewFeedback} onChange={(event) => setDraft((current) => ({ ...current, interviewFeedback: event.target.value }))} /></label>
              <label className="text-sm font-medium">LinkedIn review<Select value={draft.linkedinReviewStatus} onChange={(event) => setDraft((current) => ({ ...current, linkedinReviewStatus: event.target.value }))}>{linkedinStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
              <label className="text-sm font-medium">Marketing status<Select value={draft.marketingStatus} onChange={(event) => setDraft((current) => ({ ...current, marketingStatus: event.target.value }))}>{marketingStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
              <label className="text-sm font-medium">Marketing technology<Select value={draft.marketingTechnology} onChange={(event) => setDraft((current) => ({ ...current, marketingTechnology: event.target.value }))}>
                <option value="">Not selected</option>
                {marketingTechnologies.map((technology) => <option key={technology} value={technology}>{technology}</option>)}
              </Select></label>
              <label className="text-sm font-medium">Candidate status<Select value={draft.candidateStatus} onChange={(event) => setDraft((current) => ({ ...current, candidateStatus: event.target.value }))}>{candidateStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
              <label className="text-sm font-medium">Recruiter assigned<Select value={draft.recruiterAssignedId} onChange={(event) => setDraft((current) => ({ ...current, recruiterAssignedId: event.target.value }))}>
                <option value="">Not assigned</option>
                {(employees ?? []).map((employee) => <option key={employee.profileId} value={employee.profileId}>{employee.fullName}</option>)}
              </Select></label>
            </div>
            {updateEmployee.error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{updateEmployee.error.message}</div>}
            <Button disabled={updateEmployee.isPending} type="submit"><Save className="size-4" />Save employee lifecycle</Button>
          </form>
      </Card>}
    </div>
  );
}

function labelFor<T extends readonly (readonly [string, string])[]>(options: T, value: string) {
  return options.find(([key]) => key === value)?.[1] ?? value.replaceAll("_", " ");
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const className = status.includes("placed") || status === "active" || status === "reviewed" || status === "approved" || status === "completed"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : status.includes("stopped") || status === "rejected" || status === "failed" || status === "terminated"
      ? "border-red-200 bg-red-50 text-red-800"
      : status === "paused"
        ? "border-yellow-200 bg-yellow-50 text-yellow-800"
        : "border-amber-200 bg-amber-50 text-amber-800";
  return <Badge className={className}>{label}</Badge>;
}

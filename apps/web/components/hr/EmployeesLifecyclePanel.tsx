"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, ExternalLink, Save, UserRoundCog, X } from "lucide-react";
import { Badge, Button, Card, Input, Select, Textarea } from "@vertechie/ui";
import type { LifecycleEmployee } from "@vertechie/types";
import { useCurrentUser } from "@/features/admin/hooks";
import { useLifecycleEmployees, useTerminateEmployee, useUpdateLifecycleEmployee } from "@/features/lifecycle/hooks";

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
  ["no_offer_letter", "NA"],
  ["initial_opt", "Initial OPT"],
  ["stem", "STEM"],
  ["h1b_offer_letter", "H1B"],
  ["h4_ead_offer_letter", "H4 EAD"],
  ["gc_ead_offer_letter", "GC EAD"],
  ["gc_offer_letter", "GC"],
  ["usc_offer_letter", "USC"],
  ["cpt_offer_letter", "CPT"]
] as const;

const offerLetterLabels: Record<LifecycleEmployee["offerLetterStatus"], string> = {
  no_offer_letter: "NA",
  initial_opt: "Initial OPT",
  stem: "STEM",
  h1b_offer_letter: "H1B",
  h4_ead_offer_letter: "H4 EAD",
  gc_ead_offer_letter: "GC EAD",
  gc_offer_letter: "GC",
  usc_offer_letter: "USC",
  cpt_offer_letter: "CPT",
  l2s_offer_letter: "NA",
  terminated: "NA"
};

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
  const isSuperAdmin = me?.role === "super_admin";
  const entityId = isSuperAdmin ? undefined : me?.entity.id;
  const { data: employees, isLoading } = useLifecycleEmployees(entityId, Boolean(me));
  const updateEmployee = useUpdateLifecycleEmployee();
  const terminateEmployee = useTerminateEmployee();
  const [selectedId, setSelectedId] = useState("");
  const [filters, setFilters] = useState({ marketingStatus: "all", candidateStatus: "all", offerLetterStatus: "all" });
  const [terminationReason, setTerminationReason] = useState("");
  const selected = useMemo(() => employees?.find((employee) => employee.id === selectedId), [employees, selectedId]);
  const filteredEmployees = useMemo(() => (employees ?? []).filter((employee) => {
    if (filters.marketingStatus !== "all" && employee.marketingStatus !== filters.marketingStatus) return false;
    if (filters.candidateStatus !== "all" && employee.candidateStatus !== filters.candidateStatus) return false;
    if (filters.offerLetterStatus !== "all" && employee.offerLetterStatus !== filters.offerLetterStatus) return false;
    return true;
  }), [employees, filters]);
  const companyGroups = useMemo(() => {
    const groups = new Map<string, { id: string; name: string; slug: string | null; employees: LifecycleEmployee[] }>();
    for (const employee of filteredEmployees) {
      const id = employee.entityId;
      const existing = groups.get(id);
      if (existing) {
        existing.employees.push(employee);
      } else {
        groups.set(id, {
          id,
          name: employee.entityName || me?.entity.name || "Company",
          slug: employee.entitySlug ?? null,
          employees: [employee]
        });
      }
    }
    return Array.from(groups.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [filteredEmployees, me?.entity.name]);
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
    if (!selected) return;
    await updateEmployee.mutateAsync({
      entityId: selected.entityId,
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
        <Card className="grid gap-3 p-4 md:grid-cols-3">
          <label className="text-sm font-medium">Marketing status<Select value={filters.marketingStatus} onChange={(event) => setFilters((current) => ({ ...current, marketingStatus: event.target.value }))}>
            <option value="all">All marketing statuses</option>
            {marketingStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select></label>
          <label className="text-sm font-medium">Candidate status<Select value={filters.candidateStatus} onChange={(event) => setFilters((current) => ({ ...current, candidateStatus: event.target.value }))}>
            <option value="all">All candidate statuses</option>
            {candidateStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select></label>
          <label className="text-sm font-medium">Offer letter<Select value={filters.offerLetterStatus} onChange={(event) => setFilters((current) => ({ ...current, offerLetterStatus: event.target.value }))}>
            <option value="all">All offer letters</option>
            {offerLetterStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select></label>
        </Card>
        <div className="grid gap-4">
          {companyGroups.map((company) => (
            <Card className="overflow-hidden" key={company.id}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-4 py-3">
                <div className="flex items-center gap-2">
                  <Building2 className="size-5 text-primary" />
                  <div>
                    <div className="font-semibold">{company.name}</div>
                    <div className="text-xs text-muted-foreground">{company.employees.length} employees{company.slug ? ` · /${company.slug}` : ""}</div>
                  </div>
                </div>
              </div>
              <div className="w-full overflow-x-auto">
                <table className="min-w-[1120px] w-full text-left text-sm">
                  <thead className="bg-muted text-xs uppercase text-muted-foreground">
                    <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Offer Letter</th><th className="px-4 py-3">Marketing status</th><th className="px-4 py-3">Recruiter</th><th className="px-4 py-3">Candidate status</th><th className="px-4 py-3">Onboarding</th></tr>
                  </thead>
                  <tbody>
                    {company.employees.map((employee) => (
                      <tr className={`cursor-pointer border-t border-border hover:bg-muted/40 ${selectedId === employee.id ? "bg-primary/5" : ""}`} key={employee.id} onClick={() => setSelectedId((current) => current === employee.id ? "" : employee.id)}>
                        <td className="px-4 py-3 font-medium">
                          <Link className="inline-flex items-center gap-1 text-primary hover:underline" href={`/hr/employees/${employee.id}`} onClick={(event) => event.stopPropagation()}>
                            {employee.fullName}<ExternalLink className="size-3" />
                          </Link>
                          <div className="text-xs text-muted-foreground">{employee.uniqueEmployeeCode || employee.employeeNumber} · {employee.email}{!employee.isActive ? " · terminated" : ""}</div>
                        </td>
                        <td className="px-4 py-3">{employeeTypeLabel[employee.employeeType]}</td>
                        <td className="px-4 py-3"><OfferBadge status={employee.offerLetterStatus} /></td>
                        <td className="px-4 py-3"><StatusBadge status={employee.marketingStatus} label={labelFor(marketingStatuses, employee.marketingStatus)} /></td>
                        <td className="px-4 py-3">{employee.recruiterName || "Not assigned"}</td>
                        <td className="px-4 py-3"><StatusBadge status={employee.candidateStatus} label={labelFor(candidateStatuses, employee.candidateStatus)} /></td>
                        <td className="px-4 py-3"><Badge>{employee.onboardingStatus.replaceAll("_", " ")}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
          {!isLoading && !employees?.length && (
            <Card className="px-4 py-10 text-center text-sm text-muted-foreground">No employees found.</Card>
          )}
        </div>
      </div>
      {selected && <Card className="h-fit p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2"><UserRoundCog className="size-5 text-primary" /><h2 className="font-semibold">Lifecycle controls</h2></div>
          <button className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" type="button" onClick={() => setSelectedId("")} aria-label="Close lifecycle controls"><X className="size-4" /></button>
        </div>
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
          <div className="mt-5 grid gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div className="font-semibold text-destructive">Terminate employee access</div>
            <p className="text-sm text-muted-foreground">This deactivates the user profile, blocks login, marks lifecycle and offer status as terminated, and emails the termination notice.</p>
            <Textarea className="min-h-24" placeholder="Termination reason and final HR notes" value={terminationReason} onChange={(event) => setTerminationReason(event.target.value)} />
            <Button
              className="bg-destructive hover:bg-destructive/90"
              disabled={terminationReason.trim().length < 10 || terminateEmployee.isPending || !selected.isActive}
              type="button"
              onClick={() => {
                if (window.confirm(`Terminate ${selected.fullName}? Their account login will be disabled.`)) {
                  terminateEmployee.mutate({ employeeId: selected.id, input: { entityId: selected.entityId, reason: terminationReason, effectiveDate: new Date().toISOString().slice(0, 10) } });
                  setTerminationReason("");
                }
              }}
            >
              {selected.isActive ? "Terminate and send notice" : "Employee already terminated"}
            </Button>
            {terminateEmployee.error && <div className="rounded-md border border-destructive/30 bg-white px-3 py-2 text-sm text-destructive">{terminateEmployee.error.message}</div>}
          </div>
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

function OfferBadge({ status }: { status: LifecycleEmployee["offerLetterStatus"] }) {
  const label = offerLetterLabels[status];
  const className = label === "NA"
    ? "border-slate-200 bg-slate-50 text-slate-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return <Badge className={className}>{label}</Badge>;
}

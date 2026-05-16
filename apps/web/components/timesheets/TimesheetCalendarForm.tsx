"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, FileUp, Save, Send, X } from "lucide-react";
import { Badge, Button, Card, Input, SecondaryButton, Select, Skeleton, Textarea } from "@vertechie/ui";
import { useCurrentUser } from "@/features/admin/hooks";
import { useCreateTimesheet, useTimesheetContext } from "@/features/timesheets/hooks";
import { createBrowserSupabaseClient } from "@/features/timesheets/supabase-browser";

type DayEntry = {
  hours: number;
  notes: string;
  isBillable: boolean;
  dayType: "work" | "paid_leave" | "unpaid_leave" | "paid_holiday" | "unpaid_holiday";
  isPaid: boolean;
};

const dayTypeOptions = [
  { value: "work", label: "Work", paid: true },
  { value: "paid_leave", label: "Paid leave", paid: true },
  { value: "unpaid_leave", label: "Unpaid leave", paid: false },
  { value: "paid_holiday", label: "Paid holiday", paid: true },
  { value: "unpaid_holiday", label: "Unpaid holiday", paid: false }
] as const;

function toDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(value: string) {
  const date = toDate(value);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return isoDate(date);
}

function endOfWeek(value: string) {
  return addDays(startOfWeek(value), 6);
}

function startOfMonth(value: string) {
  const date = toDate(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function endOfMonth(value: string) {
  const date = toDate(value);
  return isoDate(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)));
}

function addDays(day: string, amount: number) {
  const date = toDate(day);
  date.setUTCDate(date.getUTCDate() + amount);
  return isoDate(date);
}

function addMonths(day: string, amount: number) {
  const date = toDate(day);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return isoDate(date);
}

function daysBetween(start: string, end: string) {
  const days: string[] = [];
  const cursor = toDate(start);
  const last = toDate(end);
  while (cursor <= last) {
    days.push(isoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function monthGrid(monthStart: string) {
  const start = startOfWeek(monthStart);
  const end = endOfWeek(endOfMonth(monthStart));
  return daysBetween(start, end);
}

function prettyRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${formatter.format(toDate(start))} - ${formatter.format(toDate(end))}`;
}

function monthLabel(day: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(toDate(day));
}

function weekday(day: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(toDate(day));
}

export function TimesheetCalendarForm() {
  const createTimesheet = useCreateTimesheet();
  const { data: me } = useCurrentUser();
  const { data: context, isLoading: contextLoading, error: contextError } = useTimesheetContext();
  const [periodType, setPeriodType] = useState<"weekly" | "monthly">("weekly");
  const [anchorDate, setAnchorDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [fallbackClient, setFallbackClient] = useState("");
  const [fallbackProject, setFallbackProject] = useState("");
  const [employeeNotes, setEmployeeNotes] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [entries, setEntries] = useState<Record<string, DayEntry>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const logo = me?.entity.brandLogoUrl || "/logos/vertechie-logo.jpg";

  const periodStart = periodType === "weekly" ? startOfWeek(anchorDate) : startOfMonth(anchorDate);
  const periodEnd = periodType === "weekly" ? endOfWeek(anchorDate) : endOfMonth(anchorDate);
  const periodDays = useMemo(() => daysBetween(periodStart, periodEnd), [periodStart, periodEnd]);
  const visibleDays = useMemo(() => periodType === "weekly" ? periodDays : monthGrid(periodStart), [periodDays, periodStart, periodType]);
  const selectedProject = context?.assignedProjects.find((project) => project.id === selectedProjectId);
  const currentClient = selectedProject?.clientName ?? fallbackClient;
  const currentProject = selectedProject?.projectName ?? fallbackProject;

  useEffect(() => {
    if (!context) return;
    const defaultProject = context.assignedProjects.find((project) => project.isDefault) ?? context.assignedProjects[0];
    setSelectedProjectId(defaultProject?.id ?? "");
    setFallbackClient(defaultProject?.clientName ?? context.defaultClientName ?? "");
    setFallbackProject(defaultProject?.projectName ?? context.defaultProjectName ?? "");
  }, [context]);

  const totals = useMemo(() => {
    const activeEntries = periodDays.map((day) => entries[day]).filter(Boolean);
    const total = activeEntries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
    const billable = activeEntries.filter((entry) => entry.isBillable).reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
    const paid = activeEntries.filter((entry) => entry.isPaid).reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
    const unpaid = total - paid;
    return { total, billable, nonBillable: total - billable, paid, unpaid };
  }, [entries, periodDays]);

  function updateDay(day: string, patch: Partial<DayEntry>) {
    setEntries((current) => ({
      ...current,
      [day]: {
        hours: current[day]?.hours ?? 0,
        notes: current[day]?.notes ?? "",
        isBillable: current[day]?.isBillable ?? true,
        dayType: current[day]?.dayType ?? "work",
        isPaid: current[day]?.isPaid ?? true,
        ...patch
      }
    }));
  }

  function movePeriod(direction: -1 | 1) {
    setAnchorDate((current) => periodType === "weekly" ? addDays(current, direction * 7) : addMonths(current, direction));
  }

  async function save(submit: boolean) {
    if (!context) return;
    setSubmitError(null);
    const saveEntries = periodDays
      .map((day) => ({ day, entry: entries[day] }))
      .filter(({ entry }) => entry && (Number(entry.hours) > 0 || entry.dayType !== "work"))
      .map(({ day, entry }) => ({
        workDate: day,
        hoursWorked: Number(entry?.hours ?? 0),
        isBillable: entry?.isBillable ?? true,
        dayType: entry?.dayType ?? "work",
        isPaid: entry?.isPaid ?? true,
        clientName: currentClient || null,
        projectName: currentProject || null,
        taskDescription: entry?.notes || null
      }));

    if (!saveEntries.length) {
      setSubmitError("Enter hours on at least one calendar day.");
      return;
    }
    if (!currentClient || !currentProject) {
      setSubmitError("Choose an assigned project or enter a client and project.");
      return;
    }

    try {
      const created = await createTimesheet.mutateAsync({
        entityId: context.entityId,
        employeeId: context.employeeId,
        periodType,
        periodStart,
        periodEnd,
        clientName: currentClient,
        projectName: currentProject,
        employeeNotes,
        entries: saveEntries
      });
      await uploadPendingAttachments(created.id, context.entityId, context.employeeId, pendingFiles);
      if (submit) {
        const response = await fetch(`/api/timesheets/${created.id}/submit`, { method: "POST" });
        if (!response.ok) throw new Error("Timesheet saved, but submit failed.");
      }
      window.location.href = `/timesheets/${created.id}`;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save timesheet.");
    }
  }

  async function uploadPendingAttachments(timesheetId: string, entityId: string, employeeId: string, files: File[]) {
    if (!files.length) return;
    const supabase = createBrowserSupabaseClient();
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${entityId}/${employeeId}/${timesheetId}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage.from("timesheet-attachments").upload(path, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream"
      });
      if (error) throw error;
      const attachResponse = await fetch(`/api/timesheets/${timesheetId}/attachments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          filePath: path,
          fileType: file.type || null,
          fileSize: file.size,
          attachmentType: "client_approved_timecard"
        })
      });
      if (!attachResponse.ok) throw new Error("Timesheet saved, but attachment registration failed.");
    }
  }

  if (contextLoading) return <Skeleton className="h-[520px] w-full" />;
  if (contextError || !context) {
    return <div className="rounded-lg border border-destructive/30 bg-white p-6 text-sm text-destructive">Your employee profile is required before timesheets can be created.</div>;
  }

  return (
    <div className="grid gap-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-lg border border-border bg-white">
                <Image alt={me?.entity.brandName || context.entityName} className="size-9 object-contain" height={40} src={logo} width={40} unoptimized />
              </span>
              <span>
                <span className="flex items-center gap-2 text-sm font-semibold text-primary"><CalendarDays className="size-4" />Time capture</span>
                <h2 className="mt-1 text-2xl font-semibold">{context.employeeName}</h2>
                <span className="text-sm text-muted-foreground">Employee ID: {context.employeeNumber} · {context.entityName}</span>
              </span>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[170px_210px]">
            <label className="text-sm font-medium">Period<Select value={periodType} onChange={(event) => setPeriodType(event.target.value as "weekly" | "monthly")}><option value="weekly">Weekly</option><option value="monthly">Monthly</option></Select></label>
            <label className="text-sm font-medium">Date<Input type={periodType === "monthly" ? "month" : "date"} value={periodType === "monthly" ? anchorDate.slice(0, 7) : anchorDate} onChange={(event) => setAnchorDate(periodType === "monthly" ? `${event.target.value}-01` : event.target.value)} /></label>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
            <label className="text-sm font-medium">Assigned project<Select value={selectedProjectId} onChange={(event) => {
              setSelectedProjectId(event.target.value);
              const project = context.assignedProjects.find((item) => item.id === event.target.value);
              if (project) {
                setFallbackClient(project.clientName);
                setFallbackProject(project.projectName);
              }
            }}>
              <option value="">Manual client/project</option>
              {context.assignedProjects.map((project) => <option key={project.id} value={project.id}>{project.clientName} · {project.projectName}</option>)}
            </Select></label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm font-medium">Client<Input disabled={Boolean(selectedProject)} value={fallbackClient} onChange={(event) => setFallbackClient(event.target.value)} /></label>
              <label className="text-sm font-medium">Project<Input disabled={Boolean(selectedProject)} value={fallbackProject} onChange={(event) => setFallbackProject(event.target.value)} /></label>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <SecondaryButton onClick={() => movePeriod(-1)} type="button"><ChevronLeft className="size-4" />Previous</SecondaryButton>
            <SecondaryButton onClick={() => setAnchorDate(new Date().toISOString().slice(0, 10))} type="button">Today</SecondaryButton>
            <SecondaryButton onClick={() => movePeriod(1)} type="button">Next<ChevronRight className="size-4" /></SecondaryButton>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Metric label={periodType === "weekly" ? "Week" : "Month"} value={periodType === "weekly" ? prettyRange(periodStart, periodEnd) : monthLabel(periodStart)} />
          <Metric label="Total hours" value={totals.total.toFixed(2)} />
          <Metric label="Paid hours" value={totals.paid.toFixed(2)} />
          <Metric label="Unpaid hours" value={totals.unpaid.toFixed(2)} />
        </div>
      </Card>

      {periodType === "weekly" ? (
        <WeeklyCalendar days={periodDays} entries={entries} updateDay={updateDay} />
      ) : (
        <MonthlyCalendar monthStart={periodStart} days={visibleDays} entries={entries} updateDay={updateDay} />
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <h2 className="font-semibold">Notes and client-approved sheet</h2>
          <Textarea className="mt-3 min-h-32" placeholder="Optional notes for the reviewer" value={employeeNotes} onChange={(event) => setEmployeeNotes(event.target.value)} />
          <div className="mt-4 rounded-lg border border-dashed border-border bg-background p-4">
            <div className="flex items-center gap-2 font-medium"><FileUp className="size-4 text-primary" />Attach before saving</div>
            <p className="mt-1 text-xs text-muted-foreground">Client-approved timecards are uploaded after the draft record is created and attached before you leave this page.</p>
            <Input
              className="mt-3"
              multiple
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => setPendingFiles(Array.from(event.target.files ?? []))}
            />
            <div className="mt-3 grid gap-2">
              {pendingFiles.map((file) => (
                <div className="flex items-center justify-between rounded-md border border-border bg-white px-3 py-2 text-sm" key={`${file.name}-${file.size}`}>
                  <span>{file.name}</span>
                  <button className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => setPendingFiles((current) => current.filter((item) => item !== file))} type="button" aria-label={`Remove ${file.name}`}><X className="size-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Ready to submit</h2>
          <div className="mt-3 grid gap-2 text-sm">
            <ChecklistRow label="Project selected" ready={Boolean(currentClient && currentProject)} />
            <ChecklistRow label="Time entered" ready={totals.total > 0} />
            <ChecklistRow label="Timecard attachment" text={pendingFiles.length ? `${pendingFiles.length} ready` : "Optional"} />
          </div>
          {submitError && <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</div>}
          {createTimesheet.error && <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{createTimesheet.error.message}</div>}
          <div className="mt-4 grid gap-2">
            <SecondaryButton disabled={createTimesheet.isPending} onClick={() => save(false)} type="button"><Save className="size-4" />Save draft</SecondaryButton>
            <Button disabled={createTimesheet.isPending} onClick={() => save(true)} type="button"><Send className="size-4" />Submit for approval</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-border bg-background p-4"><div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div><div className="mt-2 text-xl font-semibold">{value}</div></div>;
}

function ChecklistRow({ label, ready, text }: { label: string; ready?: boolean; text?: string }) {
  return <div className="flex items-center justify-between rounded-md border border-border px-3 py-2"><span>{label}</span><Badge>{text ?? (ready ? "Ready" : "Needed")}</Badge></div>;
}

function WeeklyCalendar({ days, entries, updateDay }: { days: string[]; entries: Record<string, DayEntry>; updateDay: (day: string, patch: Partial<DayEntry>) => void }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><h2 className="text-xl font-semibold">Weekly timecard</h2><p className="text-sm text-muted-foreground">Fill hours directly on each date.</p></div>
        <div className="text-right text-sm text-muted-foreground">Week total<div className="text-xl font-semibold text-foreground">{days.reduce((sum, day) => sum + Number(entries[day]?.hours ?? 0), 0).toFixed(2)}</div></div>
      </div>
      <div className="grid gap-3 md:grid-cols-7">
        {days.map((day) => <DayCard day={day} entry={entries[day]} key={day} updateDay={updateDay} />)}
      </div>
    </Card>
  );
}

function MonthlyCalendar({ monthStart, days, entries, updateDay }: { monthStart: string; days: string[]; entries: Record<string, DayEntry>; updateDay: (day: string, patch: Partial<DayEntry>) => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-5">
        <h2 className="text-xl font-semibold">Monthly calendar</h2>
        <p className="text-sm text-muted-foreground">Enter the timecard inside each calendar day.</p>
      </div>
      <div className="grid grid-cols-7 border-b border-border bg-muted text-center text-xs font-semibold uppercase text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div className="px-3 py-2" key={day}>{day}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const muted = day.slice(0, 7) !== monthStart.slice(0, 7);
          return <MonthDay day={day} entry={entries[day]} key={day} muted={muted} updateDay={updateDay} />;
        })}
      </div>
    </Card>
  );
}

function DayCard({ day, entry, updateDay }: { day: string; entry?: DayEntry; updateDay: (day: string, patch: Partial<DayEntry>) => void }) {
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div><div className="text-xs font-semibold uppercase text-muted-foreground">{weekday(day)}</div><div className="text-2xl font-semibold">{toDate(day).getUTCDate()}</div></div>
        <Badge>{Number(entry?.hours ?? 0).toFixed(2)} hrs</Badge>
      </div>
      <Input className="mt-3 text-lg font-semibold" min={0} max={24} step={0.25} type="number" value={entry?.hours ?? ""} onChange={(event) => updateDay(day, { hours: Number(event.target.value) })} placeholder="0" />
      <Select className="mt-3" value={entry?.dayType ?? "work"} onChange={(event) => {
        const selected = dayTypeOptions.find((option) => option.value === event.target.value) ?? dayTypeOptions[0];
        updateDay(day, { dayType: selected.value, isPaid: selected.paid, isBillable: selected.value === "work" ? entry?.isBillable ?? true : false });
      }}>
        {dayTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
      <label className="mt-3 flex items-center gap-2 text-sm"><input checked={entry?.isBillable ?? true} disabled={(entry?.dayType ?? "work") !== "work"} onChange={(event) => updateDay(day, { isBillable: event.target.checked })} type="checkbox" />Billable</label>
      <Textarea className="mt-3 min-h-20" placeholder="Notes" value={entry?.notes ?? ""} onChange={(event) => updateDay(day, { notes: event.target.value })} />
    </div>
  );
}

function MonthDay({ day, entry, muted, updateDay }: { day: string; entry?: DayEntry; muted: boolean; updateDay: (day: string, patch: Partial<DayEntry>) => void }) {
  return (
    <div className={`min-h-36 border-b border-r border-border p-2 ${muted ? "bg-muted/40 text-muted-foreground" : "bg-white"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold">{toDate(day).getUTCDate()}</div>
        {Number(entry?.hours ?? 0) > 0 && <Badge>{Number(entry?.hours ?? 0).toFixed(2)}</Badge>}
      </div>
      {!muted && (
        <div className="mt-2 grid gap-2">
          <Input className="h-9 text-sm" min={0} max={24} step={0.25} type="number" value={entry?.hours ?? ""} onChange={(event) => updateDay(day, { hours: Number(event.target.value) })} placeholder="Hours" />
          <Select className="h-9 text-xs" value={entry?.dayType ?? "work"} onChange={(event) => {
            const selected = dayTypeOptions.find((option) => option.value === event.target.value) ?? dayTypeOptions[0];
            updateDay(day, { dayType: selected.value, isPaid: selected.paid, isBillable: selected.value === "work" ? entry?.isBillable ?? true : false });
          }}>
            {dayTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Textarea className="min-h-14 text-xs" placeholder="Notes" value={entry?.notes ?? ""} onChange={(event) => updateDay(day, { notes: event.target.value })} />
          <label className="flex items-center gap-2 text-xs"><input checked={entry?.isBillable ?? true} disabled={(entry?.dayType ?? "work") !== "work"} onChange={(event) => updateDay(day, { isBillable: event.target.checked })} type="checkbox" />Billable</label>
        </div>
      )}
    </div>
  );
}

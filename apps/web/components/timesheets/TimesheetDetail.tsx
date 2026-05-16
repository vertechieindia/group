"use client";

import { Download, Send } from "lucide-react";
import type { TimesheetEntry } from "@vertechie/types";
import { Button, Card, Skeleton } from "@vertechie/ui";
import { useTimesheet } from "@/features/timesheets/hooks";
import { StatusBadge } from "./StatusBadge";
import { AttachmentUploader } from "./AttachmentUploader";

export function TimesheetDetail({ id }: { id: string }) {
  const { data, isLoading, error } = useTimesheet(id);
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !data) return <div className="rounded-lg border border-destructive bg-white p-6 text-destructive">Unable to load timesheet.</div>;

  const days = daysBetween(data.periodStart, data.periodEnd);
  const lines = groupEntries(data.entries);

  return (
    <div className="grid gap-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{data.clientName ?? "Unassigned client"}</h1>
            <p className="text-sm text-muted-foreground">{data.periodStart} to {data.periodEnd} · {data.totalHours} total hours</p>
          </div>
          <StatusBadge status={data.status} />
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Client / project</th>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Type</th>
                {days.map((day) => <th className="px-3 py-3 text-center" key={day}>{day.slice(5)}</th>)}
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr className="border-t border-border" key={line.key}>
                  <td className="px-4 py-3 font-medium">{line.clientName || "Unassigned"}<div className="text-xs text-muted-foreground">{line.projectName || "No project"}</div></td>
                  <td className="px-4 py-3">{line.taskDescription || "No notes"}</td>
                  <td className="px-4 py-3">{line.dayType.replaceAll("_", " ")} · {line.isPaid ? "paid" : "unpaid"} · {line.isBillable ? "billable" : "non-billable"}</td>
                  {days.map((day) => <td className="px-3 py-3 text-center" key={day}>{line.hours[day] ? line.hours[day].toFixed(2) : "-"}</td>)}
                  <td className="px-4 py-3 text-right font-semibold">{line.total.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-t border-border bg-muted/40 font-semibold">
                <td className="px-4 py-3" colSpan={3}>Daily totals</td>
                {days.map((day) => <td className="px-3 py-3 text-center" key={day}>{sumDay(lines, day).toFixed(2)}</td>)}
                <td className="px-4 py-3 text-right">{data.totalHours.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold">Attachments</h2>
        <div className="mt-3 grid gap-2">
          {["draft", "correction_requested"].includes(data.status) && (
            <AttachmentUploader timesheetId={data.id} entityId={data.entityId} employeeId={data.employeeId} />
          )}
          {data.attachments.map((attachment) => (
            <a className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm" href={attachment.signedUrl} key={attachment.id}>
              {attachment.fileName}<Download className="size-4" />
            </a>
          ))}
          {!data.attachments.length && <div className="text-sm text-muted-foreground">No attachments uploaded.</div>}
        </div>
      </Card>
      {["draft", "correction_requested"].includes(data.status) && (
        <Button onClick={() => fetch(`/api/timesheets/${id}/submit`, { method: "POST" })}><Send className="size-4" />Submit timesheet</Button>
      )}
    </div>
  );
}

function daysBetween(start: string, end: string) {
  const days: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function groupEntries(entries: TimesheetEntry[]) {
  const grouped = new Map<string, { key: string; clientName: string | null; projectName: string | null; taskDescription: string | null; isBillable: boolean; isPaid: boolean; dayType: string; hours: Record<string, number>; total: number }>();
  for (const entry of entries) {
    const key = `${entry.clientName ?? ""}|${entry.projectName ?? ""}|${entry.taskDescription ?? ""}|${entry.dayType}|${entry.isPaid}|${entry.isBillable}`;
    const current = grouped.get(key) ?? { key, clientName: entry.clientName ?? null, projectName: entry.projectName ?? null, taskDescription: entry.taskDescription ?? null, isBillable: entry.isBillable, isPaid: entry.isPaid, dayType: entry.dayType, hours: {}, total: 0 };
    current.hours[entry.workDate] = (current.hours[entry.workDate] ?? 0) + Number(entry.hoursWorked ?? 0);
    current.total += Number(entry.hoursWorked ?? 0);
    grouped.set(key, current);
  }
  return Array.from(grouped.values());
}

function sumDay(lines: ReturnType<typeof groupEntries>, day: string) {
  return lines.reduce((sum, line) => sum + Number(line.hours[day] ?? 0), 0);
}

"use client";

import { useMemo, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { Button, Card, Input, Select } from "@vertechie/ui";
import { useCurrentUser, useEntities } from "@/features/admin/hooks";
import { queryString } from "@/features/timesheets/api";
import { useAccountTimesheets } from "@/features/timesheets/hooks";
import { TimesheetTable } from "@/components/timesheets/TimesheetTable";

export function TimesheetReviewQueue() {
  const { data: currentUser } = useCurrentUser();
  const isGroupAdmin = currentUser?.role === "super_admin" || currentUser?.role === "admin";
  const { data: entities } = useEntities(isGroupAdmin);
  const [entityId, setEntityId] = useState("");
  const [status, setStatus] = useState("");
  const [client, setClient] = useState("");
  const [month, setMonth] = useState("");
  const filters = useMemo(
    () => ({
      entityId: entityId || undefined,
      status: status as any || undefined,
      client: client || undefined,
      month: month || undefined
    }),
    [client, entityId, month, status]
  );
  const { data, isLoading } = useAccountTimesheets(filters);
  const pendingReview = data?.filter((row) => ["submitted", "under_review"].includes(row.status)).length ?? 0;
  const payrollReady = data?.filter((row) => ["approved", "exported"].includes(row.status)).length ?? 0;
  const needsEmployeeAction = data?.filter((row) => ["rejected", "correction_requested", "deleted"].includes(row.status)).length ?? 0;
  const totalHours = data?.reduce((sum, row) => sum + row.totalHours, 0) ?? 0;
  const hasFilters = Boolean(entityId || status || client || month);
  const exportHref = `/api/accounts/timesheets/export${queryString({ ...filters, status: "approved" })}`;
  const emptyMessage = hasFilters
    ? "No submitted timesheets match the selected filters."
    : isGroupAdmin
      ? "No submitted timesheets exist across active companies yet. Once employees submit time, this page will show group-wide review, approval, payment, and export status."
      : "No employee-submitted timesheets are waiting for this company yet.";

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-4"><div className="text-xs uppercase text-muted-foreground">Needs review</div><div className="mt-1 text-2xl font-semibold">{pendingReview}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase text-muted-foreground">Payroll ready</div><div className="mt-1 text-2xl font-semibold">{payrollReady}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase text-muted-foreground">Employee action</div><div className="mt-1 text-2xl font-semibold">{needsEmployeeAction}</div></Card>
        <Card className="p-4"><div className="text-xs uppercase text-muted-foreground">Total hours in view</div><div className="mt-1 text-2xl font-semibold">{totalHours.toFixed(2)}</div></Card>
      </div>
      <div className="grid gap-3 rounded-lg border border-border bg-white p-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        {isGroupAdmin && (
          <Select value={entityId} onChange={(event) => setEntityId(event.target.value)}>
            <option value="">All companies</option>
            {(entities ?? []).map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
          </Select>
        )}
        <Input placeholder="Client" value={client} onChange={(event) => setClient(event.target.value)} />
        <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="correction_requested">Correction requested</option>
          <option value="exported">Exported</option>
          <option value="client_paid">Client paid</option>
          <option value="employee_paid">Employee paid</option>
          <option value="deleted">Deleted for refill</option>
        </Select>
        <Button
          disabled={!hasFilters}
          className="border border-border bg-white text-foreground hover:bg-muted disabled:opacity-50"
          onClick={() => {
            setEntityId("");
            setClient("");
            setMonth("");
            setStatus("");
          }}
        >
          <RotateCcw className="size-4" />Reset
        </Button>
      </div>
      <TimesheetTable rows={data} isLoading={isLoading} accountView showEntity={isGroupAdmin && !entityId} emptyMessage={emptyMessage} />
      <a className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" href={exportHref}><Download className="size-4" />Export approved payroll CSV</a>
    </div>
  );
}

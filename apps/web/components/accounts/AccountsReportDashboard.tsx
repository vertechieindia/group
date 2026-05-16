"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, Card, Input, Skeleton } from "@vertechie/ui";
import { currencyNumber } from "@vertechie/utils";
import { useTimesheetReports } from "@/features/timesheets/hooks";

export function AccountsReportDashboard() {
  const [range, setRange] = useState(defaultRange);
  const filters = useMemo(() => ({
    startDate: range.startDate || undefined,
    endDate: range.endDate || undefined
  }), [range]);
  const { data, isLoading } = useTimesheetReports(filters);
  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;

  const payrollMetrics = [
    ["Total Employees", data.totalEmployees],
    ["Payable (On Bench)", data.payableBenchEmployees],
    ["Payable (On Client Project)", data.payableProjectEmployees],
    ["Unpaid Employees", data.unpaidEmployees],
    ["Total Salaries", `$${currencyNumber(data.totalSalaryAmount)}`],
    ["Hourly Payable", `$${currencyNumber(data.hourlyPayrollAmount)}`]
  ];
  const timesheetMetrics = [
    ["Pending", data.pendingTimesheets],
    ["Approved", data.approvedTimesheets],
    ["Rejected", data.rejectedTimesheets],
    ["Corrections", data.correctionRequested],
    ["Submitted Hours", data.totalSubmittedHours],
    ["Billable Hours", data.approvedBillableHours]
  ];

  return (
    <div className="grid gap-6">
      <Card className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-semibold">Payroll reporting period</h2>
            <p className="text-sm text-muted-foreground">Filter employee payable status, salaries, and timesheet totals by date range.</p>
          </div>
          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[180px_180px_auto]">
            <label className="text-sm font-medium">Start date<Input type="date" value={range.startDate} onChange={(event) => setRange((current) => ({ ...current, startDate: event.target.value }))} /></label>
            <label className="text-sm font-medium">End date<Input type="date" value={range.endDate} onChange={(event) => setRange((current) => ({ ...current, endDate: event.target.value }))} /></label>
            <Button className="self-end bg-white text-foreground ring-1 ring-border hover:bg-muted" type="button" onClick={() => setRange(defaultRange)}>This month</Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {payrollMetrics.map(([label, value]) => (
          <Card className="p-4" key={label}>
            <div className="text-xs uppercase text-muted-foreground">{label}</div>
            <div className="mt-2 text-2xl font-semibold">{typeof value === "number" ? currencyNumber(value) : value}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {timesheetMetrics.map(([label, value]) => (
          <Card className="p-4" key={label}>
            <div className="text-xs uppercase text-muted-foreground">{label}</div>
            <div className="mt-2 text-2xl font-semibold">{currencyNumber(Number(value))}</div>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <h2 className="font-semibold">Entity-wise hours</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.entityWiseHours}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="entityName" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="approvedHours" fill="hsl(var(--primary))" />
              <Bar dataKey="pendingReview" fill="hsl(var(--accent))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-semibold">Employee payroll summary</h2>
          <p className="text-sm text-muted-foreground">Counts and salary totals come from employee lifecycle and project assignment records.</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Salary</th><th className="px-4 py-3">Hourly Payable</th><th className="px-4 py-3">Approved Hours</th></tr>
          </thead>
          <tbody>
            {data.payrollEmployees.map((employee) => (
              <tr className="border-t border-border" key={employee.employeeId}>
                <td className="px-4 py-3 font-medium">{employee.employeeName}<div className="text-xs text-muted-foreground">{employee.employeeNumber}</div></td>
                <td className="px-4 py-3">{employeeTypeLabel(employee.employeeType)}</td>
                <td className="px-4 py-3">${currencyNumber(employee.salaryAmount)}</td>
                <td className="px-4 py-3">${currencyNumber(employee.hourlyAmount)}</td>
                <td className="px-4 py-3">{currencyNumber(employee.approvedHours)}</td>
              </tr>
            ))}
            {!data.payrollEmployees.length && <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>No employees found for this entity.</td></tr>}
          </tbody>
        </table>
      </Card>
      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Client</th><th className="px-4 py-3">Approved Hours</th><th className="px-4 py-3">Billable Hours</th></tr></thead>
          <tbody>{data.clientWiseHours.map((row) => <tr className="border-t border-border" key={row.clientName}><td className="px-4 py-3">{row.clientName}</td><td className="px-4 py-3">{row.approvedHours}</td><td className="px-4 py-3">{row.billableHours}</td></tr>)}</tbody>
        </table>
      </Card>
    </div>
  );
}

function defaultRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)).toISOString().slice(0, 10);
  return { startDate: start, endDate: end };
}

function employeeTypeLabel(type: string) {
  if (type === "paid_internal_bench") return "Payable (On Bench)";
  if (type === "paid_project") return "Payable (On Client Project)";
  if (type === "unpaid") return "Unpaid";
  return type;
}

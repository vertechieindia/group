import { describe, expect, it } from "vitest";
import { createTimesheetSchema, timesheetStatuses } from "@vertechie/types";

describe("timesheet schemas", () => {
  it("accepts weekly calendar entries with billable and task metadata", () => {
    const parsed = createTimesheetSchema.parse({
      entityId: "00000000-0000-4000-8000-000000000001",
      employeeId: "00000000-0000-4000-8000-000000000002",
      periodType: "weekly",
      periodStart: "2026-05-11",
      periodEnd: "2026-05-17",
      clientName: "Acme",
      projectName: "Payroll integration",
      entries: [{ workDate: "2026-05-11", hoursWorked: 8, isBillable: true, dayType: "work", isPaid: true, taskDescription: "Implementation" }]
    });

    expect(parsed.entries[0].hoursWorked).toBe(8);
  });

  it("includes every required operational status", () => {
    expect(timesheetStatuses).toEqual([
      "draft",
      "submitted",
      "under_review",
      "approved",
      "rejected",
      "correction_requested",
      "exported",
      "locked",
      "client_paid",
      "employee_paid",
      "deleted"
    ]);
  });
});

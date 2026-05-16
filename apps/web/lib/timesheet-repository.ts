import type { SupabaseClient } from "@supabase/supabase-js";
import type { ListTimesheetsInput, Timesheet, TimesheetStatus } from "@vertechie/types";

const timesheetSelect = `
  id, entity_id, employee_id, client_name, project_name, period_type, period_start, period_end, status,
  total_hours, billable_hours, non_billable_hours, employee_notes, reviewer_comments,
  submitted_at, reviewed_at, approved_at, rejected_at, exported_at, client_payment_received_at, employee_paid_at, deleted_for_refill_at,
  business_entities!timesheets_entity_id_fkey(name),
  employees!inner(id, profile_id, profiles!employees_profile_id_fkey!inner(full_name)),
  timesheet_entries(id, work_date, hours_worked, is_billable, day_type, is_paid, client_name, project_name, task_description),
  timesheet_attachments(id, file_name, file_path, file_type, file_size, attachment_type, created_at)
`;

export class TimesheetRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async list(filters: ListTimesheetsInput) {
    let query = this.supabase.from("timesheets").select(timesheetSelect).is("deleted_at", null).order("created_at", { ascending: false });

    if (filters.entityId) query = query.eq("entity_id", filters.entityId);
    if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.client) query = query.ilike("client_name", `%${filters.client}%`);
    if (filters.weekStart) query = query.eq("period_start", filters.weekStart);
    if (filters.startDate) query = query.gte("period_end", filters.startDate);
    if (filters.endDate) query = query.lte("period_start", filters.endDate);
    if (filters.month) {
      query = query.gte("period_start", `${filters.month}-01`).lt("period_start", nextMonth(filters.month));
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapTimesheet);
  }

  async get(id: string) {
    const { data, error } = await this.supabase.from("timesheets").select(timesheetSelect).eq("id", id).is("deleted_at", null).single();
    if (error) throw error;
    return mapTimesheet(data);
  }

  async create(payload: Record<string, unknown>, entries: Record<string, unknown>[]) {
    const { data, error } = await this.supabase.from("timesheets").insert(payload).select("id").single();
    if (error) throw error;

    if (entries.length) {
      const { error: entryError } = await this.supabase.from("timesheet_entries").insert(entries.map((entry) => ({ ...entry, timesheet_id: data.id })));
      if (entryError) throw entryError;
    }

    return this.get(data.id);
  }

  async update(id: string, payload: Record<string, unknown>, entries?: Record<string, unknown>[]) {
    const { error } = await this.supabase.from("timesheets").update(payload).eq("id", id);
    if (error) throw error;

    if (entries) {
      await this.supabase.from("timesheet_entries").delete().eq("timesheet_id", id);
      if (entries.length) {
        const current = await this.get(id);
        const { error: entryError } = await this.supabase
          .from("timesheet_entries")
          .insert(entries.map((entry) => ({ ...entry, timesheet_id: id, entity_id: current.entityId })));
        if (entryError) throw entryError;
      }
    }

    return this.get(id);
  }

  async setStatus(id: string, status: TimesheetStatus, payload: Record<string, unknown>) {
    const { error } = await this.supabase.from("timesheets").update({ status, ...payload }).eq("id", id);
    if (error) throw error;
    return this.get(id);
  }

  async addActivity(payload: Record<string, unknown>) {
    const { error } = await this.supabase.from("timesheet_activity").insert(payload);
    if (error) throw error;
  }

  async addAttachment(payload: Record<string, unknown>) {
    const { data, error } = await this.supabase.from("timesheet_attachments").insert(payload).select("id").single();
    if (error) throw error;
    return data.id as string;
  }
}

function mapTimesheet(row: any): Timesheet {
  const employee = relation(row.employees);
  const employeeProfile = relation(employee?.profiles);
  return {
    id: row.id,
    entityId: row.entity_id,
    entityName: relation(row.business_entities)?.name,
    employeeId: row.employee_id,
    employeeProfileId: employee?.profile_id,
    employeeName: employeeProfile?.full_name,
    clientName: row.client_name,
    projectName: row.project_name,
    periodType: row.period_type,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status,
    totalHours: Number(row.total_hours ?? 0),
    billableHours: Number(row.billable_hours ?? 0),
    nonBillableHours: Number(row.non_billable_hours ?? 0),
    employeeNotes: row.employee_notes,
    reviewerComments: row.reviewer_comments,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    exportedAt: row.exported_at,
    clientPaymentReceivedAt: row.client_payment_received_at,
    employeePaidAt: row.employee_paid_at,
    deletedForRefillAt: row.deleted_for_refill_at,
    entries: (row.timesheet_entries ?? []).map((entry: any) => ({
      id: entry.id,
      workDate: entry.work_date,
      hoursWorked: Number(entry.hours_worked ?? 0),
      isBillable: entry.is_billable,
      dayType: entry.day_type ?? "work",
      isPaid: entry.is_paid ?? true,
      clientName: entry.client_name,
      projectName: entry.project_name,
      taskDescription: entry.task_description
    })),
    attachments: (row.timesheet_attachments ?? []).map((attachment: any) => ({
      id: attachment.id,
      fileName: attachment.file_name,
      filePath: attachment.file_path,
      fileType: attachment.file_type,
      fileSize: attachment.file_size,
      attachmentType: attachment.attachment_type,
      createdAt: attachment.created_at
    }))
  };
}

function relation<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

function nextMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
}

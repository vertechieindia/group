import type { AttachmentCompleteInput, CreateTimesheetInput, ListTimesheetsInput, ReviewTimesheetInput, Timesheet, TimesheetContext, UpdateTimesheetInput } from "@vertechie/types";
import { createAdminSupabaseClient } from "@vertechie/db";
import { assertEntityScope, hasPermission, requirePermission, type RequestContext } from "./request-context";
import { TimesheetRepository } from "./timesheet-repository";
import { writeAudit } from "./audit";
import { notifyEntityRole, notifyProfile } from "./notifications";

export class TimesheetService {
  private readonly repo: TimesheetRepository;
  private readonly admin = createAdminSupabaseClient();
  private readonly adminRepo: TimesheetRepository;

  constructor(private readonly ctx: RequestContext) {
    this.repo = new TimesheetRepository(ctx.supabase);
    this.adminRepo = new TimesheetRepository(this.admin);
  }

  async list(filters: ListTimesheetsInput) {
    if (filters.entityId) await assertEntityScope(this.ctx, filters.entityId);
    return this.repo.list(filters);
  }

  async context(): Promise<TimesheetContext> {
    const { data: employee, error } = await this.admin
      .from("employees")
      .select("id, entity_id, employee_number, client_name, project_name, profiles!employees_profile_id_fkey(full_name), business_entities!employees_entity_id_fkey(name)")
      .eq("profile_id", this.ctx.profile.id)
      .is("deleted_at", null)
      .single();
    if (error || !employee) throw new Error("EMPLOYEE_PROFILE_NOT_FOUND");

    const { data: assignments } = await this.admin
      .from("employee_project_assignments")
      .select("id, entity_id, employee_id, client_name, project_name, role_name, rate_type, bill_rate, start_date, end_date, is_default")
      .eq("employee_id", employee.id)
      .eq("entity_id", employee.entity_id)
      .is("deleted_at", null)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    const { data: recentRows } = await this.admin
      .from("timesheets")
      .select("client_name, project_name")
      .eq("employee_id", employee.id)
      .is("deleted_at", null)
      .not("client_name", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    const recentClients = Array.from(
      new Map(
        (recentRows ?? [])
          .filter((row: any) => row.client_name)
          .map((row: any) => [`${row.client_name}|${row.project_name ?? ""}`, { clientName: row.client_name, projectName: row.project_name }])
      ).values()
    );

    const profile = Array.isArray(employee.profiles) ? employee.profiles[0] : employee.profiles;
    const entity = Array.isArray(employee.business_entities) ? employee.business_entities[0] : employee.business_entities;

    return {
      entityId: employee.entity_id,
      entityName: entity?.name ?? this.ctx.profile.entityId,
      employeeId: employee.id,
      employeeName: profile?.full_name ?? this.ctx.profile.fullName,
      employeeNumber: employee.employee_number,
      defaultClientName: employee.client_name,
      defaultProjectName: employee.project_name,
      assignedProjects: (assignments ?? []).map((row: any) => ({
        id: row.id,
        entityId: row.entity_id,
        employeeId: row.employee_id,
        clientName: row.client_name,
        projectName: row.project_name,
        roleName: row.role_name,
        rateType: row.rate_type ?? "hourly",
        billRate: row.bill_rate == null ? null : Number(row.bill_rate),
        startDate: row.start_date,
        endDate: row.end_date,
        isDefault: row.is_default
      })),
      recentClients
    };
  }

  async listForAccounts(filters: ListTimesheetsInput) {
    const entityId = filters.entityId ?? (this.ctx.profile.role === "super_admin" || this.ctx.profile.role === "admin" ? undefined : this.ctx.profile.entityId);
    if (!entityId) {
      await requirePermission(this.ctx, "timesheet:view:all");
      return this.repo.list(filters);
    }

    await assertEntityScope(this.ctx, entityId);
    if (this.ctx.profile.role === "team_lead") {
      const supervisedEmployeeIds = await this.supervisedEmployeeIds(entityId);
      if (!supervisedEmployeeIds.length) throw new Error("FORBIDDEN");
      const rows = await this.adminRepo.list({ ...filters, entityId });
      return rows.filter((timesheet) => supervisedEmployeeIds.includes(timesheet.employeeId));
    }
    if (await hasPermission(this.ctx, "timesheet:view:entity", entityId)) {
      return this.repo.list({ ...filters, entityId });
    }

    const supervisedEmployeeIds = await this.supervisedEmployeeIds(entityId);
    if (!supervisedEmployeeIds.length) throw new Error("FORBIDDEN");
    const rows = await this.adminRepo.list({ ...filters, entityId });
    return rows.filter((timesheet) => supervisedEmployeeIds.includes(timesheet.employeeId));
  }

  async get(id: string) {
    const timesheet = await this.repo.get(id);
    await assertEntityScope(this.ctx, timesheet.entityId);
    return this.withSignedUrls(timesheet);
  }

  async create(input: CreateTimesheetInput) {
    await assertEntityScope(this.ctx, input.entityId);
    await requirePermission(this.ctx, "timesheet:create:self", input.entityId);
    await this.assertOwnEmployee(input.employeeId);
    const timesheet = await this.repo.create(
      {
        entity_id: input.entityId,
        employee_id: input.employeeId,
        client_name: input.clientName,
        project_name: input.projectName,
        period_type: input.periodType,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        employee_notes: input.employeeNotes,
        created_by: this.ctx.profile.id,
        updated_by: this.ctx.profile.id
      },
      input.entries.map((entry) => ({
        entity_id: input.entityId,
        work_date: entry.workDate,
        hours_worked: entry.hoursWorked,
        is_billable: entry.isBillable,
        day_type: entry.dayType,
        is_paid: entry.isPaid,
        client_name: entry.clientName,
        project_name: entry.projectName,
        task_description: entry.taskDescription,
        created_by: this.ctx.profile.id,
        updated_by: this.ctx.profile.id
      }))
    );
    await this.recordActivity(timesheet, "created", null, "draft");
    await writeAudit(this.ctx, { action: "timesheet.created", resourceType: "timesheet", resourceId: timesheet.id, entityId: timesheet.entityId });
    return timesheet;
  }

  async update(id: string, input: UpdateTimesheetInput) {
    const current = await this.repo.get(id);
    await assertEntityScope(this.ctx, current.entityId);
    await requirePermission(this.ctx, "timesheet:edit:self", current.entityId);
    if (!["draft", "correction_requested"].includes(current.status)) throw new Error("TIMESHEET_LOCKED");
    await this.assertOwnEmployee(current.employeeId);

    const updated = await this.repo.update(
      id,
      {
        client_name: input.clientName,
        project_name: input.projectName,
        period_type: input.periodType,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        employee_notes: input.employeeNotes,
        updated_by: this.ctx.profile.id
      },
      input.entries?.map((entry) => ({
        work_date: entry.workDate,
        hours_worked: entry.hoursWorked,
        is_billable: entry.isBillable,
        day_type: entry.dayType,
        is_paid: entry.isPaid,
        client_name: entry.clientName,
        project_name: entry.projectName,
        task_description: entry.taskDescription,
        created_by: this.ctx.profile.id,
        updated_by: this.ctx.profile.id
      }))
    );
    await writeAudit(this.ctx, { action: "timesheet.updated", resourceType: "timesheet", resourceId: id, entityId: updated.entityId });
    return updated;
  }

  async submit(id: string) {
    const current = await this.repo.get(id);
    await assertEntityScope(this.ctx, current.entityId);
    await requirePermission(this.ctx, "timesheet:submit:self", current.entityId);
    await this.assertOwnEmployee(current.employeeId);
    if (!["draft", "correction_requested"].includes(current.status)) throw new Error("INVALID_STATUS_TRANSITION");

    const updated = await this.repo.setStatus(id, "submitted", { submitted_at: new Date().toISOString(), updated_by: this.ctx.profile.id });
    await this.recordActivity(updated, "submitted", current.status, "submitted");
    await writeAudit(this.ctx, { action: "timesheet.submitted", resourceType: "timesheet", resourceId: id, entityId: updated.entityId });
    const supervisorProfileId = await this.getSupervisorProfileId(updated.employeeId);
    if (supervisorProfileId) {
      await notifyProfile(this.ctx, {
        entityId: updated.entityId,
        recipientId: supervisorProfileId,
        type: "timesheet_submitted",
        title: "Timesheet awaiting supervisor review",
        body: `${updated.employeeName ?? "An employee"} submitted ${updated.periodType} hours for approval.`,
        payload: { timesheetId: id }
      });
    } else {
      await notifyEntityRole(this.ctx, {
        entityId: updated.entityId,
        role: "accounts_manager",
        type: "timesheet_submitted",
        title: "Timesheet submitted",
        body: `${updated.employeeName ?? "An employee"} submitted ${updated.periodType} hours for review.`,
        payload: { timesheetId: id }
      });
    }
    return updated;
  }

  async approve(id: string, input: ReviewTimesheetInput) {
    const current = await this.adminRepo.get(id);
    await assertEntityScope(this.ctx, current.entityId);
    await this.assertCanReviewTimesheet(current, "timesheet:approve:entity");
    if (!["submitted", "under_review"].includes(current.status)) throw new Error("INVALID_STATUS_TRANSITION");
    const updated = await this.adminRepo.setStatus(id, "approved", {
      reviewer_comments: input.comments,
      reviewed_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
      reviewed_by: this.ctx.profile.id,
      approved_by: this.ctx.profile.id,
      updated_by: this.ctx.profile.id
    });
    await this.afterReview(current, updated, "approved", input.comments);
    return updated;
  }

  async reject(id: string, input: ReviewTimesheetInput) {
    const current = await this.adminRepo.get(id);
    await assertEntityScope(this.ctx, current.entityId);
    await this.assertCanReviewTimesheet(current, "timesheet:reject:entity");
    if (!["submitted", "under_review"].includes(current.status)) throw new Error("INVALID_STATUS_TRANSITION");
    if (!input.comments?.trim()) throw new Error("REJECTION_REASON_REQUIRED");
    const updated = await this.adminRepo.setStatus(id, "rejected", {
      reviewer_comments: input.comments,
      reviewed_at: new Date().toISOString(),
      rejected_at: new Date().toISOString(),
      reviewed_by: this.ctx.profile.id,
      updated_by: this.ctx.profile.id
    });
    await this.afterReview(current, updated, "rejected", input.comments);
    return updated;
  }

  async requestCorrection(id: string, input: ReviewTimesheetInput) {
    const current = await this.adminRepo.get(id);
    await assertEntityScope(this.ctx, current.entityId);
    await this.assertCanReviewTimesheet(current, "timesheet:request_correction:entity");
    const updated = await this.adminRepo.setStatus(id, "correction_requested", {
      reviewer_comments: input.comments,
      reviewed_at: new Date().toISOString(),
      reviewed_by: this.ctx.profile.id,
      updated_by: this.ctx.profile.id
    });
    await this.afterReview(current, updated, "correction_requested", input.comments);
    return updated;
  }

  async markClientPaid(id: string, input: ReviewTimesheetInput) {
    const current = await this.repo.get(id);
    await assertEntityScope(this.ctx, current.entityId);
    await requirePermission(this.ctx, "timesheet:payment:entity", current.entityId);
    if (!["approved", "exported"].includes(current.status)) throw new Error("INVALID_STATUS_TRANSITION");
    const updated = await this.repo.setStatus(id, "client_paid", {
      reviewer_comments: input.comments ?? current.reviewerComments,
      client_payment_received_at: new Date().toISOString(),
      reviewed_by: this.ctx.profile.id,
      updated_by: this.ctx.profile.id
    });
    await this.afterReview(current, updated, "client_paid", input.comments);
    return updated;
  }

  async markEmployeePaid(id: string, input: ReviewTimesheetInput) {
    const current = await this.repo.get(id);
    await assertEntityScope(this.ctx, current.entityId);
    await requirePermission(this.ctx, "timesheet:payment:entity", current.entityId);
    if (!["client_paid", "approved", "exported"].includes(current.status)) throw new Error("INVALID_STATUS_TRANSITION");
    const updated = await this.repo.setStatus(id, "employee_paid", {
      reviewer_comments: input.comments ?? current.reviewerComments,
      employee_paid_at: new Date().toISOString(),
      reviewed_by: this.ctx.profile.id,
      updated_by: this.ctx.profile.id
    });
    await this.afterReview(current, updated, "employee_paid", input.comments);
    return updated;
  }

  async deleteForRefill(id: string, input: ReviewTimesheetInput) {
    const current = await this.repo.get(id);
    await assertEntityScope(this.ctx, current.entityId);
    await requirePermission(this.ctx, "timesheet:delete_refill:entity", current.entityId);
    if (!input.comments?.trim()) throw new Error("REJECTION_REASON_REQUIRED");
    const updated = await this.repo.setStatus(id, "deleted", {
      reviewer_comments: input.comments,
      deleted_for_refill_at: new Date().toISOString(),
      deleted_for_refill_by: this.ctx.profile.id,
      reviewed_by: this.ctx.profile.id,
      updated_by: this.ctx.profile.id
    });
    await this.afterReview(current, updated, "deleted_for_refill", input.comments);
    return updated;
  }

  async attach(id: string, input: AttachmentCompleteInput) {
    const current = await this.repo.get(id);
    await assertEntityScope(this.ctx, current.entityId);
    await requirePermission(this.ctx, "timesheet_attachment:upload:self", current.entityId);
    const idValue = await this.repo.addAttachment({
      timesheet_id: id,
      entity_id: current.entityId,
      file_name: input.fileName,
      file_path: input.filePath,
      file_type: input.fileType,
      file_size: input.fileSize,
      attachment_type: input.attachmentType,
      uploaded_by: this.ctx.profile.id,
      created_by: this.ctx.profile.id,
      updated_by: this.ctx.profile.id
    });
    await writeAudit(this.ctx, { action: "timesheet.attachment_uploaded", resourceType: "timesheet_attachment", resourceId: idValue, entityId: current.entityId });
    return this.get(id);
  }

  async exportPayroll(filters: ListTimesheetsInput) {
    const entityId = filters.entityId ?? (this.ctx.profile.role === "super_admin" || this.ctx.profile.role === "admin" ? undefined : this.ctx.profile.entityId);
    if (!entityId) {
      await requirePermission(this.ctx, "timesheet:export:all");
      const approved = await this.repo.list({ ...filters, status: "approved" });
      await writeAudit(this.ctx, { action: "timesheet.exported", resourceType: "timesheet_export", metadata: { count: approved.length, scope: "all_entities" } });
      return toCsv(approved);
    }

    await assertEntityScope(this.ctx, entityId);
    await requirePermission(this.ctx, "timesheet:export:entity", entityId);
    const approved = await this.repo.list({ ...filters, entityId, status: "approved" });
    await writeAudit(this.ctx, { action: "timesheet.exported", resourceType: "timesheet_export", entityId, metadata: { count: approved.length } });
    return toCsv(approved);
  }

  async reports(filters: ListTimesheetsInput) {
    const entityId = filters.entityId ?? this.ctx.profile.entityId;
    await assertEntityScope(this.ctx, entityId);
    await requirePermission(this.ctx, "payroll:view", entityId);
    const rows = await this.listForAccounts({ ...filters, entityId });
    const payroll = await this.payrollSummary(entityId, filters, rows);
    return {
      periodStart: filters.startDate ?? filters.weekStart ?? (filters.month ? `${filters.month}-01` : null),
      periodEnd: filters.endDate ?? (filters.month ? nextMonthEnd(filters.month) : null),
      ...payroll,
      pendingTimesheets: rows.filter((row) => ["submitted", "under_review"].includes(row.status)).length,
      approvedTimesheets: rows.filter((row) => row.status === "approved").length,
      rejectedTimesheets: rows.filter((row) => row.status === "rejected").length,
      correctionRequested: rows.filter((row) => row.status === "correction_requested").length,
      totalSubmittedHours: sum(rows.filter((row) => row.status !== "draft"), "totalHours"),
      approvedBillableHours: sum(rows.filter((row) => row.status === "approved"), "billableHours"),
      entityWiseHours: [{ entityId, entityName: "Assigned Entity", submittedTimesheets: rows.length, approvedHours: sum(rows.filter((row) => row.status === "approved"), "totalHours"), pendingReview: rows.filter((row) => row.status === "submitted").length }],
      clientWiseHours: groupHours(rows.filter((row) => row.status === "approved")),
      employeeWiseMonthlyHours: rows.map((row) => ({ employeeId: row.employeeId, employeeName: row.employeeName ?? "Employee", month: row.periodStart.slice(0, 7), hours: row.totalHours }))
    };
  }

  private async payrollSummary(entityId: string, filters: ListTimesheetsInput, rows: Timesheet[]) {
    const { data: employees, error } = await this.admin
      .from("employees")
      .select(`
        id,
        employee_number,
        employee_type,
        profiles!employees_profile_id_fkey(full_name),
        employee_project_assignments(
          id,
          rate_type,
          bill_rate,
          start_date,
          end_date,
          is_default
        )
      `)
      .eq("entity_id", entityId)
      .is("deleted_at", null);
    if (error) throw error;

    const start = filters.startDate ?? filters.weekStart ?? (filters.month ? `${filters.month}-01` : null);
    const end = filters.endDate ?? (filters.month ? nextMonthEnd(filters.month) : null);
    const approvedRows = rows.filter((row) => row.status === "approved" || row.status === "client_paid" || row.status === "employee_paid");
    const hoursByEmployee = new Map<string, { hours: number; amount: number }>();

    for (const row of approvedRows) {
      const current = hoursByEmployee.get(row.employeeId) ?? { hours: 0, amount: 0 };
      current.hours += row.totalHours;
      hoursByEmployee.set(row.employeeId, current);
    }

    const payrollEmployees = (employees ?? []).map((employee: any) => {
      const profile = Array.isArray(employee.profiles) ? employee.profiles[0] : employee.profiles;
      const assignments = (employee.employee_project_assignments ?? []).filter((assignment: any) => assignmentActiveInRange(assignment, start, end));
      const salaryAmount = assignments
        .filter((assignment: any) => assignment.rate_type === "salary")
        .reduce((total: number, assignment: any) => total + Number(assignment.bill_rate ?? 0), 0);
      const hourlyRate = assignments
        .filter((assignment: any) => assignment.rate_type !== "salary")
        .sort((a: any, b: any) => Number(b.is_default) - Number(a.is_default))[0]?.bill_rate;
      const approvedHours = hoursByEmployee.get(employee.id)?.hours ?? 0;
      const hourlyAmount = approvedHours * Number(hourlyRate ?? 0);
      return {
        employeeId: employee.id,
        employeeName: profile?.full_name ?? "Employee",
        employeeNumber: employee.employee_number,
        employeeType: employee.employee_type,
        salaryAmount,
        hourlyAmount,
        approvedHours
      };
    });

    const benchEmployees = payrollEmployees.filter((employee) => employee.employeeType === "paid_internal_bench");
    const projectEmployees = payrollEmployees.filter((employee) => employee.employeeType === "paid_project");
    return {
      totalEmployees: payrollEmployees.length,
      payableBenchEmployees: benchEmployees.length,
      payableProjectEmployees: projectEmployees.length,
      unpaidEmployees: payrollEmployees.filter((employee) => employee.employeeType === "unpaid").length,
      benchSalaryAmount: sumNumber(benchEmployees.map((employee) => employee.salaryAmount)),
      projectSalaryAmount: sumNumber(projectEmployees.map((employee) => employee.salaryAmount)),
      totalSalaryAmount: sumNumber(payrollEmployees.map((employee) => employee.salaryAmount)),
      hourlyPayrollAmount: sumNumber(payrollEmployees.map((employee) => employee.hourlyAmount)),
      payrollEmployees
    };
  }

  private async withSignedUrls(timesheet: Timesheet) {
    const attachments = await Promise.all(
      timesheet.attachments.map(async (attachment) => {
        const { data } = await this.ctx.supabase.storage.from("timesheet-attachments").createSignedUrl(attachment.filePath, 60 * 10);
        return { ...attachment, signedUrl: data?.signedUrl };
      })
    );
    return { ...timesheet, attachments };
  }

  private async afterReview(previous: Timesheet, updated: Timesheet, action: string, comments?: string | null) {
    await this.recordActivity(updated, action, previous.status, updated.status, comments);
    await writeAudit(this.ctx, { action: `timesheet.${action}`, resourceType: "timesheet", resourceId: updated.id, entityId: updated.entityId, metadata: { comments } });
    await notifyProfile(this.ctx, {
      entityId: updated.entityId,
      recipientId: previous.employeeProfileId ?? previous.employeeId,
      type: `timesheet_${action}`,
      title: `Timesheet ${action.replace("_", " ")}`,
      body: `Your ${updated.periodType} timesheet was ${action.replace("_", " ")}.`,
      payload: { timesheetId: updated.id }
    });
    if (action === "approved") {
      await notifyEntityRole(this.ctx, {
        entityId: updated.entityId,
        role: "accounts_manager",
        type: "timesheet_approved_for_invoicing",
        title: "Timesheet approved for invoicing",
        body: `${updated.employeeName ?? "An employee"} has approved hours ready for payroll or client invoicing.`,
        payload: { timesheetId: updated.id }
      });
    }
  }

  private async getSupervisorProfileId(employeeId: string) {
    const { data } = await this.ctx.supabase
      .from("employees")
      .select("supervisor:supervisor_id(profile_id)")
      .eq("id", employeeId)
      .single();
    const supervisor = Array.isArray(data?.supervisor) ? data?.supervisor[0] : data?.supervisor;
    return supervisor?.profile_id ?? null;
  }

  private async recordActivity(timesheet: Timesheet, action: string, oldStatus: string | null, newStatus: string, comments?: string | null) {
    await this.adminRepo.addActivity({
      timesheet_id: timesheet.id,
      entity_id: timesheet.entityId,
      actor_id: this.ctx.profile.id,
      action,
      old_status: oldStatus,
      new_status: newStatus,
      comments,
      created_by: this.ctx.profile.id,
      updated_by: this.ctx.profile.id
    });
  }

  private async assertOwnEmployee(employeeId: string) {
    if (["super_admin", "admin", "company_admin"].includes(this.ctx.profile.role)) return;
    const { data, error } = await this.admin
      .from("employees")
      .select("id")
      .eq("id", employeeId)
      .eq("profile_id", this.ctx.profile.id)
      .is("deleted_at", null)
      .single();
    if (error || !data) throw new Error("FORBIDDEN");
  }

  private async assertCanReviewTimesheet(timesheet: Timesheet, permission: string) {
    if (this.ctx.profile.role === "team_lead") {
      await this.assertSupervisesTimesheet(timesheet);
      return;
    }
    if (await hasPermission(this.ctx, permission, timesheet.entityId)) return;
    await this.assertSupervisesTimesheet(timesheet);
  }

  private async assertSupervisesTimesheet(timesheet: Timesheet) {
    const { data } = await this.admin
      .from("employees")
      .select("id")
      .eq("id", timesheet.employeeId)
      .eq("entity_id", timesheet.entityId)
      .eq("supervisor_id", await this.currentEmployeeId(timesheet.entityId))
      .is("deleted_at", null)
      .maybeSingle();

    if (!data) throw new Error("FORBIDDEN");
  }

  private async supervisedEmployeeIds(entityId: string) {
    const supervisorId = await this.currentEmployeeId(entityId);
    if (!supervisorId) return [];
    const { data } = await this.admin
      .from("employees")
      .select("id")
      .eq("entity_id", entityId)
      .eq("supervisor_id", supervisorId)
      .is("deleted_at", null);
    return (data ?? []).map((row: any) => row.id as string);
  }

  private async currentEmployeeId(entityId: string) {
    const { data } = await this.admin
      .from("employees")
      .select("id")
      .eq("entity_id", entityId)
      .eq("profile_id", this.ctx.profile.id)
      .is("deleted_at", null)
      .maybeSingle();
    return data?.id ?? null;
  }
}

function sum(rows: Timesheet[], key: "totalHours" | "billableHours") {
  return rows.reduce((total, row) => total + row[key], 0);
}

function sumNumber(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function assignmentActiveInRange(assignment: { start_date?: string | null; end_date?: string | null }, start: string | null, end: string | null) {
  if (start && assignment.end_date && assignment.end_date < start) return false;
  if (end && assignment.start_date && assignment.start_date > end) return false;
  return true;
}

function nextMonthEnd(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
}

function groupHours(rows: Timesheet[]) {
  const grouped = new Map<string, { clientName: string; approvedHours: number; billableHours: number }>();
  for (const row of rows) {
    const key = row.clientName ?? "Unassigned";
    const current = grouped.get(key) ?? { clientName: key, approvedHours: 0, billableHours: 0 };
    current.approvedHours += row.totalHours;
    current.billableHours += row.billableHours;
    grouped.set(key, current);
  }
  return Array.from(grouped.values());
}

function toCsv(rows: Timesheet[]) {
  const header = ["employee", "client", "project", "period_start", "period_end", "total_hours", "billable_hours", "status"];
  const lines = rows.map((row) =>
    [row.employeeName ?? row.employeeId, row.clientName ?? "", row.projectName ?? "", row.periodStart, row.periodEnd, row.totalHours, row.billableHours, row.status]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

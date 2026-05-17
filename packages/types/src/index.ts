import { z } from "zod";

export const roles = [
  "super_admin",
  "admin",
  "company_admin",
  "hr",
  "accounts_manager",
  "recruiter",
  "marketing",
  "team_lead",
  "operations",
  "viewer",
  "employee",
  "candidate"
] as const;

export const timesheetStatuses = [
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
] as const;

export const timesheetPermissions = [
  "user:manage:entity",
  "company_role:manage:entity",
  "branding:manage:entity",
  "company_dashboard:view:entity",
  "company_admin:create",
  "company_admin:password:update",
  "company:dashboard:view:all",
  "timesheet:create:self",
  "timesheet:edit:self",
  "timesheet:submit:self",
  "timesheet:view:self",
  "timesheet:view:entity",
  "timesheet:view:all",
  "timesheet:approve:entity",
  "timesheet:reject:entity",
  "timesheet:request_correction:entity",
  "timesheet:export:entity",
  "timesheet:export:all",
  "timesheet:payment:entity",
  "timesheet:delete_refill:entity",
  "timesheet_attachment:upload:self",
  "timesheet_attachment:view:self",
  "timesheet_attachment:view:entity",
  "notification:view:entity",
  "audit:view:entity",
  "audit:view:all",
  "entity:view:all",
  "profile:view:all",
  "employee:view:all",
  "report:export",
  "payroll:view",
  "employee_lifecycle:manage:entity",
  "onboarding_invite:create:entity",
  "onboarding_template:manage:entity",
  "onboarding:manage:entity",
  "offer_template:manage:entity",
  "offer:send:entity",
  "offer:manage:entity",
  "document:manage:entity",
  "learning:manage:entity",
  "discord_group:manage:entity",
  "invoice:manage:entity",
  "project_assignment:manage:entity",
  "department:manage:entity",
  "team:manage:entity",
  "job:manage:entity",
  "candidate:manage:entity",
  "candidate:view:assigned",
  "bench:view:entity",
  "candidate:submit:requirement",
  "attendance:manage:entity"
] as const;

export type AppRole = (typeof roles)[number];
export type TimesheetStatus = (typeof timesheetStatuses)[number];
export type TimesheetPermission = (typeof timesheetPermissions)[number];

export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  meta: { requestId: string; [key: string]: unknown };
  error: { code: string; message: string; details?: unknown } | null;
};

export const uuidSchema = z.string().uuid();
export const timesheetStatusSchema = z.enum(timesheetStatuses);
export const periodTypeSchema = z.enum(["weekly", "monthly"]);
export const dayTypeSchema = z.enum(["work", "paid_leave", "unpaid_leave", "paid_holiday", "unpaid_holiday"]);

export const timesheetEntrySchema = z.object({
  workDate: z.string().date(),
  hoursWorked: z.coerce.number().min(0).max(24),
  isBillable: z.boolean().default(true),
  dayType: dayTypeSchema.default("work"),
  isPaid: z.boolean().default(true),
  clientName: z.string().trim().max(180).optional().nullable(),
  projectName: z.string().trim().max(180).optional().nullable(),
  taskDescription: z.string().trim().max(2000).optional().nullable()
});

export const createTimesheetSchema = z.object({
  entityId: uuidSchema,
  employeeId: uuidSchema,
  periodType: periodTypeSchema,
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  clientName: z.string().trim().max(180).optional().nullable(),
  projectName: z.string().trim().max(180).optional().nullable(),
  employeeNotes: z.string().trim().max(4000).optional().nullable(),
  entries: z.array(timesheetEntrySchema).min(1)
});

export const updateTimesheetSchema = createTimesheetSchema.partial().extend({
  entries: z.array(timesheetEntrySchema).optional()
});

export const listTimesheetsSchema = z.object({
  entityId: uuidSchema.optional(),
  employeeId: uuidSchema.optional(),
  client: z.string().trim().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  weekStart: z.string().date().optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  status: timesheetStatusSchema.optional()
});

export const reviewTimesheetSchema = z.object({
  comments: z.string().trim().max(4000).optional().nullable()
});

export const attachmentCompleteSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  filePath: z.string().trim().min(1).max(1200),
  fileType: z.string().trim().max(150).optional().nullable(),
  fileSize: z.coerce.number().int().positive().max(20 * 1024 * 1024),
  attachmentType: z.enum(["client_approved_timecard", "supporting_document", "other"]).default("client_approved_timecard")
});

export const entityBrandingSchema = z.object({
  entityId: uuidSchema,
  brandName: z.string().trim().min(1).max(160),
  brandLogoUrl: z.string().trim().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  legalName: z.string().trim().max(180).optional().nullable(),
  companyAddress: z.string().trim().max(800).optional().nullable(),
  companyEin: z.string().trim().max(40).optional().nullable(),
  eVerifyNumber: z.string().trim().max(80).optional().nullable(),
  companyHomeState: z.string().trim().length(2).optional().nullable(),
  companyPhone: z.string().trim().max(60).optional().nullable(),
  companyWebsite: z.string().trim().max(180).optional().nullable(),
  hrEmail: z.string().trim().email().optional().nullable()
});

export const createAdminUserSchema = z.object({
  entityId: uuidSchema,
  companyName: z.string().trim().min(2).max(180).optional(),
  email: z.string().trim().email(),
  password: z.string().min(8).max(120),
  fullName: z.string().trim().min(2).max(180),
  role: z.enum(roles),
  employeeNumber: z.string().trim().min(1).max(80).optional(),
  title: z.string().trim().max(160).optional().nullable(),
  department: z.string().trim().max(160).optional().nullable(),
  companyRoleIds: z.array(uuidSchema).default([])
});

export const updateUserPasswordSchema = z.object({
  password: z.string().min(8).max(120)
});

export const createCompanyRoleSchema = z.object({
  entityId: uuidSchema,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  permissions: z.array(z.string().trim().min(2)).default([])
});

export const createOnboardingInviteSchema = z.object({
  entityId: uuidSchema,
  email: z.string().trim().email(),
  candidateId: uuidSchema.optional().nullable(),
  employeeId: uuidSchema.optional().nullable()
});

export const onboardingFieldSchema = z.object({
  id: z.string().trim().min(2).max(80),
  label: z.string().trim().min(2).max(180),
  type: z.enum(["text", "email", "phone", "date", "number", "textarea", "select", "file"]),
  required: z.boolean().default(true),
  enabled: z.boolean().default(true),
  options: z.array(z.string().trim().min(1).max(120)).default([]),
  helpText: z.string().trim().max(500).optional().nullable()
});

export const createOnboardingFormTemplateSchema = z.object({
  entityId: uuidSchema,
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(800).optional().nullable(),
  fields: z.array(onboardingFieldSchema).min(1).max(100)
});

export const createOfferTemplateSchema = z.object({
  entityId: uuidSchema,
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(500).optional().nullable(),
  templateBody: z.string().trim().min(20),
  requiredFields: z.array(z.string().trim().min(1).max(80)).default([]),
  isDefault: z.boolean().default(false)
});

export const sendOfferLetterSchema = z.object({
  entityId: uuidSchema,
  templateId: uuidSchema,
  employeeId: uuidSchema.optional().nullable(),
  candidateName: z.string().trim().min(2).max(180),
  candidateEmail: z.string().trim().email(),
  candidateAddress: z.string().trim().max(500).optional().nullable(),
  jobTitle: z.string().trim().min(2).max(180),
  department: z.string().trim().max(160).optional().nullable(),
  employmentType: z.string().trim().min(2).max(120),
  workLocation: z.string().trim().min(2).max(180),
  startDate: z.string().date(),
  compensation: z.string().trim().min(2).max(180),
  payFrequency: z.string().trim().min(2).max(80),
  reportsTo: z.string().trim().min(2).max(180),
  offerDate: z.string().date(),
  expiryDate: z.string().date().optional().nullable(),
  signerName: z.string().trim().min(2).max(180),
  signerTitle: z.string().trim().min(2).max(180),
  signerEmail: z.string().trim().email(),
  companyName: z.string().trim().min(2).max(180),
  companyAddress: z.string().trim().max(500).optional().nullable(),
  companyWebsite: z.string().trim().max(180).optional().nullable(),
  companyPhone: z.string().trim().max(60).optional().nullable(),
  companyEin: z.string().trim().max(40).optional().nullable(),
  eVerifyNumber: z.string().trim().max(80).optional().nullable(),
  companyHomeState: z.string().trim().length(2),
  companyLogoUrl: z.string().trim().url().optional().nullable(),
  duties: z.array(z.string().trim().min(2).max(500)).min(1).max(20),
  draftBody: z.string().trim().min(100),
  emailSubject: z.string().trim().min(5).max(200),
  emailMessage: z.string().trim().min(10).max(4000)
});

export const createLearningMaterialSchema = z.object({
  entityId: uuidSchema,
  title: z.string().trim().min(2).max(180),
  courseName: z.string().trim().max(180).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  contentUrl: z.string().trim().url().optional().nullable(),
  materialType: z.enum(["link", "document", "video", "policy", "training"]).default("link"),
  required: z.boolean().default(true),
  estimatedMinutes: z.coerce.number().int().min(1).max(10000).optional().nullable(),
  dueDate: z.string().date().optional().nullable(),
  assignedEmployeeIds: z.array(uuidSchema).default([])
});

export const createDiscordGroupSchema = z.object({
  entityId: uuidSchema,
  name: z.string().trim().min(2).max(160),
  discordUrl: z.string().trim().url(),
  description: z.string().trim().max(800).optional().nullable(),
  employeeIds: z.array(uuidSchema).default([])
});

export const updateLearningAssignmentSchema = z.object({
  assignmentId: uuidSchema,
  status: z.enum(["viewed", "acknowledged", "completed"])
});

export const updateEmployeeLifecycleSchema = z.object({
  employeeId: uuidSchema,
  entityId: uuidSchema,
  employeeType: z.enum(["unpaid", "paid_internal_bench", "paid_project"]),
  supervisorId: uuidSchema.optional().nullable(),
  clientName: z.string().trim().max(180).optional().nullable(),
  projectName: z.string().trim().max(180).optional().nullable(),
  updatedResumeProvided: z.boolean().default(false),
  resumeStatus: z.enum(["pending", "received", "reviewed", "rejected"]).default("pending"),
  offerLetterStatus: z.enum(["usc_offer_letter", "gc_offer_letter", "h1b_offer_letter", "stem", "initial_opt", "cpt_offer_letter", "no_offer_letter", "gc_ead_offer_letter", "h4_ead_offer_letter", "l2s_offer_letter", "terminated"]).default("no_offer_letter"),
  interviewPrepStatus: z.enum(["pending", "scheduled", "completed", "failed"]).default("pending"),
  interviewPrepCount: z.coerce.number().int().min(0).max(100).default(0),
  interviewFeedback: z.string().trim().max(4000).optional().nullable(),
  linkedinReviewStatus: z.enum(["pending", "reviewed", "needs_update", "approved"]).default("pending"),
  marketingStatus: z.enum(["not_started", "active", "paused", "stopped", "placed"]).default("not_started"),
  marketingTechnology: z.string().trim().max(160).optional().nullable(),
  candidateStatus: z.enum(["form_submission", "resume_done", "linkedin_review", "evaluation_call_1", "evaluation_call_2", "final_mock_interview", "documents_done", "active_marketing", "placed", "stopped_marketing"]).default("form_submission"),
  recruiterAssignedId: uuidSchema.optional().nullable()
});

export const createProjectAssignmentSchema = z.object({
  entityId: uuidSchema,
  employeeId: uuidSchema,
  clientName: z.string().trim().min(1).max(180),
  projectName: z.string().trim().min(1).max(180),
  roleName: z.string().trim().max(160).optional().nullable(),
  rateType: z.enum(["hourly", "salary"]).default("hourly"),
  billRate: z.coerce.number().min(0).max(100000).optional().nullable(),
  startDate: z.string().date().optional().nullable(),
  endDate: z.string().date().optional().nullable(),
  isDefault: z.boolean().default(false)
});

export type CreateTimesheetInput = z.output<typeof createTimesheetSchema>;
export type UpdateTimesheetInput = z.output<typeof updateTimesheetSchema>;
export type ListTimesheetsInput = z.output<typeof listTimesheetsSchema>;
export type ReviewTimesheetInput = z.output<typeof reviewTimesheetSchema>;
export type AttachmentCompleteInput = z.output<typeof attachmentCompleteSchema>;
export type EntityBrandingInput = z.output<typeof entityBrandingSchema>;
export type CreateAdminUserInput = z.output<typeof createAdminUserSchema>;
export type UpdateUserPasswordInput = z.output<typeof updateUserPasswordSchema>;
export type CreateCompanyRoleInput = z.output<typeof createCompanyRoleSchema>;
export type CreateOnboardingInviteInput = z.output<typeof createOnboardingInviteSchema>;
export type OnboardingField = z.output<typeof onboardingFieldSchema>;
export type CreateOnboardingFormTemplateInput = z.output<typeof createOnboardingFormTemplateSchema>;
export type CreateOfferTemplateInput = z.output<typeof createOfferTemplateSchema>;
export type SendOfferLetterInput = z.output<typeof sendOfferLetterSchema>;
export type CreateLearningMaterialInput = z.output<typeof createLearningMaterialSchema>;
export type CreateDiscordGroupInput = z.output<typeof createDiscordGroupSchema>;
export type UpdateLearningAssignmentInput = z.output<typeof updateLearningAssignmentSchema>;
export type UpdateEmployeeLifecycleInput = z.output<typeof updateEmployeeLifecycleSchema>;
export type CreateProjectAssignmentInput = z.output<typeof createProjectAssignmentSchema>;

export type BusinessEntity = {
  id: string;
  name: string;
  slug: string;
  brandName: string | null;
  brandLogoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  portalSlug: string | null;
  customDomain: string | null;
  legalName: string | null;
  companyAddress: string | null;
  companyEin: string | null;
  eVerifyNumber: string | null;
  companyHomeState: string | null;
  companyPhone: string | null;
  companyWebsite: string | null;
  hrEmail: string | null;
};

export type AdminUser = {
  id: string;
  entityId: string;
  entityName?: string | null;
  entitySlug?: string | null;
  entityIsActive?: boolean;
  email: string;
  fullName: string;
  role: AppRole;
  department: string | null;
  title?: string | null;
  employeeNumber?: string | null;
  isActive: boolean;
  setupInviteUrl?: string | null;
  emailDeliveryStatus?: "sent" | "not_configured" | "failed" | null;
  emailDeliveryError?: string | null;
  companyRoles: Array<{ id: string; name: string; slug: string; isSystem?: boolean }>;
};

export type CompanyRole = {
  id: string;
  entityId: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
};

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  entity: BusinessEntity;
  companyRoles: CompanyRole[];
};

export type AdminCompanyDashboard = {
  totalActiveCompanies: number;
  totalActiveUsers: number;
  companies: Array<{
    id: string;
    name: string;
    slug: string;
    brandName: string | null;
    brandLogoUrl: string | null;
    activeUserCount: number;
    roleCounts: Partial<Record<AppRole, number>>;
  }>;
};

export type LifecycleEmployee = {
  id: string;
  profileId: string;
  entityId: string;
  entityName?: string | null;
  entitySlug?: string | null;
  fullName: string;
  email: string;
  employeeNumber: string;
  uniqueEmployeeCode: string | null;
  title: string | null;
  department: string | null;
  employeeType: "unpaid" | "paid_internal_bench" | "paid_project";
  onboardingStatus: string;
  supervisorId: string | null;
  supervisorName?: string | null;
  clientName: string | null;
  projectName: string | null;
  updatedResumeProvided: boolean;
  resumeStatus: "pending" | "received" | "reviewed" | "rejected";
  offerLetterStatus: "usc_offer_letter" | "gc_offer_letter" | "h1b_offer_letter" | "stem" | "initial_opt" | "cpt_offer_letter" | "no_offer_letter" | "gc_ead_offer_letter" | "h4_ead_offer_letter" | "l2s_offer_letter" | "terminated";
  interviewPrepStatus: "pending" | "scheduled" | "completed" | "failed";
  interviewPrepCount: number;
  interviewFeedback: string | null;
  linkedinReviewStatus: "pending" | "reviewed" | "needs_update" | "approved";
  marketingStatus: "not_started" | "active" | "paused" | "stopped" | "placed";
  marketingTechnology: string | null;
  candidateStatus: "form_submission" | "resume_done" | "linkedin_review" | "evaluation_call_1" | "evaluation_call_2" | "final_mock_interview" | "documents_done" | "active_marketing" | "placed" | "stopped_marketing";
  recruiterAssignedId: string | null;
  recruiterName: string | null;
};

export type OnboardingInvite = {
  id: string;
  entityId: string;
  email: string;
  status: string;
  expiresAt: string | null;
  createdAt: string;
};

export type OnboardingFormTemplate = {
  id: string;
  entityId: string;
  name: string;
  description: string | null;
  fields: OnboardingField[];
  isActive: boolean;
  version: number;
  createdAt: string;
};

export type OfferTemplate = {
  id: string;
  entityId: string;
  name: string;
  description: string | null;
  templateBody: string;
  requiredFields: string[];
  isDefault: boolean;
};

export type SentOfferLetter = {
  id: string;
  entityId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  status: "sent";
  docxPath: string | null;
  sentAt: string | null;
};

export type LearningMaterial = {
  id: string;
  entityId: string;
  title: string;
  courseName: string | null;
  description: string | null;
  contentUrl: string | null;
  materialType: string;
  required: boolean;
  estimatedMinutes: number | null;
  publishedAt: string | null;
  assignments: LearningAssignment[];
};

export type LearningAssignment = {
  id: string;
  employeeId: string;
  employeeName: string | null;
  employeeEmail: string | null;
  dueDate: string | null;
  status: "assigned" | "viewed" | "acknowledged" | "completed";
  acknowledgedAt: string | null;
  completedAt: string | null;
};

export type DiscordLearningGroup = {
  id: string;
  entityId: string;
  supervisorId: string | null;
  name: string;
  discordUrl: string;
  description: string | null;
  memberCount: number;
  members: Array<{ employeeId: string; employeeName: string | null; employeeEmail: string | null }>;
  createdAt: string;
};

export type EmployeeLearningAssignment = {
  id: string;
  entityId: string;
  dueDate: string | null;
  status: "assigned" | "viewed" | "acknowledged" | "completed";
  acknowledgedAt: string | null;
  completedAt: string | null;
  material: {
    id: string;
    title: string;
    courseName: string | null;
    description: string | null;
    contentUrl: string | null;
    materialType: string;
    required: boolean;
    estimatedMinutes: number | null;
    publishedAt: string | null;
  };
};

export type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  status: string;
  totalHours: number;
  totalAmount: number;
  periodStart: string | null;
  periodEnd: string | null;
};

export type ProjectAssignment = {
  id: string;
  entityId: string;
  employeeId: string;
  employeeName?: string | null;
  employeeNumber?: string | null;
  clientName: string;
  projectName: string;
  roleName: string | null;
  rateType: "hourly" | "salary";
  billRate: number | null;
  startDate: string | null;
  endDate: string | null;
  isDefault: boolean;
};

export type TimesheetEntry = z.output<typeof timesheetEntrySchema> & { id?: string };

export type Timesheet = {
  id: string;
  entityId: string;
  entityName?: string;
  employeeId: string;
  employeeProfileId?: string;
  employeeName?: string;
  clientName: string | null;
  projectName: string | null;
  periodType: "weekly" | "monthly";
  periodStart: string;
  periodEnd: string;
  status: TimesheetStatus;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  employeeNotes: string | null;
  reviewerComments: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  exportedAt: string | null;
  clientPaymentReceivedAt?: string | null;
  employeePaidAt?: string | null;
  deletedForRefillAt?: string | null;
  entries: TimesheetEntry[];
  attachments: TimesheetAttachment[];
};

export type TimesheetAttachment = {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string | null;
  fileSize: number | null;
  attachmentType: "client_approved_timecard" | "supporting_document" | "other";
  signedUrl?: string;
  createdAt: string;
};

export type TimesheetReport = {
  periodStart: string | null;
  periodEnd: string | null;
  totalEmployees: number;
  payableBenchEmployees: number;
  payableProjectEmployees: number;
  unpaidEmployees: number;
  totalSalaryAmount: number;
  benchSalaryAmount: number;
  projectSalaryAmount: number;
  hourlyPayrollAmount: number;
  pendingTimesheets: number;
  approvedTimesheets: number;
  rejectedTimesheets: number;
  correctionRequested: number;
  totalSubmittedHours: number;
  approvedBillableHours: number;
  entityWiseHours: Array<{ entityId: string; entityName: string; submittedTimesheets: number; approvedHours: number; pendingReview: number }>;
  clientWiseHours: Array<{ clientName: string; approvedHours: number; billableHours: number }>;
  employeeWiseMonthlyHours: Array<{ employeeId: string; employeeName: string; month: string; hours: number }>;
  payrollEmployees: Array<{ employeeId: string; employeeName: string; employeeNumber: string; employeeType: string; salaryAmount: number; hourlyAmount: number; approvedHours: number }>;
};

export type TimesheetContext = {
  entityId: string;
  entityName: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  defaultClientName: string | null;
  defaultProjectName: string | null;
  assignedProjects: ProjectAssignment[];
  recentClients: Array<{ clientName: string; projectName: string | null }>;
};

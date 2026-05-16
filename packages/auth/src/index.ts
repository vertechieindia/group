import { timesheetPermissions, type AppRole, type TimesheetPermission } from "@vertechie/types";

const allPermissions = [...timesheetPermissions];

export const rolePermissions: Record<AppRole, TimesheetPermission[]> = {
  super_admin: allPermissions,
  admin: allPermissions,
  company_admin: [
    "user:manage:entity",
    "company_role:manage:entity",
    "branding:manage:entity",
    "company_dashboard:view:entity",
    "timesheet:view:entity",
    "timesheet:approve:entity",
    "timesheet:reject:entity",
    "timesheet:request_correction:entity",
    "timesheet:export:entity",
    "timesheet:payment:entity",
    "timesheet:delete_refill:entity",
    "report:export",
    "payroll:view",
    "employee_lifecycle:manage:entity",
    "onboarding_invite:create:entity",
    "onboarding_template:manage:entity",
    "offer_template:manage:entity",
    "offer:send:entity",
    "learning:manage:entity",
    "discord_group:manage:entity",
    "invoice:manage:entity",
    "project_assignment:manage:entity"
  ],
  hr: [
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
    "candidate:manage:entity"
  ],
  accounts_manager: [
    "timesheet:view:entity",
    "timesheet:approve:entity",
    "timesheet:reject:entity",
    "timesheet:request_correction:entity",
    "timesheet:export:entity",
    "timesheet:payment:entity",
    "timesheet:delete_refill:entity",
    "report:export",
    "payroll:view",
    "invoice:manage:entity",
    "project_assignment:manage:entity"
  ],
  recruiter: [
    "candidate:view:assigned",
    "bench:view:entity",
    "candidate:submit:requirement"
  ],
  marketing: [
    "candidate:manage:entity",
    "bench:view:entity"
  ],
  team_lead: [
    "timesheet:view:entity",
    "timesheet:approve:entity",
    "timesheet:reject:entity",
    "timesheet:request_correction:entity",
    "learning:manage:entity"
  ],
  operations: [
    "company_dashboard:view:entity",
    "timesheet:view:entity",
    "report:export"
  ],
  viewer: [
    "company_dashboard:view:entity",
    "timesheet:view:entity",
    "report:export"
  ],
  employee: [
    "learning:manage:entity",
    "timesheet:create:self",
    "timesheet:edit:self",
    "timesheet:submit:self",
    "timesheet:view:self",
    "timesheet_attachment:upload:self"
  ],
  candidate: []
};

export function hasPermission(role: AppRole, permission: TimesheetPermission) {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function isPrivilegedRole(role: AppRole) {
  return role === "super_admin" || role === "admin" || role === "company_admin";
}

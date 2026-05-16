import { describe, expect, it } from "vitest";
import { rolePermissions, hasPermission } from "@vertechie/auth";
import { roles, timesheetPermissions, type AppRole } from "@vertechie/types";
import { canAccessPath } from "../middleware";

describe("timesheet RBAC", () => {
  it("allows accounts managers to review and export entity timesheets without broad admin", () => {
    expect(hasPermission("accounts_manager", "timesheet:view:entity")).toBe(true);
    expect(hasPermission("accounts_manager", "timesheet:approve:entity")).toBe(true);
    expect(hasPermission("accounts_manager", "timesheet:export:entity")).toBe(true);
    expect(hasPermission("accounts_manager", "timesheet:view:all")).toBe(false);
  });

  it("keeps employees scoped to self-service actions", () => {
    expect(hasPermission("employee", "timesheet:create:self")).toBe(true);
    expect(hasPermission("employee", "timesheet:submit:self")).toBe(true);
    expect(hasPermission("employee", "timesheet:approve:entity")).toBe(false);
  });

  it("defines a permission matrix for every application role", () => {
    expect(Object.keys(rolePermissions).sort()).toEqual([...roles].sort());
    for (const role of roles) {
      expect(Array.isArray(rolePermissions[role])).toBe(true);
    }
  });

  it("does not reference permissions outside the central catalog", () => {
    const allowed = new Set(timesheetPermissions);
    for (const permissions of Object.values(rolePermissions)) {
      for (const permission of permissions) {
        expect(allowed.has(permission)).toBe(true);
      }
    }
  });

  it("keeps company admins entity-scoped instead of group-wide", () => {
    expect(hasPermission("company_admin", "user:manage:entity")).toBe(true);
    expect(hasPermission("company_admin", "timesheet:view:all")).toBe(false);
    expect(hasPermission("company_admin", "audit:view:all")).toBe(false);
    expect(hasPermission("company_admin", "entity:view:all")).toBe(false);
  });

  it("separates HR, accounts, supervisor, and employee responsibilities", () => {
    expect(hasPermission("hr", "offer:send:entity")).toBe(true);
    expect(hasPermission("hr", "timesheet:payment:entity")).toBe(false);
    expect(hasPermission("accounts_manager", "invoice:manage:entity")).toBe(true);
    expect(hasPermission("accounts_manager", "user:manage:entity")).toBe(false);
    expect(hasPermission("team_lead", "learning:manage:entity")).toBe(true);
    expect(hasPermission("team_lead", "timesheet:view:entity")).toBe(true);
    expect(hasPermission("employee", "learning:manage:entity")).toBe(true);
    expect(hasPermission("recruiter", "bench:view:entity")).toBe(true);
    expect(hasPermission("recruiter", "user:manage:entity")).toBe(false);
  });

  it.each([
    ["super_admin", "/admin/users", true],
    ["company_admin", "/admin/users", true],
    ["accounts_manager", "/admin/users", false],
    ["accounts_manager", "/accounts/reports", true],
    ["hr", "/hr/onboarding", true],
    ["hr", "/accounts/reports", false],
    ["team_lead", "/accounts/timesheets", true],
    ["team_lead", "/accounts/reports", false],
    ["employee", "/timesheets/new", true],
    ["employee", "/supervisor/learning", false],
    ["viewer", "/timesheets", true],
    ["viewer", "/admin/users", false]
  ] satisfies Array<[AppRole, string, boolean]>)("routes %s access to %s as %s", (role, path, allowed) => {
    expect(canAccessPath(role, path)).toBe(allowed);
  });
});

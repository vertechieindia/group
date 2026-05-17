import { createAdminSupabaseClient } from "@vertechie/db";
import type { AdminCompanyDashboard, AdminUser, AppRole, BusinessEntity, CompanyRole, CreateAdminUserInput, CreateCompanyRoleInput, EntityBrandingInput, UpdateUserPasswordInput } from "@vertechie/types";
import { assertEntityScope, requirePermission, type RequestContext } from "./request-context";
import { writeAudit } from "./audit";
import { fallbackLogoForEntity } from "./brand-assets";
import { sendTransactionalEmail } from "./email";

const internalRoles = new Set(["super_admin", "admin", "company_admin", "hr", "accounts_manager", "recruiter", "marketing", "team_lead", "operations", "viewer", "employee"]);
const companyAdminCreatableRoles = new Set<AppRole>(["hr", "accounts_manager", "team_lead", "employee", "recruiter"]);
const entitySelect = "id, name, legal_name, slug, brand_name, brand_logo_url, primary_color, accent_color, portal_slug, custom_domain, company_address, company_ein, e_verify_number, company_home_state, company_phone, company_website, hr_email";

export class AdminService {
  private readonly admin = createAdminSupabaseClient();

  constructor(private readonly ctx: RequestContext) {}

  async currentUser() {
    const { data: entity, error: entityError } = await this.admin
      .from("business_entities")
      .select(entitySelect)
      .eq("id", this.ctx.profile.entityId)
      .single();
    if (entityError) throw entityError;

    const roles = await this.listAssignedCompanyRoles(this.ctx.profile.id);
    return {
      id: this.ctx.profile.id,
      email: this.ctx.profile.email,
      fullName: this.ctx.profile.fullName,
      role: this.ctx.profile.role,
      entity: mapEntity(entity),
      companyRoles: roles
    };
  }

  async listEntities() {
    if (this.ctx.profile.role !== "super_admin") {
      const { data, error } = await this.admin
        .from("business_entities")
        .select(entitySelect)
        .eq("id", this.ctx.profile.entityId)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return (data ?? []).map(mapEntity);
    }

    const { data, error } = await this.admin
      .from("business_entities")
      .select(entitySelect)
      .is("deleted_at", null)
      .order("name");
    if (error) throw error;
    const entities = (data ?? []).map(mapEntity);
    return this.onlyOperationalEntities(entities);
  }

  async listUsers(entityId?: string) {
    const groupCompanyAdminView = this.ctx.profile.role === "super_admin" && !entityId;
    const scopedEntityId = entityId ?? this.ctx.profile.entityId;
    if (!groupCompanyAdminView) await this.assertCanManageUsers(scopedEntityId);

    let query = this.admin
      .from("profiles")
      .select("id, entity_id, email, full_name, role, department, is_active, business_entities!profiles_entity_id_fkey(name, slug, is_active)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    query = groupCompanyAdminView ? query.eq("role", "company_admin") : query.eq("entity_id", scopedEntityId);
    const { data: profiles, error } = await query;
    if (error) throw error;

    const profileIds = (profiles ?? []).map((profile) => profile.id);
    const [{ data: employees }, { data: assignments }] = await Promise.all([
      this.admin.from("employees").select("profile_id, employee_number, title").in("profile_id", profileIds.length ? profileIds : ["00000000-0000-0000-0000-000000000000"]).is("deleted_at", null),
      this.admin
        .from("profile_role_assignments")
        .select("profile_id, company_roles(id, name, slug, is_system)")
        .in("profile_id", profileIds.length ? profileIds : ["00000000-0000-0000-0000-000000000000"])
        .is("deleted_at", null)
    ]);

    return (profiles ?? []).map((profile) => {
      const employee = employees?.find((row) => row.profile_id === profile.id);
      return {
        id: profile.id,
        entityId: profile.entity_id,
        entityName: relation(profile.business_entities)?.name ?? null,
        entitySlug: relation(profile.business_entities)?.slug ?? null,
        entityIsActive: relation(profile.business_entities)?.is_active ?? true,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
        department: profile.department,
        title: employee?.title ?? null,
        employeeNumber: employee?.employee_number ?? null,
        isActive: profile.is_active,
        companyRoles: (assignments ?? [])
          .filter((assignment) => assignment.profile_id === profile.id)
          .map((assignment: any) => assignment.company_roles)
          .filter(Boolean)
          .map((role: any) => ({ id: role.id, name: role.name, slug: role.slug, isSystem: role.is_system }))
      } satisfies AdminUser;
    });
  }

  async dashboard(): Promise<AdminCompanyDashboard> {
    if (this.ctx.profile.role !== "super_admin") throw new Error("FORBIDDEN");

    const [{ data: entities, error: entityError }, { data: profiles, error: profileError }] = await Promise.all([
      this.admin
        .from("business_entities")
        .select("id, name, slug, brand_name, brand_logo_url, is_active")
        .is("deleted_at", null)
        .order("name"),
      this.admin
        .from("profiles")
        .select("id, entity_id, role")
        .eq("is_active", true)
        .is("deleted_at", null)
    ]);
    if (entityError) throw entityError;
    if (profileError) throw profileError;

    const companies = (entities ?? []).map((entity: any) => {
      const entityProfiles = (profiles ?? []).filter((profile: any) => profile.entity_id === entity.id);
      const roleCounts = entityProfiles.reduce((counts: Partial<Record<AppRole, number>>, profile: any) => {
        counts[profile.role as AppRole] = (counts[profile.role as AppRole] ?? 0) + 1;
        return counts;
      }, {});
      return {
        id: entity.id,
        name: entity.name,
        slug: entity.slug,
        brandName: entity.brand_name,
        brandLogoUrl: entity.brand_logo_url,
        activeUserCount: entityProfiles.length,
        roleCounts
      };
    }).filter((company) => company.activeUserCount > 0 && (entities ?? []).find((entity: any) => entity.id === company.id)?.is_active !== false);

    return {
      totalActiveCompanies: companies.length,
      totalActiveUsers: companies.reduce((sum, company) => sum + company.activeUserCount, 0),
      companies
    };
  }

  async createUser(input: CreateAdminUserInput) {
    const entity = await this.resolveUserCreationEntity(input);
    input = { ...input, entityId: entity.id };
    await this.assertCanManageUsers(input.entityId);
    if (!internalRoles.has(input.role)) throw new Error("INVALID_ROLE");
    this.assertCanCreateRole(input.role);

    const created = await this.admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName, role: input.role, entity_id: input.entityId }
    });

    let user = created.data.user;
    if (created.error) {
      const listed = await this.admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listed.error) throw listed.error;
      user = listed.data.users.find((candidate) => candidate.email?.toLowerCase() === input.email.toLowerCase()) ?? null;
      if (!user) throw created.error;
      const updated = await this.admin.auth.admin.updateUserById(user.id, {
        password: input.password,
        email_confirm: true,
        user_metadata: { full_name: input.fullName, role: input.role, entity_id: input.entityId }
      });
      if (updated.error) throw updated.error;
      user = updated.data.user;
    }

    if (!user) throw new Error("USER_CREATE_FAILED");

    const { error: profileError } = await this.admin.from("profiles").upsert(
      {
        id: user.id,
        entity_id: input.entityId,
        email: input.email,
        full_name: input.fullName,
        role: input.role,
        department: input.department,
        is_active: true,
        created_by: this.ctx.profile.id,
        updated_by: this.ctx.profile.id
      },
      { onConflict: "id" }
    );
    if (profileError) throw profileError;

    if (input.role !== "candidate") {
      const employeeNumber = input.employeeNumber || `EMP-${Date.now()}`;
      const { error: employeeError } = await this.admin.from("employees").upsert(
        {
          profile_id: user.id,
          entity_id: input.entityId,
          employee_number: employeeNumber,
          department: input.department,
          title: input.title,
          employment_status: "active",
          hire_date: new Date().toISOString().slice(0, 10),
          created_by: this.ctx.profile.id,
          updated_by: this.ctx.profile.id
        },
        { onConflict: "profile_id" }
      );
      if (employeeError) throw employeeError;
    }

    await this.replaceCompanyRoleAssignments(input.entityId, user.id, input.companyRoleIds);
    const inviteResult = input.role === "company_admin"
      ? await this.sendCompanyAdminSetupInvite({
        email: input.email,
        fullName: input.fullName,
        password: input.password,
        entity,
        portalSlug: entity.portalSlug || entity.slug
      })
      : { setupInviteUrl: null, emailDeliveryStatus: null as AdminUser["emailDeliveryStatus"] };

    await writeAudit(this.ctx, {
      action: "admin.user_created",
      resourceType: "profile",
      resourceId: user.id,
      entityId: input.entityId,
      metadata: { role: input.role, companyName: input.companyName, setupInviteUrl: inviteResult.setupInviteUrl, emailDeliveryStatus: inviteResult.emailDeliveryStatus }
    });
    const createdUser = (await this.listUsers(input.entityId)).find((profile) => profile.id === user.id);
    return createdUser ? { ...createdUser, ...inviteResult } : createdUser;
  }

  async updateUserPassword(userId: string, input: UpdateUserPasswordInput) {
    const { data: profile, error } = await this.admin
      .from("profiles")
      .select("id, entity_id, role")
      .eq("id", userId)
      .is("deleted_at", null)
      .single();
    if (error || !profile) throw new Error("PROFILE_NOT_FOUND");

    await this.assertCanManageUsers(profile.entity_id);
    if (this.ctx.profile.role === "super_admin" && profile.role !== "company_admin") throw new Error("FORBIDDEN");
    if (this.ctx.profile.role !== "super_admin" && ["super_admin", "admin", "company_admin"].includes(profile.role)) throw new Error("FORBIDDEN");

    const { error: updateError } = await this.admin.auth.admin.updateUserById(userId, { password: input.password });
    if (updateError) throw updateError;
    await writeAudit(this.ctx, { action: "admin.user_password_updated", resourceType: "profile", resourceId: userId, entityId: profile.entity_id, metadata: { role: profile.role } });
    return { updated: true };
  }

  async holdCompanyServices(userId: string) {
    const profile = await this.getCompanyAdminManagedBySuperAdmin(userId);
    const { error } = await this.admin
      .from("business_entities")
      .update({ is_active: false, updated_by: this.ctx.profile.id })
      .eq("id", profile.entity_id);
    if (error) throw error;
    await writeAudit(this.ctx, { action: "admin.company_services_held", resourceType: "business_entity", resourceId: profile.entity_id, entityId: profile.entity_id, metadata: { companyAdminUserId: userId } });
    return { updated: true };
  }

  async resumeCompanyServices(userId: string) {
    const profile = await this.getCompanyAdminManagedBySuperAdmin(userId);
    const { error } = await this.admin
      .from("business_entities")
      .update({ is_active: true, updated_by: this.ctx.profile.id })
      .eq("id", profile.entity_id);
    if (error) throw error;
    await writeAudit(this.ctx, { action: "admin.company_services_resumed", resourceType: "business_entity", resourceId: profile.entity_id, entityId: profile.entity_id, metadata: { companyAdminUserId: userId } });
    return { updated: true };
  }

  async deleteCompanyAdminPermanently(userId: string) {
    const profile = await this.getCompanyAdminManagedBySuperAdmin(userId);
    await writeAudit(this.ctx, { action: "admin.company_admin_permanent_delete_requested", resourceType: "profile", resourceId: userId, entityId: profile.entity_id, metadata: { email: profile.email } });

    await this.admin.from("profile_role_assignments").delete().eq("profile_id", userId);
    await this.admin.from("employees").delete().eq("profile_id", userId);
    const { error: profileError } = await this.admin.from("profiles").delete().eq("id", userId);
    if (profileError) throw profileError;
    const { error: authError } = await this.admin.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    await writeAudit(this.ctx, { action: "admin.company_admin_permanently_deleted", resourceType: "profile", resourceId: userId, entityId: profile.entity_id, metadata: { email: profile.email } });
    return { deleted: true };
  }

  async listCompanyRoles(entityId?: string) {
    const scopedEntityId = entityId ?? this.ctx.profile.entityId;
    await assertEntityScope(this.ctx, scopedEntityId);
    const { data, error } = await this.admin
      .from("company_roles")
      .select("id, entity_id, name, slug, description, permissions, is_system")
      .eq("entity_id", scopedEntityId)
      .is("deleted_at", null)
      .order("is_system", { ascending: false })
      .order("name");
    if (error) throw error;
    return (data ?? []).map(mapCompanyRole);
  }

  async createCompanyRole(input: CreateCompanyRoleInput) {
    await assertEntityScope(this.ctx, input.entityId);
    await requirePermission(this.ctx, "company_role:manage:entity", input.entityId);
    const slug = slugify(input.name);
    const { data, error } = await this.admin
      .from("company_roles")
      .insert({
        entity_id: input.entityId,
        name: input.name,
        slug,
        description: input.description,
        permissions: input.permissions,
        is_system: false,
        created_by: this.ctx.profile.id,
        updated_by: this.ctx.profile.id
      })
      .select("id, entity_id, name, slug, description, permissions, is_system")
      .single();
    if (error) throw error;
    await writeAudit(this.ctx, { action: "admin.company_role_created", resourceType: "company_role", resourceId: data.id, entityId: input.entityId });
    return mapCompanyRole(data);
  }

  async getBranding(entityId?: string) {
    const scopedEntityId = entityId ?? this.ctx.profile.entityId;
    await assertEntityScope(this.ctx, scopedEntityId);
    const { data, error } = await this.admin
      .from("business_entities")
      .select(entitySelect)
      .eq("id", scopedEntityId)
      .single();
    if (error) throw error;
    return mapEntity(data);
  }

  async updateBranding(input: EntityBrandingInput) {
    await assertEntityScope(this.ctx, input.entityId);
    await requirePermission(this.ctx, "branding:manage:entity", input.entityId);
    const portalSlug = slugify(input.brandName);
    const { data, error } = await this.admin
      .from("business_entities")
      .update({
        brand_name: input.brandName,
        brand_logo_url: input.brandLogoUrl,
        primary_color: input.primaryColor,
        accent_color: input.accentColor,
        legal_name: input.legalName,
        company_address: input.companyAddress,
        company_ein: input.companyEin,
        e_verify_number: input.eVerifyNumber,
        company_home_state: input.companyHomeState,
        company_phone: input.companyPhone,
        company_website: input.companyWebsite,
        hr_email: input.hrEmail,
        portal_slug: portalSlug,
        updated_by: this.ctx.profile.id
      })
      .eq("id", input.entityId)
      .select(entitySelect)
      .single();
    if (error) throw error;
    await writeAudit(this.ctx, { action: "admin.branding_updated", resourceType: "business_entity", resourceId: input.entityId, entityId: input.entityId });
    return mapEntity(data);
  }

  private async assertCanManageUsers(entityId: string) {
    await assertEntityScope(this.ctx, entityId);
    await requirePermission(this.ctx, "user:manage:entity", entityId);
  }

  private assertCanCreateRole(role: AppRole) {
    if (this.ctx.profile.role === "super_admin") {
      if (role !== "company_admin") throw new Error("FORBIDDEN");
      return;
    }
    if (this.ctx.profile.role === "company_admin") {
      if (!companyAdminCreatableRoles.has(role)) throw new Error("FORBIDDEN");
      return;
    }
    if (this.ctx.profile.role === "admin") return;
    throw new Error("FORBIDDEN");
  }

  private async listAssignedCompanyRoles(profileId: string) {
    const { data, error } = await this.admin
      .from("profile_role_assignments")
      .select("company_roles(id, entity_id, name, slug, description, permissions, is_system)")
      .eq("profile_id", profileId)
      .is("deleted_at", null);
    if (error) throw error;
    return (data ?? []).map((row: any) => row.company_roles).filter(Boolean).map(mapCompanyRole);
  }

  private async replaceCompanyRoleAssignments(entityId: string, profileId: string, roleIds: string[]) {
    await this.admin.from("profile_role_assignments").update({ deleted_at: new Date().toISOString(), updated_by: this.ctx.profile.id }).eq("profile_id", profileId);
    if (!roleIds.length) return;
    const { error } = await this.admin.from("profile_role_assignments").upsert(
      roleIds.map((roleId) => ({
        entity_id: entityId,
        profile_id: profileId,
        company_role_id: roleId,
        deleted_at: null,
        created_by: this.ctx.profile.id,
        updated_by: this.ctx.profile.id
      })),
      { onConflict: "profile_id,company_role_id" }
    );
    if (error) throw error;
  }

  private async getCompanyAdminManagedBySuperAdmin(userId: string) {
    if (this.ctx.profile.role !== "super_admin") throw new Error("FORBIDDEN");
    const { data: profile, error } = await this.admin
      .from("profiles")
      .select("id, entity_id, email, role")
      .eq("id", userId)
      .is("deleted_at", null)
      .single();
    if (error || !profile) throw new Error("PROFILE_NOT_FOUND");
    if (profile.role !== "company_admin") throw new Error("FORBIDDEN");
    return profile;
  }

  private async onlyOperationalEntities(entities: BusinessEntity[]) {
    const entityIds = entities.map((entity) => entity.id);
    if (!entityIds.length) return [];
    const { data, error } = await this.admin
      .from("profiles")
      .select("entity_id")
      .in("entity_id", entityIds)
      .eq("is_active", true)
      .is("deleted_at", null);
    if (error) throw error;
    const activeEntityIds = new Set((data ?? []).map((profile) => profile.entity_id));
    return entities.filter((entity) => activeEntityIds.has(entity.id));
  }

  private async resolveUserCreationEntity(input: CreateAdminUserInput): Promise<BusinessEntity> {
    if (this.ctx.profile.role !== "super_admin" || input.role !== "company_admin") {
      const { data, error } = await this.admin
        .from("business_entities")
        .select(entitySelect)
        .eq("id", input.entityId)
        .is("deleted_at", null)
        .single();
      if (error) throw error;
      return mapEntity(data);
    }

    if (!input.companyName?.trim()) throw new Error("COMPANY_NAME_REQUIRED");
    const slug = await this.uniqueEntitySlug(input.companyName);
    const { data, error } = await this.admin
      .from("business_entities")
      .insert({
        name: input.companyName,
        legal_name: input.companyName,
        slug,
        brand_name: input.companyName,
        portal_slug: slug,
        primary_color: "#0f766e",
        accent_color: "#f59e0b",
        created_by: this.ctx.profile.id,
        updated_by: this.ctx.profile.id
      })
      .select(entitySelect)
      .single();
    if (error) throw error;
    await this.seedSystemCompanyRoles(data.id);
    await writeAudit(this.ctx, { action: "admin.company_created", resourceType: "business_entity", resourceId: data.id, entityId: data.id, metadata: { companyName: input.companyName, slug } });
    return mapEntity(data);
  }

  private async uniqueEntitySlug(companyName: string) {
    const base = slugify(companyName) || "company";
    let candidate = base;
    let suffix = 2;
    while (true) {
      const { data, error } = await this.admin
        .from("business_entities")
        .select("id")
        .or(`slug.eq.${candidate},portal_slug.eq.${candidate}`)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      if (!data) return candidate;
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
  }

  private async seedSystemCompanyRoles(entityId: string) {
    const defaults = [
      {
        name: "Company Admin",
        slug: "company-admin",
        description: "Full company administration",
        permissions: ["user:manage:entity", "company_role:manage:entity", "branding:manage:entity", "company_dashboard:view:entity", "timesheet:view:entity", "timesheet:approve:entity", "timesheet:reject:entity", "timesheet:request_correction:entity", "timesheet:export:entity", "timesheet:payment:entity", "timesheet:delete_refill:entity", "report:export", "payroll:view", "employee_lifecycle:manage:entity", "onboarding_invite:create:entity", "onboarding_template:manage:entity", "offer_template:manage:entity", "offer:send:entity", "learning:manage:entity", "discord_group:manage:entity", "invoice:manage:entity", "project_assignment:manage:entity"]
      },
      {
        name: "HR Manager",
        slug: "hr-manager",
        description: "HR and onboarding operations",
        permissions: ["employee_lifecycle:manage:entity", "onboarding_invite:create:entity", "onboarding_template:manage:entity", "onboarding:manage:entity", "offer_template:manage:entity", "offer:send:entity", "offer:manage:entity", "document:manage:entity", "learning:manage:entity", "discord_group:manage:entity", "candidate:manage:entity"]
      },
      {
        name: "Accounts Manager",
        slug: "accounts-manager",
        description: "Timesheet review, payroll exports, invoices, and project assignments",
        permissions: ["timesheet:view:entity", "timesheet:approve:entity", "timesheet:reject:entity", "timesheet:request_correction:entity", "timesheet:export:entity", "timesheet:payment:entity", "timesheet:delete_refill:entity", "timesheet_attachment:view:entity", "report:export", "payroll:view", "invoice:manage:entity", "project_assignment:manage:entity"]
      },
      {
        name: "Supervisor",
        slug: "supervisor",
        description: "Review assigned employee timesheets and publish learning material",
        permissions: ["timesheet:view:entity", "timesheet:approve:entity", "timesheet:reject:entity", "timesheet:request_correction:entity", "learning:manage:entity"]
      },
      {
        name: "Employee",
        slug: "employee",
        description: "Employee self-service access",
        permissions: ["learning:manage:entity", "timesheet:create:self", "timesheet:edit:self", "timesheet:submit:self", "timesheet:view:self", "timesheet_attachment:upload:self"]
      }
    ];

    const { error } = await this.admin.from("company_roles").upsert(
      defaults.map((role) => ({
        entity_id: entityId,
        ...role,
        is_system: true,
        created_by: this.ctx.profile.id,
        updated_by: this.ctx.profile.id
      })),
      { onConflict: "entity_id,slug" }
    );
    if (error) throw error;
  }

  private async sendCompanyAdminSetupInvite(input: { email: string; fullName: string; password: string; entity: BusinessEntity; portalSlug: string }) {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    const setupInviteUrl = `${appUrl}/${input.portalSlug}/admin/company-setup`;
    if (!process.env.RESEND_API_KEY && !process.env.RESEND_API) {
      return { setupInviteUrl, emailDeliveryStatus: "not_configured" as const };
    }

    try {
      await sendTransactionalEmail({
        to: input.email,
        subject: `Set up ${input.entity.name} in VerTechie Group Workforce OS`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a">
            <h2>Welcome to VerTechie Group Workforce OS</h2>
            <p>Hello ${escapeHtml(input.fullName)},</p>
            <p>Your company admin account for <strong>${escapeHtml(input.entity.name)}</strong> has been created.</p>
            <p><strong>Login email:</strong> ${escapeHtml(input.email)}<br />
            <strong>Temporary password:</strong> ${escapeHtml(input.password)}</p>
            <p>Open the secure setup link below, sign in, and complete your company profile, branding, compliance identity, contacts, logo, home state, EIN, E-Verify number, and HR details.</p>
            <p><a href="${setupInviteUrl}" style="display:inline-block;background:#0f766e;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none">Set up company profile</a></p>
            <p>Company workspace URL: <a href="${setupInviteUrl}">${setupInviteUrl}</a></p>
          </div>
        `
      });
      return { setupInviteUrl, emailDeliveryStatus: "sent" as const };
    } catch {
      return { setupInviteUrl, emailDeliveryStatus: "failed" as const };
    }
  }
}

function mapEntity(row: any): BusinessEntity {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    brandName: row.brand_name,
    brandLogoUrl: row.brand_logo_url || fallbackLogoForEntity({ name: row.name, slug: row.slug, portalSlug: row.portal_slug }),
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    portalSlug: row.portal_slug,
    customDomain: row.custom_domain,
    legalName: row.legal_name,
    companyAddress: row.company_address,
    companyEin: row.company_ein,
    eVerifyNumber: row.e_verify_number,
    companyHomeState: row.company_home_state,
    companyPhone: row.company_phone,
    companyWebsite: row.company_website,
    hrEmail: row.hr_email
  };
}

function mapCompanyRole(row: any): CompanyRole {
  return {
    id: row.id,
    entityId: row.entity_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    permissions: row.permissions ?? [],
    isSystem: row.is_system
  };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function relation<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

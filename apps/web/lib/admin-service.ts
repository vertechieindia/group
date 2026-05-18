import { readFileSync } from "node:fs";
import { join } from "node:path";
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
      : { setupInviteUrl: null, emailDeliveryStatus: null as AdminUser["emailDeliveryStatus"], emailDeliveryError: null };

    await writeAudit(this.ctx, {
      action: "admin.user_created",
      resourceType: "profile",
      resourceId: user.id,
      entityId: input.entityId,
      metadata: { role: input.role, companyName: input.companyName, setupInviteUrl: inviteResult.setupInviteUrl, emailDeliveryStatus: inviteResult.emailDeliveryStatus, emailDeliveryError: inviteResult.emailDeliveryError }
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
    const existingEntity = await this.findReusableCompanyAdminEntity(input.companyName);
    if (existingEntity) return existingEntity;

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

  private async findReusableCompanyAdminEntity(companyName: string): Promise<BusinessEntity | null> {
    const slug = slugify(companyName);
    const { data, error } = await this.admin
      .from("business_entities")
      .select(entitySelect)
      .or(`name.eq.${companyName},slug.eq.${slug},portal_slug.eq.${slug}`)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const { data: admins, error: adminError } = await this.admin
      .from("profiles")
      .select("id")
      .eq("entity_id", data.id)
      .eq("role", "company_admin")
      .is("deleted_at", null)
      .limit(1);
    if (adminError) throw adminError;
    if (admins?.length) throw new Error("COMPANY_ADMIN_ALREADY_EXISTS");

    await this.seedSystemCompanyRoles(data.id);
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
      return { setupInviteUrl, emailDeliveryStatus: "not_configured" as const, emailDeliveryError: "RESEND_API_KEY is not configured." };
    }

    try {
      const email = buildCompanyAdminInviteEmail({
        ...input,
        setupInviteUrl,
        appUrl
      });
      await sendTransactionalEmail({
        to: input.email,
        subject: `${input.entity.name} admin access for Workforce OS`,
        html: email.html,
        text: email.text,
        attachments: email.attachments
      });
      return { setupInviteUrl, emailDeliveryStatus: "sent" as const, emailDeliveryError: null };
    } catch (error) {
      return { setupInviteUrl, emailDeliveryStatus: "failed" as const, emailDeliveryError: readableEmailError(error) };
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

function readableEmailError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const jsonStart = message.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(message.slice(jsonStart)) as { message?: string };
      if (parsed.message) return parsed.message;
    } catch {
      return message;
    }
  }
  return message;
}

function buildCompanyAdminInviteEmail(input: { email: string; fullName: string; password: string; entity: BusinessEntity; setupInviteUrl: string; appUrl: string }) {
  const companyName = escapeHtml(input.entity.name);
  const fullName = escapeHtml(input.fullName);
  const email = escapeHtml(input.email);
  const password = escapeHtml(input.password);
  const setupUrl = escapeHtml(input.setupInviteUrl);
  const logoContentId = "vertechie-logo";
  const logoAttachment = buildInlineLogoAttachment(logoContentId);
  const logoMarkup = logoAttachment
    ? `<img src="cid:${logoContentId}" width="42" height="42" alt="VerTechie Group LLC" style="display:block;border:0;border-radius:8px;background:#ffffff;outline:none;text-decoration:none;" />`
    : `<div style="width:42px;height:42px;border-radius:8px;background:#ffffff;color:#0f766e;font-size:14px;line-height:42px;font-weight:700;text-align:center;">VTG</div>`;
  const supportEmail = process.env.RESEND_REPLY_TO_EMAIL || "support@vertechiegroup.com";

  const text = [
    `Welcome to VerTechie Group LLC Workforce OS`,
    ``,
    `Hello ${input.fullName},`,
    ``,
    `Your company administrator access has been created for ${input.entity.name}.`,
    ``,
    `Sign-in email: ${input.email}`,
    `Temporary password: ${input.password}`,
    ``,
    `Setup link: ${input.setupInviteUrl}`,
    ``,
    `Please sign in, complete your company profile, upload branding, add company identity details, configure HR contacts, and review your workspace settings.`,
    ``,
    `For security, change this temporary password after your first sign-in.`,
    ``,
    `Need help? Reply to this email or contact ${supportEmail}.`,
    ``,
    `VerTechie Group LLC Workforce OS`
  ].join("\n");

  const html = `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${companyName} admin access</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7f9;color:#111827;font-family:Arial,Helvetica,sans-serif;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
      Your ${companyName} administrator access is ready. Complete your company profile in Workforce OS.
    </span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f7f9;margin:0;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px;background:#ffffff;border:1px solid #dbe5ea;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:26px 30px;background:#0f766e;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      ${logoMarkup}
                    </td>
                    <td style="padding-left:14px;vertical-align:middle;">
                      <div style="font-size:18px;line-height:24px;font-weight:700;color:#ffffff;">VerTechie Group LLC</div>
                      <div style="font-size:13px;line-height:18px;color:#ccfbf1;">Workforce Operating System</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 30px 12px;">
                <h1 style="margin:0;font-size:26px;line-height:34px;color:#111827;font-weight:700;">Welcome to Workforce OS</h1>
                <p style="margin:16px 0 0;font-size:15px;line-height:24px;color:#374151;">Hello ${fullName},</p>
                <p style="margin:12px 0 0;font-size:15px;line-height:24px;color:#374151;">
                  Your company administrator access has been created for <strong style="color:#111827;">${companyName}</strong>. Use the secure setup link below to sign in and complete your company workspace.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #dbe5ea;border-radius:12px;background:#f8fafc;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <div style="font-size:13px;line-height:18px;font-weight:700;color:#0f766e;text-transform:uppercase;letter-spacing:.02em;">Account details</div>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:12px;">
                        <tr>
                          <td style="padding:8px 0;font-size:14px;line-height:20px;color:#64748b;width:155px;">Sign-in email</td>
                          <td style="padding:8px 0;font-size:14px;line-height:20px;color:#111827;font-weight:700;">${email}</td>
                        </tr>
                        <tr>
                          <td style="padding:8px 0;font-size:14px;line-height:20px;color:#64748b;width:155px;">Temporary password</td>
                          <td style="padding:8px 0;font-size:14px;line-height:20px;color:#111827;font-weight:700;">${password}</td>
                        </tr>
                      </table>
                      <p style="margin:12px 0 0;font-size:13px;line-height:20px;color:#64748b;">For security, change this temporary password after your first sign-in.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 30px 24px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#374151;">During setup, you can add company branding, legal identity, home state, EIN, E-Verify number, HR contacts, logo, and workspace preferences.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="border-radius:8px;background:#0f766e;">
                      <a href="${setupUrl}" style="display:inline-block;padding:13px 18px;font-size:15px;line-height:20px;color:#ffffff;text-decoration:none;font-weight:700;border-radius:8px;">Open company setup</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:18px 0 0;font-size:13px;line-height:21px;color:#64748b;">If the button does not open, copy and paste this link into your browser:<br /><a href="${setupUrl}" style="color:#0f766e;text-decoration:underline;word-break:break-all;">${setupUrl}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #e5edf2;">
                  <tr>
                    <td style="padding-top:20px;font-size:13px;line-height:21px;color:#64748b;">
                      This message was sent because a VerTechie Group LLC super administrator created a company admin account for ${companyName}. If you were not expecting this, reply to this email or contact ${escapeHtml(supportEmail)}.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <div style="max-width:680px;margin:14px auto 0;text-align:center;font-size:12px;line-height:18px;color:#94a3b8;">
            VerTechie Group LLC Workforce OS
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { html, text, attachments: logoAttachment ? [logoAttachment] : undefined };
}

function buildInlineLogoAttachment(contentId: string) {
  const candidates = [
    join(process.cwd(), "public", "logos", "vertechie-logo.jpg"),
    join(process.cwd(), "apps", "web", "public", "logos", "vertechie-logo.jpg")
  ];

  for (const path of candidates) {
    try {
      return {
        filename: "vertechie-logo.jpg",
        content: readFileSync(path).toString("base64"),
        content_type: "image/jpeg",
        content_id: contentId,
        content_disposition: "inline" as const
      };
    } catch {
      // Try the next known runtime path.
    }
  }

  return null;
}

import { createAdminSupabaseClient } from "@vertechie/db";
import type {
  CreateDiscordGroupInput,
  CreateLearningMaterialInput,
  CreateOfferTemplateInput,
  CreateOnboardingFormTemplateInput,
  CreateOnboardingInviteInput,
  CreateProjectAssignmentInput,
  DiscordLearningGroup,
  EmployeeLearningAssignment,
  InvoiceSummary,
  LearningMaterial,
  LifecycleEmployee,
  OfferTemplate,
  OnboardingFormTemplate,
  OnboardingInvite,
  ProjectAssignment,
  SendOfferLetterInput,
  SentOfferLetter,
  TerminateEmployeeInput,
  UpdateEmployeeLifecycleInput,
  UpdateLearningAssignmentInput
} from "@vertechie/types";
import { writeAudit } from "./audit";
import { sendTransactionalEmail } from "./email";
import { notifyEntityRole, notifyProfile } from "./notifications";
import { buildOfferLetterDocx } from "./offer-letter-document";
import { assertEntityScope, requirePermission, type RequestContext } from "./request-context";

export class LifecycleService {
  private readonly admin = createAdminSupabaseClient();

  constructor(private readonly ctx: RequestContext) {}

  async listEmployees(entityId?: string): Promise<LifecycleEmployee[]> {
    const listAllCompanies = this.ctx.profile.role === "super_admin" && !entityId;
    const scopedEntityId = entityId ?? this.ctx.profile.entityId;
    if (!listAllCompanies) {
      await assertEntityScope(this.ctx, scopedEntityId);
      await requirePermission(this.ctx, "employee_lifecycle:manage:entity", scopedEntityId);
    }

    let query = this.admin
      .from("employees")
      .select("id, profile_id, entity_id, employee_number, unique_employee_code, title, department, employee_type, onboarding_status, supervisor_id, client_name, project_name, updated_resume_provided, resume_status, offer_letter_status, interview_prep_status, interview_prep_count, interview_feedback, linkedin_review_status, marketing_status, marketing_technology, candidate_status, recruiter_assigned_id, profiles!employees_profile_id_fkey(full_name, email, role, is_active), business_entities!employees_entity_id_fkey(name, slug)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (!listAllCompanies) query = query.eq("entity_id", scopedEntityId);
    const { data, error } = await query;
    if (error) throw error;

    const supervisors = new Map((data ?? []).map((employee: any) => [employee.id, employee.profiles?.full_name ?? null]));
    const recruiterIds = Array.from(new Set((data ?? []).map((employee: any) => employee.recruiter_assigned_id).filter(Boolean)));
    const { data: recruiters } = recruiterIds.length
      ? await this.admin.from("profiles").select("id, full_name").in("id", recruiterIds)
      : { data: [] };
    const recruiterNames = new Map((recruiters ?? []).map((profile: any) => [profile.id, profile.full_name]));
    return (data ?? [])
      .filter((row: any) => ["employee", "candidate"].includes(row.profiles?.role))
      .map((row: any) => ({
      id: row.id,
      profileId: row.profile_id,
      entityId: row.entity_id,
      entityName: row.business_entities?.name ?? null,
      entitySlug: row.business_entities?.slug ?? null,
      fullName: row.profiles?.full_name ?? "Employee",
      email: row.profiles?.email ?? "",
      role: row.profiles?.role ?? "employee",
      isActive: row.profiles?.is_active !== false,
      employeeNumber: row.employee_number,
      uniqueEmployeeCode: row.unique_employee_code,
      title: row.title,
      department: row.department,
      employeeType: row.employee_type,
      onboardingStatus: row.onboarding_status,
      supervisorId: row.supervisor_id,
      supervisorName: row.supervisor_id ? supervisors.get(row.supervisor_id) ?? null : null,
      clientName: row.client_name,
      projectName: row.project_name,
      updatedResumeProvided: row.updated_resume_provided,
      resumeStatus: row.resume_status,
      offerLetterStatus: row.offer_letter_status,
      interviewPrepStatus: row.interview_prep_status,
      interviewPrepCount: row.interview_prep_count,
      interviewFeedback: row.interview_feedback,
      linkedinReviewStatus: row.linkedin_review_status,
      marketingStatus: row.marketing_status,
      marketingTechnology: row.marketing_technology,
      candidateStatus: row.candidate_status,
      recruiterAssignedId: row.recruiter_assigned_id,
      recruiterName: row.recruiter_assigned_id ? recruiterNames.get(row.recruiter_assigned_id) ?? null : null
    }));
  }

  async updateEmployeeLifecycle(input: UpdateEmployeeLifecycleInput) {
    await assertEntityScope(this.ctx, input.entityId);
    await requirePermission(this.ctx, "employee_lifecycle:manage:entity", input.entityId);

    const { data, error } = await this.admin
      .from("employees")
      .update({
        employee_type: input.employeeType,
        supervisor_id: input.supervisorId,
        client_name: input.clientName,
        project_name: input.projectName,
        updated_resume_provided: input.updatedResumeProvided,
        resume_status: input.resumeStatus,
        offer_letter_status: input.offerLetterStatus,
        interview_prep_status: input.interviewPrepStatus,
        interview_prep_count: input.interviewPrepCount,
        interview_feedback: input.interviewFeedback,
        linkedin_review_status: input.linkedinReviewStatus,
        marketing_status: input.marketingStatus,
        marketing_technology: input.marketingTechnology,
        candidate_status: input.candidateStatus,
        recruiter_assigned_id: input.recruiterAssignedId,
        updated_by: this.ctx.profile.id
      })
      .eq("id", input.employeeId)
      .eq("entity_id", input.entityId)
      .is("deleted_at", null)
      .select("id")
      .single();
    if (error) throw error;

    if (input.supervisorId) {
      const { data: employee } = await this.admin.from("employees").select("profile_id").eq("id", input.supervisorId).single();
      if (employee?.profile_id) {
        await notifyProfile(this.ctx, {
          entityId: input.entityId,
          recipientId: employee.profile_id,
          type: "employee.supervisor_assignment",
          title: "Supervisor assignment updated",
          body: "An employee has been assigned to your supervision queue.",
          payload: { employeeId: input.employeeId }
        });
      }
    }

    await writeAudit(this.ctx, { action: "employee.lifecycle_updated", resourceType: "employee", resourceId: data.id, entityId: input.entityId, metadata: { employeeType: input.employeeType } });
    return (await this.listEmployees(input.entityId)).find((employee) => employee.id === input.employeeId);
  }

  async terminateEmployee(employeeId: string, input: TerminateEmployeeInput) {
    await assertEntityScope(this.ctx, input.entityId);
    await requirePermission(this.ctx, "employee_lifecycle:manage:entity", input.entityId);

    const { data: employee, error } = await this.admin
      .from("employees")
      .select("id, profile_id, entity_id, employee_number, unique_employee_code, title, profiles!employees_profile_id_fkey(full_name, email), business_entities!employees_entity_id_fkey(name, brand_name, hr_email)")
      .eq("id", employeeId)
      .eq("entity_id", input.entityId)
      .is("deleted_at", null)
      .single();
    if (error || !employee) throw new Error("EMPLOYEE_NOT_FOUND");

    const effectiveDate = input.effectiveDate || new Date().toISOString().slice(0, 10);
    const profile = relation(employee.profiles);
    const entity = relation(employee.business_entities);
    const fullName = profile?.full_name ?? "Employee";
    const email = profile?.email ?? "";
    const companyName = entity?.brand_name || entity?.name || "Company";

    const [{ error: employeeUpdateError }, { error: profileUpdateError }, { error: authUpdateError }] = await Promise.all([
      this.admin
        .from("employees")
        .update({
          employment_status: "terminated",
          onboarding_status: "terminated",
          offer_letter_status: "terminated",
          marketing_status: "stopped",
          candidate_status: "stopped_marketing",
          updated_by: this.ctx.profile.id
        })
        .eq("id", employeeId)
        .eq("entity_id", input.entityId),
      this.admin
        .from("profiles")
        .update({ is_active: false, updated_by: this.ctx.profile.id })
        .eq("id", employee.profile_id),
      this.admin.auth.admin.updateUserById(employee.profile_id, { ban_duration: "876000h" })
    ]);
    if (employeeUpdateError) throw employeeUpdateError;
    if (profileUpdateError) throw profileUpdateError;
    if (authUpdateError) throw authUpdateError;

    const emailResult = await this.sendTerminationEmail({
      to: email,
      fullName,
      companyName,
      reason: input.reason,
      effectiveDate,
      employeeCode: employee.unique_employee_code || employee.employee_number,
      supportEmail: entity?.hr_email || this.ctx.profile.email
    });

    await writeAudit(this.ctx, {
      action: "employee.terminated",
      resourceType: "employee",
      resourceId: employeeId,
      entityId: input.entityId,
      metadata: { effectiveDate, reason: input.reason, emailDeliveryStatus: emailResult.emailDeliveryStatus, emailDeliveryError: emailResult.emailDeliveryError }
    });
    return { terminated: true, emailDeliveryStatus: emailResult.emailDeliveryStatus, emailDeliveryError: emailResult.emailDeliveryError };
  }

  private async sendTerminationEmail(input: { to: string; fullName: string; companyName: string; employeeCode: string; reason: string; effectiveDate: string; supportEmail: string }) {
    if (!process.env.RESEND_API_KEY && !process.env.RESEND_API) {
      return { emailDeliveryStatus: "not_configured" as const, emailDeliveryError: "RESEND_API_KEY is not configured." };
    }
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;background:#f4f7f9;padding:28px;color:#111827">
      <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #dbe5ea;border-radius:14px;overflow:hidden">
        <div style="background:#0f766e;color:#fff;padding:24px 28px">
          <div style="font-size:20px;font-weight:700">${escapeHtml(input.companyName)}</div>
          <div style="font-size:13px;color:#ccfbf1">Employment status notification</div>
        </div>
        <div style="padding:28px">
          <h1 style="margin:0 0 16px;font-size:24px">Employment termination notice</h1>
          <p>Hello ${escapeHtml(input.fullName)},</p>
          <p>This notice confirms that your employment record with <strong>${escapeHtml(input.companyName)}</strong> has been marked terminated effective <strong>${escapeHtml(input.effectiveDate)}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:18px 0;background:#f8fafc;border:1px solid #dbe5ea;border-radius:10px">
            <tr><td style="padding:12px 16px;color:#64748b">Employee ID</td><td style="padding:12px 16px;font-weight:700">${escapeHtml(input.employeeCode)}</td></tr>
            <tr><td style="padding:12px 16px;color:#64748b">Effective date</td><td style="padding:12px 16px;font-weight:700">${escapeHtml(input.effectiveDate)}</td></tr>
          </table>
          <p><strong>Reason or HR note:</strong></p>
          <p style="white-space:pre-line">${escapeHtml(input.reason)}</p>
          <p>Your Workforce OS account access has been deactivated. For final documents, payroll questions, or corrections, contact ${escapeHtml(input.supportEmail)}.</p>
        </div>
      </div>
    </div>`;
    const text = `Employment termination notice\n\nHello ${input.fullName},\n\nYour employment record with ${input.companyName} has been marked terminated effective ${input.effectiveDate}.\n\nEmployee ID: ${input.employeeCode}\nReason or HR note: ${input.reason}\n\nYour Workforce OS account access has been deactivated. Contact ${input.supportEmail} for final documents or payroll questions.`;
    try {
      await sendTransactionalEmail({
        to: input.to,
        subject: `${input.companyName} employment termination notice`,
        html,
        text
      });
      return { emailDeliveryStatus: "sent" as const, emailDeliveryError: null };
    } catch (error) {
      return { emailDeliveryStatus: "failed" as const, emailDeliveryError: error instanceof Error ? error.message : String(error) };
    }
  }

  async listOnboardingInvites(entityId?: string): Promise<OnboardingInvite[]> {
    const scopedEntityId = entityId ?? this.ctx.profile.entityId;
    await assertEntityScope(this.ctx, scopedEntityId);
    await requirePermission(this.ctx, "onboarding_invite:create:entity", scopedEntityId);

    const { data, error } = await this.admin
      .from("onboarding_invites")
      .select("id, entity_id, email, status, expires_at, created_at")
      .eq("entity_id", scopedEntityId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      entityId: row.entity_id,
      email: row.email,
      status: row.status,
      expiresAt: row.expires_at,
      createdAt: row.created_at
    }));
  }

  async createOnboardingInvite(input: CreateOnboardingInviteInput) {
    await assertEntityScope(this.ctx, input.entityId);
    await requirePermission(this.ctx, "onboarding_invite:create:entity", input.entityId);

    const tokenHash = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await this.admin
      .from("onboarding_invites")
      .insert({
        entity_id: input.entityId,
        candidate_id: input.candidateId,
        employee_id: input.employeeId,
        email: input.email,
        status: "sent",
        token_hash: tokenHash,
        expires_at: expiresAt,
        sent_at: new Date().toISOString(),
        created_by: this.ctx.profile.id,
        updated_by: this.ctx.profile.id
      })
      .select("id, entity_id, email, status, expires_at, created_at")
      .single();
    if (error) throw error;

    if (input.employeeId) {
      await this.admin.from("employees").update({ onboarding_status: "invited", updated_by: this.ctx.profile.id }).eq("id", input.employeeId).eq("entity_id", input.entityId);
    }

    await notifyEntityRole(this.ctx, {
      entityId: input.entityId,
      role: "hr",
      type: "onboarding.invite_sent",
      title: "Onboarding invite sent",
      body: `${input.email} has been invited to complete onboarding.`,
      payload: { inviteId: data.id }
    });
    await writeAudit(this.ctx, { action: "onboarding.invite_sent", resourceType: "onboarding_invite", resourceId: data.id, entityId: input.entityId, metadata: { email: input.email } });
    return {
      id: data.id,
      entityId: data.entity_id,
      email: data.email,
      status: data.status,
      expiresAt: data.expires_at,
      createdAt: data.created_at
    } satisfies OnboardingInvite;
  }

  async listOnboardingFormTemplates(entityId?: string): Promise<OnboardingFormTemplate[]> {
    const scopedEntityId = entityId ?? this.ctx.profile.entityId;
    await assertEntityScope(this.ctx, scopedEntityId);
    await requirePermission(this.ctx, "onboarding_template:manage:entity", scopedEntityId);

    const { data, error } = await this.admin
      .from("onboarding_form_templates")
      .select("id, entity_id, name, description, fields, is_active, version, created_at")
      .eq("entity_id", scopedEntityId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapOnboardingFormTemplate);
  }

  async createOnboardingFormTemplate(input: CreateOnboardingFormTemplateInput) {
    await assertEntityScope(this.ctx, input.entityId);
    await requirePermission(this.ctx, "onboarding_template:manage:entity", input.entityId);

    const { data: latest } = await this.admin
      .from("onboarding_form_templates")
      .select("version")
      .eq("entity_id", input.entityId)
      .is("deleted_at", null)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    await this.admin
      .from("onboarding_form_templates")
      .update({ is_active: false, updated_by: this.ctx.profile.id })
      .eq("entity_id", input.entityId)
      .is("deleted_at", null);

    const { data, error } = await this.admin
      .from("onboarding_form_templates")
      .insert({
        entity_id: input.entityId,
        name: input.name,
        description: input.description,
        fields: input.fields,
        is_active: true,
        version: Number(latest?.version ?? 0) + 1,
        created_by: this.ctx.profile.id,
        updated_by: this.ctx.profile.id
      })
      .select("id, entity_id, name, description, fields, is_active, version, created_at")
      .single();
    if (error) throw error;

    await writeAudit(this.ctx, {
      action: "onboarding.template_created",
      resourceType: "onboarding_form_template",
      resourceId: data.id,
      entityId: input.entityId,
      metadata: { fieldCount: input.fields.length, version: data.version }
    });
    return mapOnboardingFormTemplate(data);
  }

  async listOfferTemplates(entityId?: string): Promise<OfferTemplate[]> {
    const scopedEntityId = entityId ?? this.ctx.profile.entityId;
    await assertEntityScope(this.ctx, scopedEntityId);
    await requirePermission(this.ctx, "offer_template:manage:entity", scopedEntityId);

    const { data, error } = await this.admin
      .from("offer_templates")
      .select("id, entity_id, name, description, template_body, required_fields, is_default")
      .eq("entity_id", scopedEntityId)
      .is("deleted_at", null)
      .order("is_default", { ascending: false })
      .order("name");
    if (error) throw error;
    return (data ?? []).map(mapOfferTemplate);
  }

  async createOfferTemplate(input: CreateOfferTemplateInput) {
    await assertEntityScope(this.ctx, input.entityId);
    await requirePermission(this.ctx, "offer_template:manage:entity", input.entityId);
    const { data, error } = await this.admin
      .from("offer_templates")
      .insert({
        entity_id: input.entityId,
        name: input.name,
        description: input.description,
        template_body: input.templateBody,
        required_fields: input.requiredFields,
        is_default: input.isDefault,
        created_by: this.ctx.profile.id,
        updated_by: this.ctx.profile.id
      })
      .select("id, entity_id, name, description, template_body, required_fields, is_default")
      .single();
    if (error) throw error;
    await writeAudit(this.ctx, { action: "offer_template.created", resourceType: "offer_template", resourceId: data.id, entityId: input.entityId });
    return mapOfferTemplate(data);
  }

  async sendOfferLetter(input: SendOfferLetterInput): Promise<SentOfferLetter> {
    await assertEntityScope(this.ctx, input.entityId);
    await requirePermission(this.ctx, "offer:send:entity", input.entityId);

    const { data: template, error: templateError } = await this.admin
      .from("offer_templates")
      .select("id, entity_id, name")
      .eq("id", input.templateId)
      .eq("entity_id", input.entityId)
      .is("deleted_at", null)
      .single();
    if (templateError || !template) throw new Error("OFFER_TEMPLATE_NOT_FOUND");

    const companyProfile = await this.getOfferCompanyProfile(input.entityId);
    const offerInput: SendOfferLetterInput = {
      ...input,
      companyName: companyProfile.legal_name || companyProfile.brand_name || companyProfile.name || input.companyName,
      companyAddress: companyProfile.company_address || input.companyAddress,
      companyWebsite: companyProfile.company_website || input.companyWebsite,
      companyPhone: companyProfile.company_phone || input.companyPhone,
      companyEin: companyProfile.company_ein || input.companyEin,
      eVerifyNumber: companyProfile.e_verify_number || input.eVerifyNumber,
      companyHomeState: companyProfile.company_home_state || input.companyHomeState,
      homeStateBusinessId: companyProfile.home_state_business_id || input.homeStateBusinessId,
      operatingStates: companyProfile.operating_states?.length ? companyProfile.operating_states : input.operatingStates,
      operatingStateRegistrations: Array.isArray(companyProfile.operating_state_registrations)
        ? companyProfile.operating_state_registrations.map((registration: any) => ({
          state: registration.state,
          foreignControlNumber: registration.foreignControlNumber ?? registration.foreign_control_number ?? null
        }))
        : input.operatingStateRegistrations,
      companyLogoUrl: companyProfile.brand_logo_url || input.companyLogoUrl
    };

    const { data: existingCandidate } = await this.admin
      .from("candidates")
      .select("id")
      .eq("entity_id", input.entityId)
      .ilike("email", input.candidateEmail)
      .is("deleted_at", null)
      .maybeSingle();

    const candidate = existingCandidate ?? (await this.createOfferCandidate(input)).data;
    if (!candidate?.id) throw new Error("CANDIDATE_CREATE_FAILED");

    const { data: offer, error: offerError } = await this.admin
      .from("offer_letters")
      .insert({
        entity_id: input.entityId,
        candidate_id: candidate.id,
        employee_id: input.employeeId,
        template_id: input.templateId,
        template_key: template.name,
        candidate_name: input.candidateName,
        candidate_email: input.candidateEmail,
        status: "draft",
        draft_body: input.draftBody,
        email_subject: input.emailSubject,
        email_message: input.emailMessage,
        expires_at: input.expiryDate ? `${input.expiryDate}T23:59:59Z` : null,
        created_by: this.ctx.profile.id,
        updated_by: this.ctx.profile.id,
        metadata: {
          jobTitle: input.jobTitle,
          compensation: input.compensation,
          startDate: input.startDate,
          workLocation: input.workLocation,
          reportsTo: input.reportsTo,
          companyEin: offerInput.companyEin,
          eVerifyNumber: offerInput.eVerifyNumber,
          companyHomeState: offerInput.companyHomeState,
          homeStateBusinessId: offerInput.homeStateBusinessId,
          operatingStates: offerInput.operatingStates,
          operatingStateRegistrations: offerInput.operatingStateRegistrations
        }
      })
      .select("id")
      .single();
    if (offerError) throw offerError;

    const docx = await buildOfferLetterDocx(offerInput);
    const filename = `offer-letter-${slugify(input.candidateName)}.docx`;
    const storagePath = `${input.entityId}/${candidate.id}/${offer.id}/${filename}`;
    const { error: uploadError } = await this.admin.storage
      .from("offer-letters")
      .upload(storagePath, docx, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true
      });
    if (uploadError) throw uploadError;

    await sendTransactionalEmail({
      to: input.candidateEmail,
      subject: input.emailSubject,
      html: emailHtml(input),
      attachments: [{ filename, content: docx.toString("base64") }]
    });

    const sentAt = new Date().toISOString();
    const { error: updateError } = await this.admin
      .from("offer_letters")
      .update({
        status: "sent",
        docx_path: storagePath,
        sent_at: sentAt,
        sent_by: this.ctx.profile.id,
        updated_by: this.ctx.profile.id
      })
      .eq("id", offer.id);
    if (updateError) throw updateError;

    if (input.employeeId) {
      await this.admin
        .from("employees")
        .update({ offer_letter_status: "initial_opt", updated_by: this.ctx.profile.id })
        .eq("id", input.employeeId)
        .eq("entity_id", input.entityId);
    }

    await writeAudit(this.ctx, {
      action: "offer_letter.sent",
      resourceType: "offer_letter",
      resourceId: offer.id,
      entityId: input.entityId,
      metadata: { candidateEmail: input.candidateEmail, templateId: input.templateId, docxPath: storagePath }
    });

    return {
      id: offer.id,
      entityId: input.entityId,
      candidateId: candidate.id,
      candidateName: input.candidateName,
      candidateEmail: input.candidateEmail,
      status: "sent",
      docxPath: storagePath,
      sentAt
    };
  }

  private async getOfferCompanyProfile(entityId: string) {
    const { data, error } = await this.admin
      .from("business_entities")
      .select("name, legal_name, brand_name, brand_logo_url, company_address, company_phone, company_website, company_ein, e_verify_number, company_home_state, home_state_business_id, operating_states, operating_state_registrations")
      .eq("id", entityId)
      .single();
    if (error) throw error;
    return data as any;
  }

  private createOfferCandidate(input: SendOfferLetterInput) {
    return this.admin
      .from("candidates")
      .insert({
        entity_id: input.entityId,
        owner_id: this.ctx.profile.id,
        full_name: input.candidateName,
        email: input.candidateEmail,
        source: "offer_letter",
        stage: "offer",
        status: "active",
        metadata: { address: input.candidateAddress, jobTitle: input.jobTitle },
        created_by: this.ctx.profile.id,
        updated_by: this.ctx.profile.id
      })
      .select("id")
      .single();
  }

  async listLearningMaterials(entityId?: string): Promise<LearningMaterial[]> {
    const scopedEntityId = entityId ?? this.ctx.profile.entityId;
    await assertEntityScope(this.ctx, scopedEntityId);
    await requirePermission(this.ctx, "learning:manage:entity", scopedEntityId);

    const { data, error } = await this.admin
      .from("learning_materials")
      .select(`
        id,
        entity_id,
        title,
        course_name,
        description,
        content_url,
        material_type,
        required,
        estimated_minutes,
        published_at,
        learning_assignments(
          id,
          employee_id,
          due_date,
          status,
          acknowledged_at,
          completed_at,
          employees!learning_assignments_employee_id_fkey(
            profiles!employees_profile_id_fkey(full_name, email)
          )
        )
      `)
      .eq("entity_id", scopedEntityId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapLearningMaterial);
  }

  async createLearningMaterial(input: CreateLearningMaterialInput) {
    await assertEntityScope(this.ctx, input.entityId);
    await requirePermission(this.ctx, "learning:manage:entity", input.entityId);
    const { data, error } = await this.admin
      .from("learning_materials")
      .insert({
        entity_id: input.entityId,
        title: input.title,
        course_name: input.courseName,
        description: input.description,
        content_url: input.contentUrl,
        material_type: input.materialType,
        required: input.required,
        estimated_minutes: input.estimatedMinutes,
        published_at: new Date().toISOString(),
        created_by: this.ctx.profile.id,
        updated_by: this.ctx.profile.id
      })
      .select("id, entity_id, title, course_name, description, content_url, material_type, required, estimated_minutes, published_at")
      .single();
    if (error) throw error;

    const employeeIds = await this.resolveLearningAudience(input.entityId, input.assignedEmployeeIds);
    if (employeeIds.length) {
      const { error: assignmentError } = await this.admin.from("learning_assignments").insert(
        employeeIds.map((employeeId) => ({
          entity_id: input.entityId,
          material_id: data.id,
          employee_id: employeeId,
          assigned_by: this.ctx.profile.id,
          due_date: input.dueDate,
          created_by: this.ctx.profile.id,
          updated_by: this.ctx.profile.id
        }))
      );
      if (assignmentError) throw assignmentError;

      const { data: assignedEmployees } = await this.admin
        .from("employees")
        .select("id, profile_id")
        .eq("entity_id", input.entityId)
        .in("id", employeeIds)
        .is("deleted_at", null);

      await Promise.all((assignedEmployees ?? []).map((employee: any) => employee.profile_id
        ? notifyProfile(this.ctx, {
            entityId: input.entityId,
            recipientId: employee.profile_id,
            type: "learning.material_assigned",
            title: "New learning material assigned",
            body: `${input.title} is ready for your review${input.dueDate ? ` by ${input.dueDate}` : ""}.`,
            payload: { materialId: data.id, employeeId: employee.id }
          })
        : Promise.resolve()));
    }

    await writeAudit(this.ctx, {
      action: "learning.material_created",
      resourceType: "learning_material",
      resourceId: data.id,
      entityId: input.entityId,
      metadata: { assignedEmployeeCount: employeeIds.length, required: input.required }
    });

    return {
      id: data.id,
      entityId: data.entity_id,
      title: data.title,
      courseName: data.course_name,
      description: data.description,
      contentUrl: data.content_url,
      materialType: data.material_type,
      required: data.required,
      estimatedMinutes: data.estimated_minutes,
      publishedAt: data.published_at,
      assignments: []
    } satisfies LearningMaterial;
  }

  async listDiscordGroups(entityId?: string): Promise<DiscordLearningGroup[]> {
    const scopedEntityId = entityId ?? this.ctx.profile.entityId;
    await assertEntityScope(this.ctx, scopedEntityId);
    await requirePermission(this.ctx, "discord_group:manage:entity", scopedEntityId);

    const { data, error } = await this.admin
      .from("discord_learning_groups")
      .select(`
        id,
        entity_id,
        supervisor_id,
        name,
        discord_url,
        description,
        created_at,
        discord_learning_group_members(
          employee_id,
          employees!discord_learning_group_members_employee_id_fkey(
            profiles!employees_profile_id_fkey(full_name, email)
          )
        )
      `)
      .eq("entity_id", scopedEntityId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapDiscordGroup);
  }

  async createDiscordGroup(input: CreateDiscordGroupInput) {
    await assertEntityScope(this.ctx, input.entityId);
    await requirePermission(this.ctx, "discord_group:manage:entity", input.entityId);

    const employeeIds = await this.resolveLearningAudience(input.entityId, input.employeeIds);
    const supervisorId = await this.currentEmployeeId(input.entityId);
    const { data, error } = await this.admin
      .from("discord_learning_groups")
      .insert({
        entity_id: input.entityId,
        supervisor_id: supervisorId,
        name: input.name,
        discord_url: input.discordUrl,
        description: input.description,
        created_by: this.ctx.profile.id,
        updated_by: this.ctx.profile.id
      })
      .select("id, entity_id, supervisor_id, name, discord_url, description, created_at")
      .single();
    if (error) throw error;

    if (employeeIds.length) {
      const { error: memberError } = await this.admin.from("discord_learning_group_members").insert(
        employeeIds.map((employeeId) => ({
          entity_id: input.entityId,
          group_id: data.id,
          employee_id: employeeId,
          created_by: this.ctx.profile.id
        }))
      );
      if (memberError) throw memberError;

      const { data: members } = await this.admin
        .from("employees")
        .select("id, profile_id")
        .eq("entity_id", input.entityId)
        .in("id", employeeIds)
        .is("deleted_at", null);
      await Promise.all((members ?? []).map((employee: any) => employee.profile_id
        ? notifyProfile(this.ctx, {
            entityId: input.entityId,
            recipientId: employee.profile_id,
            type: "learning.discord_group_created",
            title: "Learning group invite available",
            body: `${input.name} has been created for your supervisor learning group.`,
            payload: { groupId: data.id, employeeId: employee.id }
          })
        : Promise.resolve()));
    }

    await writeAudit(this.ctx, {
      action: "learning.discord_group_created",
      resourceType: "discord_learning_group",
      resourceId: data.id,
      entityId: input.entityId,
      metadata: { memberCount: employeeIds.length }
    });
    return (await this.listDiscordGroups(input.entityId)).find((group) => group.id === data.id);
  }

  async listMyLearningAssignments(): Promise<EmployeeLearningAssignment[]> {
    const employeeId = await this.currentEmployeeId(this.ctx.profile.entityId);
    if (!employeeId) return [];

    const { data, error } = await this.admin
      .from("learning_assignments")
      .select(`
        id,
        entity_id,
        due_date,
        status,
        acknowledged_at,
        completed_at,
        learning_materials!learning_assignments_material_id_fkey(
          id,
          title,
          course_name,
          description,
          content_url,
          material_type,
          required,
          estimated_minutes,
          published_at
        )
      `)
      .eq("entity_id", this.ctx.profile.entityId)
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapEmployeeLearningAssignment);
  }

  async updateMyLearningAssignment(input: UpdateLearningAssignmentInput) {
    const employeeId = await this.currentEmployeeId(this.ctx.profile.entityId);
    if (!employeeId) throw new Error("EMPLOYEE_PROFILE_NOT_FOUND");

    const update: Record<string, string> = {
      status: input.status,
      updated_by: this.ctx.profile.id
    };
    if (input.status === "acknowledged") update.acknowledged_at = new Date().toISOString();
    if (input.status === "completed") update.completed_at = new Date().toISOString();

    const { data, error } = await this.admin
      .from("learning_assignments")
      .update(update)
      .eq("id", input.assignmentId)
      .eq("employee_id", employeeId)
      .eq("entity_id", this.ctx.profile.entityId)
      .is("deleted_at", null)
      .select("id, entity_id, material_id")
      .single();
    if (error) throw error;

    await writeAudit(this.ctx, {
      action: "learning.assignment_updated",
      resourceType: "learning_assignment",
      resourceId: data.id,
      entityId: data.entity_id,
      metadata: { status: input.status, materialId: data.material_id }
    });
    return (await this.listMyLearningAssignments()).find((assignment) => assignment.id === input.assignmentId);
  }

  async listInvoices(entityId?: string): Promise<InvoiceSummary[]> {
    const scopedEntityId = entityId ?? this.ctx.profile.entityId;
    await assertEntityScope(this.ctx, scopedEntityId);
    await requirePermission(this.ctx, "invoice:manage:entity", scopedEntityId);

    const { data, error } = await this.admin
      .from("invoices")
      .select("id, invoice_number, status, total_hours, total_amount, period_start, period_end")
      .eq("entity_id", scopedEntityId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      status: row.status,
      totalHours: Number(row.total_hours ?? 0),
      totalAmount: Number(row.total_amount ?? 0),
      periodStart: row.period_start,
      periodEnd: row.period_end
    }));
  }

  async listProjectAssignments(entityId?: string): Promise<ProjectAssignment[]> {
    const scopedEntityId = entityId ?? this.ctx.profile.entityId;
    await assertEntityScope(this.ctx, scopedEntityId);
    await requirePermission(this.ctx, "project_assignment:manage:entity", scopedEntityId);

    const { data, error } = await this.admin
      .from("employee_project_assignments")
      .select("id, entity_id, employee_id, client_name, project_name, role_name, rate_type, bill_rate, start_date, end_date, is_default, employees!inner(employee_number, profiles!employees_profile_id_fkey(full_name))")
      .eq("entity_id", scopedEntityId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapProjectAssignment);
  }

  async createProjectAssignment(input: CreateProjectAssignmentInput) {
    await assertEntityScope(this.ctx, input.entityId);
    await requirePermission(this.ctx, "project_assignment:manage:entity", input.entityId);

    if (input.isDefault) {
      await this.admin
        .from("employee_project_assignments")
        .update({ is_default: false, updated_by: this.ctx.profile.id })
        .eq("employee_id", input.employeeId)
        .eq("entity_id", input.entityId)
        .is("deleted_at", null);
    }

    const { data, error } = await this.admin
      .from("employee_project_assignments")
      .insert({
        entity_id: input.entityId,
        employee_id: input.employeeId,
        client_name: input.clientName,
        project_name: input.projectName,
        role_name: input.roleName,
        rate_type: input.rateType,
        bill_rate: input.billRate,
        start_date: input.startDate,
        end_date: input.endDate,
        is_default: input.isDefault,
        created_by: this.ctx.profile.id,
        updated_by: this.ctx.profile.id
      })
      .select("id, entity_id, employee_id, client_name, project_name, role_name, rate_type, bill_rate, start_date, end_date, is_default, employees!inner(employee_number, profiles!employees_profile_id_fkey(full_name))")
      .single();
    if (error) throw error;

    await this.admin
      .from("employees")
      .update({ client_name: input.clientName, project_name: input.projectName, updated_by: this.ctx.profile.id })
      .eq("id", input.employeeId)
      .eq("entity_id", input.entityId);

    await writeAudit(this.ctx, { action: "project_assignment.created", resourceType: "employee_project_assignment", resourceId: data.id, entityId: input.entityId });
    return mapProjectAssignment(data);
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

  private async resolveLearningAudience(entityId: string, selectedEmployeeIds: string[]) {
    if (selectedEmployeeIds.length) {
      const { data, error } = await this.admin
        .from("employees")
        .select("id")
        .eq("entity_id", entityId)
        .in("id", selectedEmployeeIds)
        .is("deleted_at", null);
      if (error) throw error;
      return (data ?? []).map((employee: any) => employee.id);
    }

    const supervisorId = await this.currentEmployeeId(entityId);
    if (!supervisorId) return [];
    const { data, error } = await this.admin
      .from("employees")
      .select("id")
      .eq("entity_id", entityId)
      .eq("supervisor_id", supervisorId)
      .is("deleted_at", null);
    if (error) throw error;
    return (data ?? []).map((employee: any) => employee.id);
  }
}

function mapOfferTemplate(row: any): OfferTemplate {
  return {
    id: row.id,
    entityId: row.entity_id,
    name: row.name,
    description: row.description,
    templateBody: row.template_body,
    requiredFields: Array.isArray(row.required_fields) ? row.required_fields : [],
    isDefault: row.is_default
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "candidate";
}

function emailHtml(input: SendOfferLetterInput) {
  const message = input.emailMessage
    .split("\n")
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      ${message}
      <p>The formal offer letter is attached for review and signature.</p>
      <p>Regards,<br />${escapeHtml(input.signerName)}<br />${escapeHtml(input.signerTitle)}<br />${escapeHtml(input.companyName)}</p>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function mapOnboardingFormTemplate(row: any): OnboardingFormTemplate {
  return {
    id: row.id,
    entityId: row.entity_id,
    name: row.name,
    description: row.description,
    fields: row.fields ?? [],
    isActive: row.is_active,
    version: row.version,
    createdAt: row.created_at
  };
}

function relation<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

function mapProjectAssignment(row: any): ProjectAssignment {
  const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
  const profile = Array.isArray(employee?.profiles) ? employee.profiles[0] : employee?.profiles;
  return {
    id: row.id,
    entityId: row.entity_id,
    employeeId: row.employee_id,
    employeeName: profile?.full_name ?? null,
    employeeNumber: employee?.employee_number ?? null,
    clientName: row.client_name,
    projectName: row.project_name,
    roleName: row.role_name,
    rateType: row.rate_type ?? "hourly",
    billRate: row.bill_rate == null ? null : Number(row.bill_rate),
    startDate: row.start_date,
    endDate: row.end_date,
    isDefault: row.is_default
  };
}

function mapLearningMaterial(row: any): LearningMaterial {
  return {
    id: row.id,
    entityId: row.entity_id,
    title: row.title,
    courseName: row.course_name,
    description: row.description,
    contentUrl: row.content_url,
    materialType: row.material_type,
    required: Boolean(row.required),
    estimatedMinutes: row.estimated_minutes == null ? null : Number(row.estimated_minutes),
    publishedAt: row.published_at,
    assignments: (row.learning_assignments ?? []).map((assignment: any) => {
      const employee = Array.isArray(assignment.employees) ? assignment.employees[0] : assignment.employees;
      const profile = Array.isArray(employee?.profiles) ? employee.profiles[0] : employee?.profiles;
      return {
        id: assignment.id,
        employeeId: assignment.employee_id,
        employeeName: profile?.full_name ?? null,
        employeeEmail: profile?.email ?? null,
        dueDate: assignment.due_date,
        status: assignment.status,
        acknowledgedAt: assignment.acknowledged_at,
        completedAt: assignment.completed_at
      };
    })
  };
}

function mapDiscordGroup(row: any): DiscordLearningGroup {
  const members = (row.discord_learning_group_members ?? []).map((member: any) => {
    const employee = Array.isArray(member.employees) ? member.employees[0] : member.employees;
    const profile = Array.isArray(employee?.profiles) ? employee.profiles[0] : employee?.profiles;
    return {
      employeeId: member.employee_id,
      employeeName: profile?.full_name ?? null,
      employeeEmail: profile?.email ?? null
    };
  });
  return {
    id: row.id,
    entityId: row.entity_id,
    supervisorId: row.supervisor_id,
    name: row.name,
    discordUrl: row.discord_url,
    description: row.description,
    memberCount: members.length,
    members,
    createdAt: row.created_at
  };
}

function mapEmployeeLearningAssignment(row: any): EmployeeLearningAssignment {
  const material = Array.isArray(row.learning_materials) ? row.learning_materials[0] : row.learning_materials;
  return {
    id: row.id,
    entityId: row.entity_id,
    dueDate: row.due_date,
    status: row.status,
    acknowledgedAt: row.acknowledged_at,
    completedAt: row.completed_at,
    material: {
      id: material.id,
      title: material.title,
      courseName: material.course_name,
      description: material.description,
      contentUrl: material.content_url,
      materialType: material.material_type,
      required: Boolean(material.required),
      estimatedMinutes: material.estimated_minutes == null ? null : Number(material.estimated_minutes),
      publishedAt: material.published_at
    }
  };
}

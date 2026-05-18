"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { FileText, ImageUp, Mail, Plus, Save, Send } from "lucide-react";
import { Badge, Button, Card, Input, Textarea } from "@vertechie/ui";
import { useBranding, useCurrentUser, useUpdateBranding } from "@/features/admin/hooks";
import { useCreateOfferTemplate, useLifecycleEmployees, useOfferTemplates, useSendOfferLetter } from "@/features/lifecycle/hooks";
import { createBrowserSupabaseClient } from "@/features/timesheets/supabase-browser";
import { federalComplianceText, stateComplianceText, stateName, US_STATES } from "@/lib/offer-compliance";

const REQUIRED_FIELDS = [
  "candidateName",
  "candidateEmail",
  "candidateAddress",
  "jobTitle",
  "department",
  "employmentType",
  "workLocation",
  "startDate",
  "compensation",
  "payFrequency",
  "reportsTo",
  "duties",
  "signerName",
  "signerTitle",
  "signerEmail",
  "companyHomeState",
  "companyEin",
  "eVerifyNumber"
];

const DEFAULT_TEMPLATE = `{{offerDate}}

{{companyName}}
{{companyAddress}}
EIN: {{companyEin}} | E-Verify: {{eVerifyNumber}}
{{companyPhone}} | {{signerEmail}} | {{companyWebsite}}

To: {{candidateName}}
{{candidateAddress}}

FORMAL OFFER OF EMPLOYMENT

Dear {{candidateFirstName}},

We are delighted to extend this formal offer of employment for the position of {{jobTitle}} at {{companyName}}. This letter sets forth the complete terms and conditions of your employment. Please read it carefully before signing.

EMPLOYER PROFILE

Legal Employer: {{companyName}}
Home State: {{companyHomeStateName}}
Principal Address: {{companyAddress}}
Federal EIN: {{companyEin}}
E-Verify Number: {{eVerifyNumber}}
HR Contact: {{signerEmail}}

OFFER SUMMARY

Position Title: {{jobTitle}}
Start Date: {{startDate}}
Employment Type: {{employmentType}}
Work Location: {{workLocation}}
Annual Salary / Compensation: {{compensation}}
Pay Frequency: {{payFrequency}}
Department: {{department}}
Reports To: {{reportsTo}}

POSITION & REPORTING STRUCTURE

You will join {{companyName}} as {{jobTitle}}, reporting directly to {{reportsTo}}. You are expected at all times to maintain strict confidentiality, exercise the highest degree of professionalism, and adhere to all company policies, procedures, and applicable law.

ROLES & RESPONSIBILITIES

{{duties}}

START DATE & WORK HOURS

Your expected start date is {{startDate}}. Standard working hours, minimum weekly hours, client schedules, remote work expectations, and any material schedule changes will be communicated in writing by the company or assigned supervisor.

COMPENSATION & BENEFITS

Your compensation will be {{compensation}}, payable {{payFrequency}} in accordance with the company's standard payroll schedule and applicable wage laws. Benefits, PTO, holidays, professional development, and other programs are subject to eligibility criteria and company policy at the time of benefit election.

PAYROLL, TAX, AND TIMEKEEPING

You are responsible for accurately recording all required work time, project time, leave, holidays, and client-approved timecards in the company workforce system. Payroll processing depends on accurate timekeeping, supervisor approval, and all required employment documentation. The company will withhold applicable federal, state, and local taxes and will issue applicable tax forms in accordance with law.

BACKGROUND CHECK, CLIENT REQUIREMENTS, AND DOCUMENTATION

This offer may be contingent on completion of onboarding documents, identity and work authorization review, background screening where applicable, client onboarding requirements, employment verification, and any role-specific compliance requirements. Failure to provide accurate information or required documents may delay or prevent employment.

EMPLOYMENT ELIGIBILITY & COMPLIANCE

All newly hired employees must complete Form I-9 on or before the first day of employment and provide valid work authorization documents. The employee must continue to maintain valid employment authorization throughout employment.

{{federalCompliance}}

{{stateCompliance}}

AT-WILL EMPLOYMENT

Your employment with {{companyName}} is at-will and may be terminated by either party at any time, with or without cause or advance notice, except where a written agreement or applicable law states otherwise.

CONFIDENTIALITY, CONDUCT, AND COMPANY POLICIES

You agree to protect company, client, employee, candidate, financial, technical, and operational information. You must comply with all company policies, information security requirements, anti-harassment standards, data protection requirements, remote work expectations, and workplace conduct rules.

INFORMATION SECURITY, CLIENT DATA, AND REMOTE WORK

You must use company systems, credentials, devices, client systems, and confidential data only for authorized business purposes. You must immediately report suspected security incidents, unauthorized access, lost devices, data exposure, client escalations, or policy violations. Remote work must be performed from a secure and professional environment unless otherwise approved.

SUPERVISION, PERFORMANCE, AND TRAINING

Your supervisor will provide work direction, review deliverables, approve applicable timesheets, assign learning materials, and document performance expectations. Continued employment requires professional communication, timely completion of assigned work, accurate reporting, and compliance with company and client standards.

ACCEPTANCE OF OFFER

To accept this offer, please sign and return a signed copy to {{signerEmail}}{{expirySentence}}. By signing, you acknowledge that you have read, understood, and agree to the terms in this offer letter.

Sincerely,

{{signerName}}
{{signerTitle}}
{{companyName}}
{{signerEmail}}
{{companyPhone}}
{{companyWebsite}}

ACKNOWLEDGMENT & ACCEPTANCE OF OFFER

I, {{candidateName}}, have read and fully understand all terms and conditions set forth in this Formal Offer of Employment from {{companyName}}. I accept this offer of employment and agree to be bound by the terms stated herein.

Employee Signature: ________________________________________________
Printed Legal Name: ________________________________________________
Date of Acceptance: ________________________________________________`;

type OfferForm = {
  employeeId: string;
  templateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateAddress: string;
  jobTitle: string;
  department: string;
  employmentType: string;
  workLocation: string;
  startDate: string;
  compensation: string;
  payFrequency: string;
  reportsTo: string;
  offerDate: string;
  expiryDate: string;
  signerName: string;
  signerTitle: string;
  signerEmail: string;
  companyName: string;
  companyAddress: string;
  companyWebsite: string;
  companyPhone: string;
  companyEin: string;
  eVerifyNumber: string;
  companyHomeState: string;
  companyLogoUrl: string;
  duties: string;
  emailSubject: string;
  emailMessage: string;
};

export function OfferTemplatesPanel() {
  const { data: me } = useCurrentUser();
  const entityId = me?.entity.id;
  const { data: branding } = useBranding(entityId);
  const { data: templates, isLoading } = useOfferTemplates(entityId);
  const { data: employees } = useLifecycleEmployees(entityId);
  const updateBranding = useUpdateBranding();
  const createTemplate = useCreateOfferTemplate();
  const sendOffer = useSendOfferLetter();
  const defaultCompany = me?.entity.brandName || me?.entity.name || "";
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [templateForm, setTemplateForm] = useState({
    name: "Formal Offer of Employment",
    description: "Company offer letter based on the uploaded VerTechie offer template.",
    templateBody: DEFAULT_TEMPLATE
  });
  const [offerForm, setOfferForm] = useState<OfferForm>({
    employeeId: "",
    templateId: "",
    candidateName: "",
    candidateEmail: "",
    candidateAddress: "",
    jobTitle: "",
    department: "",
    employmentType: "Full-Time (40 hrs/wk)",
    workLocation: "Remote",
    startDate: "",
    compensation: "",
    payFrequency: "Monthly",
    reportsTo: me?.fullName || "",
    offerDate: new Date().toISOString().slice(0, 10),
    expiryDate: "",
    signerName: me?.fullName || "",
    signerTitle: "HR Manager",
    signerEmail: me?.email || "",
    companyName: defaultCompany,
    companyAddress: "",
    companyWebsite: "",
    companyPhone: "",
    companyEin: "",
    eVerifyNumber: "",
    companyHomeState: "KS",
    companyLogoUrl: me?.entity.brandLogoUrl || "",
    duties: "",
    emailSubject: "",
    emailMessage: ""
  });
  const [draft, setDraft] = useState("");
  const selectedTemplate = useMemo(() => (templates ?? []).find((template) => template.id === offerForm.templateId) ?? templates?.[0], [offerForm.templateId, templates]);

  useEffect(() => {
    if (!me) return;
    const company = branding ?? me.entity;
    setOfferForm((current) => ({
      ...current,
      reportsTo: current.reportsTo || me.fullName,
      signerName: current.signerName || me.fullName,
      signerEmail: company.hrEmail || current.signerEmail || me.email,
      companyName: company.legalName || company.brandName || current.companyName || defaultCompany,
      companyAddress: company.companyAddress || current.companyAddress,
      companyWebsite: company.companyWebsite || current.companyWebsite,
      companyPhone: company.companyPhone || current.companyPhone,
      companyEin: company.companyEin || current.companyEin,
      eVerifyNumber: company.eVerifyNumber || current.eVerifyNumber,
      companyHomeState: company.companyHomeState || current.companyHomeState || "KS",
      companyLogoUrl: company.brandLogoUrl || current.companyLogoUrl || ""
    }));
  }, [branding, defaultCompany, me]);

  function setOffer<K extends keyof OfferForm>(key: K, value: OfferForm[K]) {
    setOfferForm((current) => ({ ...current, [key]: value }));
  }

  async function uploadLogo(file: File | null) {
    if (!file || !entityId) return;
    setUploadError(null);
    const allowed = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
    if (!allowed.has(file.type)) {
      setUploadError("Upload a PNG, JPG, WEBP, or SVG logo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Logo file must be 5 MB or smaller.");
      return;
    }
    setIsUploadingLogo(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${entityId}/logos/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
      setOffer("companyLogoUrl", data.publicUrl);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Logo upload failed.");
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function saveCompanyIdentity() {
    if (!entityId) return;
    await updateBranding.mutateAsync({
      entityId,
      brandName: branding?.brandName || me?.entity.brandName || offerForm.companyName,
      brandLogoUrl: offerForm.companyLogoUrl || null,
      primaryColor: branding?.primaryColor || me?.entity.primaryColor || "#0f766e",
      accentColor: branding?.accentColor || me?.entity.accentColor || "#f59e0b",
      legalName: offerForm.companyName || null,
      companyAddress: offerForm.companyAddress || null,
      companyEin: offerForm.companyEin || null,
      eVerifyNumber: offerForm.eVerifyNumber || null,
      companyHomeState: offerForm.companyHomeState,
      operatingStates: branding?.operatingStates?.length ? branding.operatingStates : [offerForm.companyHomeState],
      companyPhone: offerForm.companyPhone || null,
      companyWebsite: offerForm.companyWebsite || null,
      hrEmail: offerForm.signerEmail || null
    });
  }

  async function submitTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entityId) return;
    await createTemplate.mutateAsync({
      entityId,
      name: templateForm.name,
      description: templateForm.description || null,
      templateBody: templateForm.templateBody,
      requiredFields: REQUIRED_FIELDS,
      isDefault: !(templates ?? []).length
    });
  }

  function selectEmployee(employeeId: string) {
    const employee = (employees ?? []).find((item) => item.id === employeeId);
    setOfferForm((current) => ({
      ...current,
      employeeId,
      candidateName: employee?.fullName ?? current.candidateName,
      candidateEmail: employee?.email ?? current.candidateEmail,
      jobTitle: employee?.title ?? current.jobTitle,
      department: employee?.department ?? current.department,
      reportsTo: employee?.supervisorName ?? current.reportsTo,
      companyName: defaultCompany || current.companyName
    }));
  }

  function generateDraft() {
    const body = renderTemplate(selectedTemplate?.templateBody || DEFAULT_TEMPLATE, offerForm);
    setDraft(body);
    if (!offerForm.emailSubject) setOffer("emailSubject", `Formal offer from ${offerForm.companyName || defaultCompany}`);
    if (!offerForm.emailMessage) {
      setOffer("emailMessage", `Dear ${firstName(offerForm.candidateName)},\n\nPlease find attached your formal offer letter from ${offerForm.companyName || defaultCompany}. Review the details and return the signed copy if everything looks correct.`);
    }
  }

  async function sendDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entityId || !selectedTemplate || !draft) return;
    await sendOffer.mutateAsync({
      entityId,
      templateId: selectedTemplate.id,
      employeeId: offerForm.employeeId || null,
      candidateName: offerForm.candidateName,
      candidateEmail: offerForm.candidateEmail,
      candidateAddress: offerForm.candidateAddress || null,
      jobTitle: offerForm.jobTitle,
      department: offerForm.department || null,
      employmentType: offerForm.employmentType,
      workLocation: offerForm.workLocation,
      startDate: offerForm.startDate,
      compensation: offerForm.compensation,
      payFrequency: offerForm.payFrequency,
      reportsTo: offerForm.reportsTo,
      offerDate: offerForm.offerDate,
      expiryDate: offerForm.expiryDate || null,
      signerName: offerForm.signerName,
      signerTitle: offerForm.signerTitle,
      signerEmail: offerForm.signerEmail,
      companyName: offerForm.companyName,
      companyAddress: offerForm.companyAddress || null,
      companyWebsite: offerForm.companyWebsite || null,
      companyPhone: offerForm.companyPhone || null,
      companyEin: offerForm.companyEin || null,
      eVerifyNumber: offerForm.eVerifyNumber || null,
      companyHomeState: offerForm.companyHomeState,
      companyLogoUrl: offerForm.companyLogoUrl || null,
      duties: offerForm.duties.split("\n").map((line) => line.trim()).filter(Boolean),
      draftBody: draft,
      emailSubject: offerForm.emailSubject,
      emailMessage: offerForm.emailMessage
    });
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Offer Letters</h1>
        <p className="text-sm text-muted-foreground">Company-managed offer templates, editable HR drafts, and email delivery with attached DOCX offers.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="h-fit p-5">
          <div className="flex items-center gap-2"><FileText className="size-5 text-primary" /><h2 className="font-semibold">Company template setup</h2></div>
          <p className="mt-2 text-sm text-muted-foreground">Save the provided offer letter structure once. Company details and candidate details are merged each time HR generates an offer.</p>
          <form className="mt-4 grid gap-3" onSubmit={submitTemplate}>
            <Input required placeholder="Template name" value={templateForm.name} onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))} />
            <Input placeholder="Description" value={templateForm.description} onChange={(event) => setTemplateForm((current) => ({ ...current, description: event.target.value }))} />
            <Textarea className="min-h-[360px]" required value={templateForm.templateBody} onChange={(event) => setTemplateForm((current) => ({ ...current, templateBody: event.target.value }))} />
            {createTemplate.error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{createTemplate.error.message}</div>}
            <Button disabled={createTemplate.isPending || !entityId} type="submit"><Plus className="size-4" />Save company offer template</Button>
          </form>
        </Card>

        <div className="grid gap-5">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Saved templates</h2>
                <p className="text-sm text-muted-foreground">HR chooses one template, fills the required fields, previews, edits, and sends.</p>
              </div>
              <Badge>{templates?.length ?? 0} templates</Badge>
            </div>
            <div className="mt-4 grid gap-3">
              {(templates ?? []).map((template) => (
                <button className={`rounded-lg border p-4 text-left transition hover:border-primary ${selectedTemplate?.id === template.id ? "border-primary bg-primary/5" : "border-border bg-background"}`} key={template.id} type="button" onClick={() => setOffer("templateId", template.id)}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{template.name}</div>
                    {template.isDefault && <Badge>Default</Badge>}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{template.description || "No description"}</div>
                </button>
              ))}
              {!isLoading && !templates?.length && <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Save the company template to enable offer generation.</div>}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2"><Mail className="size-5 text-primary" /><h2 className="font-semibold">Generate and send offer</h2></div>
            <form className="mt-4 grid gap-5" onSubmit={sendDraft}>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium">Employee or candidate
                  <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={offerForm.employeeId} onChange={(event) => selectEmployee(event.target.value)}>
                    <option value="">External candidate / manual entry</option>
                    {(employees ?? []).map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName} - {employee.uniqueEmployeeCode || employee.employeeNumber}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-medium">Template
                  <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={selectedTemplate?.id ?? ""} onChange={(event) => setOffer("templateId", event.target.value)} required>
                    <option value="">Select template</option>
                    {(templates ?? []).map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                  </select>
                </label>
                <Field label="Candidate legal name" value={offerForm.candidateName} onChange={(value) => setOffer("candidateName", value)} />
                <Field label="Candidate email" type="email" value={offerForm.candidateEmail} onChange={(value) => setOffer("candidateEmail", value)} />
                <Field label="Job title" value={offerForm.jobTitle} onChange={(value) => setOffer("jobTitle", value)} />
                <Field label="Department" value={offerForm.department} onChange={(value) => setOffer("department", value)} />
                <Field label="Start date" type="date" value={offerForm.startDate} onChange={(value) => setOffer("startDate", value)} />
                <Field label="Offer date" type="date" value={offerForm.offerDate} onChange={(value) => setOffer("offerDate", value)} />
                <Field label="Compensation" placeholder="$80,000 per year" value={offerForm.compensation} onChange={(value) => setOffer("compensation", value)} />
                <Field label="Pay frequency" value={offerForm.payFrequency} onChange={(value) => setOffer("payFrequency", value)} />
                <Field label="Employment type" value={offerForm.employmentType} onChange={(value) => setOffer("employmentType", value)} />
                <Field label="Work location" value={offerForm.workLocation} onChange={(value) => setOffer("workLocation", value)} />
                <Field label="Reports to" value={offerForm.reportsTo} onChange={(value) => setOffer("reportsTo", value)} />
                <Field label="Offer expiry date" type="date" required={false} value={offerForm.expiryDate} onChange={(value) => setOffer("expiryDate", value)} />
                <Field label="Company name" value={offerForm.companyName} onChange={(value) => setOffer("companyName", value)} />
                <label className="grid gap-1 text-sm font-medium">Company home state
                  <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={offerForm.companyHomeState} onChange={(event) => setOffer("companyHomeState", event.target.value)}>
                    {US_STATES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                  </select>
                </label>
                <Field label="Company EIN" required={false} value={offerForm.companyEin} onChange={(value) => setOffer("companyEin", value)} />
                <Field label="E-Verify number" required={false} value={offerForm.eVerifyNumber} onChange={(value) => setOffer("eVerifyNumber", value)} />
                <Field label="Signer name" value={offerForm.signerName} onChange={(value) => setOffer("signerName", value)} />
                <Field label="Signer title" value={offerForm.signerTitle} onChange={(value) => setOffer("signerTitle", value)} />
                <Field label="Signer email" type="email" value={offerForm.signerEmail} onChange={(value) => setOffer("signerEmail", value)} />
                <Field label="Company phone" required={false} value={offerForm.companyPhone} onChange={(value) => setOffer("companyPhone", value)} />
                <Field label="Company website" required={false} value={offerForm.companyWebsite} onChange={(value) => setOffer("companyWebsite", value)} />
                <Field label="Logo URL for watermark" required={false} value={offerForm.companyLogoUrl} onChange={(value) => setOffer("companyLogoUrl", value)} />
              </div>
              <div className="grid gap-3 rounded-lg border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">Stored company offer identity</div>
                    <p className="text-sm text-muted-foreground">Save this once. Future offer letters automatically use this logo, legal identity, address, EIN, E-Verify, home state, and HR contact.</p>
                  </div>
                  {offerForm.companyLogoUrl ? (
                    <Image alt={`${offerForm.companyName} logo`} className="size-16 rounded-md border border-border bg-white object-contain p-1" height={64} src={offerForm.companyLogoUrl} width={64} unoptimized />
                  ) : (
                    <div className="grid size-16 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">{offerForm.companyName.slice(0, 2).toUpperCase() || "CO"}</div>
                  )}
                </div>
                <div className="grid gap-2 rounded-lg border border-dashed border-border bg-white p-3">
                  <label className="text-sm font-medium">Upload company logo file</label>
                  <input className="text-sm" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => uploadLogo(event.target.files?.[0] ?? null)} />
                  <div className="text-xs text-muted-foreground">The uploaded logo is saved in Supabase Storage and used in the offer header and watermark after you save the company identity.</div>
                  {isUploadingLogo && <div className="text-sm text-primary">Uploading logo...</div>}
                  {uploadError && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{uploadError}</div>}
                </div>
                {updateBranding.error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{updateBranding.error.message}</div>}
                {updateBranding.data && <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">Company offer identity saved. Future offers will use these stored details.</div>}
                <Button disabled={updateBranding.isPending || !entityId} type="button" onClick={saveCompanyIdentity}><Save className="size-4" />Save company identity</Button>
              </div>
              <label className="grid gap-1 text-sm font-medium">Company address
                <Textarea className="min-h-[88px]" value={offerForm.companyAddress} onChange={(event) => setOffer("companyAddress", event.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-medium">Candidate address
                <Textarea className="min-h-[88px]" value={offerForm.candidateAddress} onChange={(event) => setOffer("candidateAddress", event.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-medium">Role-specific duties
                <Textarea className="min-h-[132px]" placeholder="One duty per line" required value={offerForm.duties} onChange={(event) => setOffer("duties", event.target.value)} />
              </label>
              <Button className="bg-background text-foreground hover:bg-muted" disabled={!selectedTemplate || !offerForm.candidateName || !offerForm.startDate} type="button" onClick={generateDraft}>Generate editable draft</Button>

              {draft && (
                <div className="grid gap-4 rounded-lg border border-border bg-background p-4">
                  <div>
                    <h3 className="font-semibold">Editable offer draft</h3>
                    <p className="text-sm text-muted-foreground">HR can make final changes here before sending the DOCX attachment.</p>
                  </div>
                  <Textarea className="min-h-[520px] font-mono text-sm leading-6" value={draft} onChange={(event) => setDraft(event.target.value)} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Email subject" value={offerForm.emailSubject} onChange={(value) => setOffer("emailSubject", value)} />
                    <label className="grid gap-1 text-sm font-medium md:col-span-2">Email message
                      <Textarea className="min-h-[110px]" value={offerForm.emailMessage} onChange={(event) => setOffer("emailMessage", event.target.value)} />
                    </label>
                  </div>
                  {sendOffer.error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{sendOffer.error.message}</div>}
                  {sendOffer.data && <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">Offer sent to {sendOffer.data.candidateEmail} and saved to private offer-letter storage.</div>}
                  <Button disabled={sendOffer.isPending} type="submit"><Send className="size-4" />Send offer with DOCX attachment</Button>
                </div>
              )}
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field(props: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="grid gap-1 text-sm font-medium">{props.label}
      <Input required={props.required ?? true} type={props.type ?? "text"} placeholder={props.placeholder} value={props.value} onChange={(event) => props.onChange(event.target.value)} />
    </label>
  );
}

function renderTemplate(template: string, form: OfferForm) {
  const replacements: Record<string, string> = {
    offerDate: dateLabel(form.offerDate),
    candidateName: form.candidateName,
    candidateFirstName: firstName(form.candidateName),
    candidateAddress: form.candidateAddress,
    jobTitle: form.jobTitle,
    startDate: dateLabel(form.startDate),
    employmentType: form.employmentType,
    workLocation: form.workLocation,
    compensation: form.compensation,
    payFrequency: form.payFrequency,
    department: form.department || "Not specified",
    reportsTo: form.reportsTo,
    companyName: form.companyName,
    companyAddress: form.companyAddress,
    companyWebsite: form.companyWebsite,
    companyPhone: form.companyPhone,
    companyEin: form.companyEin || "To be confirmed",
    eVerifyNumber: form.eVerifyNumber || "To be confirmed",
    companyHomeStateName: stateName(form.companyHomeState),
    federalCompliance: federalComplianceText(form.companyName, form.eVerifyNumber),
    stateCompliance: stateComplianceText(form.companyHomeState, form.companyName),
    signerName: form.signerName,
    signerTitle: form.signerTitle,
    signerEmail: form.signerEmail,
    expirySentence: form.expiryDate ? ` by ${dateLabel(form.expiryDate)}` : "",
    duties: form.duties
      .split("\n")
      .map((duty, index) => duty.trim() ? `${index + 1}. ${duty.trim()}` : "")
      .filter(Boolean)
      .join("\n")
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => replacements[key] ?? "");
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "there";
}

function dateLabel(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).format(date);
}

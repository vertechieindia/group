"use client";

import { useState } from "react";
import { ClipboardList, MailPlus, Plus, Send, Trash2 } from "lucide-react";
import type { OnboardingField } from "@vertechie/types";
import { Badge, Button, Card, Input, Select, Textarea } from "@vertechie/ui";
import { useCurrentUser } from "@/features/admin/hooks";
import { useCreateOnboardingFormTemplate, useCreateOnboardingInvite, useLifecycleEmployees, useOnboardingFormTemplates, useOnboardingInvites } from "@/features/lifecycle/hooks";

const defaultFields: OnboardingField[] = [
  { id: "first_name", label: "First Name", type: "text", required: true, enabled: true, options: [], helpText: null },
  { id: "last_name", label: "Last Name", type: "text", required: true, enabled: true, options: [], helpText: null },
  { id: "email_id", label: "Email ID", type: "email", required: true, enabled: true, options: [], helpText: null },
  { id: "phone_number", label: "Phone Number", type: "phone", required: true, enabled: true, options: [], helpText: null },
  { id: "work_authorization", label: "Work Authorization", type: "select", required: true, enabled: true, options: ["US Citizen", "Green Card", "GC EAD", "H1B", "H4 EAD", "OPT EAD", "STEM OPT", "CPT", "L1", "L2", "TN", "Other"], helpText: null },
  { id: "work_authorization_start_date", label: "Work Authorization start date", type: "date", required: true, enabled: true, options: [], helpText: null },
  { id: "work_authorization_expiry_date", label: "Work Authorization Expiry Date", type: "date", required: true, enabled: true, options: [], helpText: null },
  { id: "date_of_first_entry_usa", label: "Date of First Entry to USA", type: "date", required: true, enabled: true, options: [], helpText: null },
  { id: "total_years_experience", label: "Total Years of Experience", type: "number", required: true, enabled: true, options: [], helpText: null },
  { id: "technology", label: "Technology", type: "text", required: true, enabled: true, options: [], helpText: null },
  { id: "full_address", label: "Full Address", type: "textarea", required: true, enabled: true, options: [], helpText: null },
  { id: "ssn_last_4", label: "Last 4 digits of SSN", type: "text", required: true, enabled: true, options: [], helpText: null },
  { id: "dob", label: "DOB MM/DD/YYYY", type: "date", required: true, enabled: true, options: [], helpText: null },
  { id: "professional_photo", label: "Upload Latest professional Photo", type: "file", required: true, enabled: true, options: [], helpText: "Photo file uploaded to private onboarding storage." },
  { id: "ead_card_scan", label: "Upload a very clear PDF scan of both the front and back of your EAD card.", type: "file", required: true, enabled: true, options: [], helpText: "Required when applicable based on work authorization." },
  { id: "drivers_license_scan", label: "Upload Driver's License (scan a very clear PDF of both the front and back)", type: "file", required: true, enabled: true, options: [], helpText: null }
];

export function OnboardingPanel() {
  const { data: me } = useCurrentUser();
  const entityId = me?.entity.id;
  const { data: employees } = useLifecycleEmployees(entityId);
  const { data: invites, isLoading } = useOnboardingInvites(entityId);
  const { data: templates } = useOnboardingFormTemplates(entityId);
  const createInvite = useCreateOnboardingInvite();
  const createTemplate = useCreateOnboardingFormTemplate();
  const [form, setForm] = useState({ email: "", employeeId: "" });
  const activeTemplate = templates?.find((template) => template.isActive) ?? templates?.[0];
  const [templateName, setTemplateName] = useState("Standard US Employee Onboarding");
  const [templateDescription, setTemplateDescription] = useState("Collect identity, contact, work authorization, experience, address, SSN last 4, DOB, photo, EAD, and driver license documents.");
  const [fields, setFields] = useState<OnboardingField[]>(defaultFields);
  const enabledFields = fields.filter((field) => field.enabled);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entityId) return;
    await createInvite.mutateAsync({ entityId, email: form.email, employeeId: form.employeeId || null, candidateId: null });
    setForm({ email: "", employeeId: "" });
  }

  async function saveTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entityId) return;
    await createTemplate.mutateAsync({
      entityId,
      name: templateName,
      description: templateDescription || null,
      fields: enabledFields
    });
  }

  function updateField(id: string, patch: Partial<OnboardingField>) {
    setFields((current) => current.map((field) => field.id === id ? { ...field, ...patch } : field));
  }

  function addCustomField() {
    const id = `custom_${crypto.randomUUID().slice(0, 8)}`;
    setFields((current) => [...current, { id, label: "Custom question", type: "text", required: false, enabled: true, options: [], helpText: null }]);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="grid gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Onboarding</h1>
          <p className="text-sm text-muted-foreground">Send onboarding invitations and track employee onboarding completion without exposing private documents.</p>
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-3">Invitee</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Expires</th><th className="px-4 py-3">Created</th></tr>
            </thead>
            <tbody>
              {(invites ?? []).map((invite) => (
                <tr className="border-t border-border" key={invite.id}>
                  <td className="px-4 py-3 font-medium">{invite.email}</td>
                  <td className="px-4 py-3"><Badge>{invite.status}</Badge></td>
                  <td className="px-4 py-3">{invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : "No expiry"}</td>
                  <td className="px-4 py-3">{new Date(invite.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {!isLoading && !invites?.length && <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={4}>No onboarding invitations have been sent yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><ClipboardList className="size-5 text-primary" /><h2 className="font-semibold">Onboarding form template</h2></div>
              <p className="mt-1 text-sm text-muted-foreground">Choose exactly what details employees must submit before HR review.</p>
            </div>
            {activeTemplate && <Badge>Active v{activeTemplate.version}: {activeTemplate.name}</Badge>}
          </div>
          <form className="mt-4 grid gap-4" onSubmit={saveTemplate}>
            <div className="grid gap-3 md:grid-cols-2">
              <Input required placeholder="Template name" value={templateName} onChange={(event) => setTemplateName(event.target.value)} />
              <Input placeholder={`${enabledFields.length} enabled fields`} readOnly value={`${enabledFields.length} enabled fields`} />
            </div>
            <Textarea className="min-h-20" placeholder="Template description" value={templateDescription} onChange={(event) => setTemplateDescription(event.target.value)} />
            <div className="grid gap-2">
              {fields.map((field) => (
                <div className={`grid gap-3 rounded-md border p-3 ${field.enabled ? "border-border bg-white" : "border-border bg-muted/50 opacity-70"}`} key={field.id}>
                  <div className="grid gap-3 lg:grid-cols-[1fr_150px_110px_110px_40px]">
                    <Input value={field.label} onChange={(event) => updateField(field.id, { label: event.target.value })} />
                    <Select value={field.type} onChange={(event) => updateField(field.id, { type: event.target.value as OnboardingField["type"] })}>
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="date">Date</option>
                      <option value="number">Number</option>
                      <option value="textarea">Long text</option>
                      <option value="select">Dropdown</option>
                      <option value="file">File upload</option>
                    </Select>
                    <label className="flex items-center gap-2 text-sm"><input checked={field.required} type="checkbox" onChange={(event) => updateField(field.id, { required: event.target.checked })} />Required</label>
                    <label className="flex items-center gap-2 text-sm"><input checked={field.enabled} type="checkbox" onChange={(event) => updateField(field.id, { enabled: event.target.checked })} />Collect</label>
                    <button className="grid size-10 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted" type="button" onClick={() => updateField(field.id, { enabled: false })} aria-label={`Remove ${field.label}`}><Trash2 className="size-4" /></button>
                  </div>
                  {field.type === "select" && (
                    <Input placeholder="Dropdown options, comma separated" value={field.options.join(", ")} onChange={(event) => updateField(field.id, { options: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} />
                  )}
                  <Input placeholder="Optional helper text" value={field.helpText ?? ""} onChange={(event) => updateField(field.id, { helpText: event.target.value || null })} />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-white text-foreground ring-1 ring-border hover:bg-muted" type="button" onClick={addCustomField}><Plus className="size-4" />Add custom field</Button>
              <Button disabled={createTemplate.isPending || !enabledFields.length} type="submit"><ClipboardList className="size-4" />Save active template</Button>
            </div>
            {createTemplate.error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{createTemplate.error.message}</div>}
          </form>
        </Card>
      </div>
      <Card className="h-fit p-5">
        <div className="flex items-center gap-2"><MailPlus className="size-5 text-primary" /><h2 className="font-semibold">Send invitation</h2></div>
        <form className="mt-4 grid gap-3" onSubmit={submit}>
          <Input required inputMode="email" placeholder="Employee email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          <Select value={form.employeeId} onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))}>
            <option value="">Link later</option>
            {(employees ?? []).map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName}</option>)}
          </Select>
          <div className="rounded-md border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
            Invites create an auditable onboarding record. Work authorization documents are stored in the private onboarding bucket.
          </div>
          {createInvite.error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{createInvite.error.message}</div>}
          <Button disabled={createInvite.isPending} type="submit"><Send className="size-4" />Send onboarding invite</Button>
        </form>
      </Card>
    </div>
  );
}

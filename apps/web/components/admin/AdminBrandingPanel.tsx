"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ImageUp, Palette, Save } from "lucide-react";
import { Button, Card, Input } from "@vertechie/ui";
import { useBranding, useCurrentUser, useUpdateBranding } from "@/features/admin/hooks";
import { createBrowserSupabaseClient } from "@/features/timesheets/supabase-browser";
import { stateName, US_STATES } from "@/lib/offer-compliance";

type StateRegistration = {
  state: string;
  foreignControlNumber: string | null;
};

export function AdminBrandingPanel({ setupMode = false }: { setupMode?: boolean }) {
  const { data: me } = useCurrentUser();
  const entityId = me?.entity.id;
  const { data } = useBranding(entityId);
  const updateBranding = useUpdateBranding();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({
    brandName: "",
    brandLogoUrl: "",
    primaryColor: "#0f766e",
    accentColor: "#f59e0b",
    legalName: "",
    companyAddress: "",
    companyEin: "",
    eVerifyNumber: "",
    companyHomeState: "KS",
    homeStateBusinessId: "",
    operatingStates: ["KS"],
    operatingStateRegistrations: [] as StateRegistration[],
    companyPhone: "",
    companyWebsite: "",
    hrEmail: ""
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      brandName: data.brandName || data.name,
      brandLogoUrl: data.brandLogoUrl || "",
      primaryColor: data.primaryColor,
      accentColor: data.accentColor,
      legalName: data.legalName || data.brandName || data.name,
      companyAddress: data.companyAddress || "",
      companyEin: data.companyEin || "",
      eVerifyNumber: data.eVerifyNumber || "",
      companyHomeState: data.companyHomeState || "KS",
      homeStateBusinessId: data.homeStateBusinessId || "",
      operatingStates: data.operatingStates?.length ? data.operatingStates : data.companyHomeState ? [data.companyHomeState] : [],
      operatingStateRegistrations: data.operatingStateRegistrations || [],
      companyPhone: data.companyPhone || "",
      companyWebsite: data.companyWebsite || "",
      hrEmail: data.hrEmail || ""
    });
  }, [data]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entityId) return;
    const operatingStates = Array.from(new Set([form.companyHomeState, ...form.operatingStates])).filter(Boolean);
    await updateBranding.mutateAsync({
      entityId,
      brandName: form.brandName,
      brandLogoUrl: form.brandLogoUrl || null,
      primaryColor: form.primaryColor,
      accentColor: form.accentColor,
      legalName: form.legalName || null,
      companyAddress: form.companyAddress || null,
      companyEin: form.companyEin || null,
      eVerifyNumber: form.eVerifyNumber || null,
      companyHomeState: form.companyHomeState,
      homeStateBusinessId: form.homeStateBusinessId || null,
      operatingStates,
      operatingStateRegistrations: operatingStates
        .filter((state) => state !== form.companyHomeState)
        .map((state) => ({
          state,
          foreignControlNumber: form.operatingStateRegistrations.find((registration) => registration.state === state)?.foreignControlNumber || null
        })),
      companyPhone: form.companyPhone || null,
      companyWebsite: form.companyWebsite || null,
      hrEmail: form.hrEmail || null
    });
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

    setIsUploading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${entityId}/logos/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("brand-assets").upload(path, file, {
        upsert: false,
        contentType: file.type
      });
      if (error) throw error;
      const { data: publicUrl } = supabase.storage.from("brand-assets").getPublicUrl(path);
      setForm((current) => ({ ...current, brandLogoUrl: publicUrl.publicUrl }));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Logo upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  const selectedOperatingStates = Array.from(new Set([form.companyHomeState, ...form.operatingStates])).filter(Boolean);
  const foreignOperatingStates = selectedOperatingStates.filter((state) => state !== form.companyHomeState);

  function updateForeignControlNumber(state: string, value: string) {
    setForm((current) => {
      const existing = current.operatingStateRegistrations.filter((registration) => registration.state !== state);
      return {
        ...current,
        operatingStateRegistrations: [...existing, { state, foreignControlNumber: value }]
      };
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <Card className="p-5">
        <div className="flex items-center gap-2"><Palette className="size-5 text-primary" /><h1 className="text-2xl font-semibold">{setupMode ? "Company Profile Setup" : "Company Branding"}</h1></div>
        <p className="mt-2 text-sm text-muted-foreground">
          {setupMode
            ? "Complete the company identity, compliance, contact, logo, and brand profile before inviting HR, accounts, supervisors, and employees."
            : "Company admins can brand the workspace their users see after login."}
        </p>
        <form className="mt-5 grid gap-4" onSubmit={submit}>
          <label className="text-sm font-medium">Brand name<Input required value={form.brandName} onChange={(event) => setForm((current) => ({ ...current, brandName: event.target.value }))} /></label>
          <label className="text-sm font-medium">Legal company name<Input required={setupMode} value={form.legalName} onChange={(event) => setForm((current) => ({ ...current, legalName: event.target.value }))} placeholder="Company legal name for offer letters" /></label>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Logo upload</label>
            <div className="grid gap-3 rounded-lg border border-dashed border-border bg-background/70 p-3">
              <input
                className="text-sm"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(event) => uploadLogo(event.target.files?.[0] ?? null)}
              />
              <div className="text-xs text-muted-foreground">PNG, JPG, WEBP, or SVG. Max 5 MB. Upload saves to Supabase Storage, then you can save branding.</div>
              {uploadError && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{uploadError}</div>}
              {isUploading && <div className="text-sm text-primary">Uploading logo...</div>}
            </div>
          </div>
          <label className="text-sm font-medium">Logo URL<Input value={form.brandLogoUrl} onChange={(event) => setForm((current) => ({ ...current, brandLogoUrl: event.target.value }))} placeholder="https://..." /></label>
          <label className="text-sm font-medium">Company address<textarea required={setupMode} className="mt-1 min-h-[96px] w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.companyAddress} onChange={(event) => setForm((current) => ({ ...current, companyAddress: event.target.value }))} placeholder="Street, city, state, ZIP" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Company EIN<Input required={setupMode} value={form.companyEin} onChange={(event) => setForm((current) => ({ ...current, companyEin: event.target.value }))} placeholder="XX-XXXXXXX" /></label>
            <label className="text-sm font-medium">E-Verify number<Input value={form.eVerifyNumber} onChange={(event) => setForm((current) => ({ ...current, eVerifyNumber: event.target.value }))} /></label>
            <label className="text-sm font-medium">Home state
              <select className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.companyHomeState} onChange={(event) => setForm((current) => ({ ...current, companyHomeState: event.target.value, operatingStates: Array.from(new Set([...current.operatingStates, event.target.value])) }))}>
                {US_STATES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Home state Business ID<Input value={form.homeStateBusinessId} onChange={(event) => setForm((current) => ({ ...current, homeStateBusinessId: event.target.value }))} placeholder="State-issued business ID" /></label>
            <label className="text-sm font-medium">Company phone<Input required={setupMode} value={form.companyPhone} onChange={(event) => setForm((current) => ({ ...current, companyPhone: event.target.value }))} /></label>
            <label className="text-sm font-medium">Company website<Input required={setupMode} value={form.companyWebsite} onChange={(event) => setForm((current) => ({ ...current, companyWebsite: event.target.value }))} placeholder="https://company.com" /></label>
            <label className="text-sm font-medium">HR email<Input required={setupMode} inputMode="email" value={form.hrEmail} onChange={(event) => setForm((current) => ({ ...current, hrEmail: event.target.value }))} placeholder="hr@company.com" /></label>
          </div>
          <div className="grid gap-2 rounded-lg border border-border bg-background/70 p-3">
            <div>
              <div className="text-sm font-medium">Operating states</div>
              <div className="text-xs text-muted-foreground">Add every state where this company may hire, run payroll, or manage employees.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedOperatingStates.map((code) => (
                <span key={code} className="rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium">
                  {stateName(code)}
                </span>
              ))}
            </div>
            <div className="grid max-h-48 gap-2 overflow-auto rounded-md border border-border bg-white p-3 sm:grid-cols-2">
              {US_STATES.map(([code, name]) => {
                const checked = form.companyHomeState === code || form.operatingStates.includes(code);
                return (
                  <label key={code} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={form.companyHomeState === code}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        operatingStates: event.target.checked
                          ? Array.from(new Set([...current.operatingStates, code]))
                          : current.operatingStates.filter((state) => state !== code)
                      }))}
                    />
                    {name}
                  </label>
                );
              })}
            </div>
            <div className="grid gap-3 rounded-md border border-border bg-white p-3">
              <div>
                <div className="text-sm font-medium">State registration numbers</div>
                <div className="text-xs text-muted-foreground">
                  Home state uses the Business ID above. Add the Foreign Limited Liability Company control number for every other operating state where the company is registered.
                </div>
              </div>
              {foreignOperatingStates.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {foreignOperatingStates.map((state) => (
                    <label key={state} className="text-sm font-medium">
                      {stateName(state)} foreign LLC control number
                      <Input
                        value={form.operatingStateRegistrations.find((registration) => registration.state === state)?.foreignControlNumber || ""}
                        onChange={(event) => updateForeignControlNumber(state, event.target.value)}
                        placeholder="Control number"
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <div className="rounded-md bg-background px-3 py-2 text-sm text-muted-foreground">Select another operating state to add foreign LLC control numbers.</div>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorCodeField
              label="Primary color"
              value={form.primaryColor}
              onChange={(value) => setForm((current) => ({ ...current, primaryColor: value }))}
            />
            <ColorCodeField
              label="Accent color"
              value={form.accentColor}
              onChange={(value) => setForm((current) => ({ ...current, accentColor: value }))}
            />
          </div>
          <div className="rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
            Workspace URL is assigned automatically from the company name: /{slugify(form.brandName)}/timesheets
          </div>
          {updateBranding.error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{updateBranding.error.message}</div>}
          <Button disabled={updateBranding.isPending} type="submit"><Save className="size-4" />{setupMode ? "Complete company setup" : "Save branding"}</Button>
        </form>
      </Card>
      <Card className="h-fit p-5">
        <div className="text-sm font-semibold">Preview</div>
        <div className="mt-4 rounded-lg border border-border p-4" style={{ borderColor: form.primaryColor }}>
          <div className="flex items-center gap-3">
            {form.brandLogoUrl ? (
              <Image alt={`${form.brandName} logo`} className="size-12 rounded-md object-contain" height={48} src={form.brandLogoUrl} width={48} unoptimized />
            ) : (
              <div className="grid size-12 place-items-center rounded-md text-sm font-semibold text-white" style={{ backgroundColor: form.primaryColor }}>
                {form.brandName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-semibold">{form.brandName}</div>
              <div className="text-sm text-muted-foreground">/{slugify(form.brandName)}/timesheets</div>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full" style={{ backgroundColor: form.accentColor }} />
          {form.brandLogoUrl && <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ImageUp className="size-4 text-primary" /> Uploaded logo will appear in the user workspace after saving.</div>}
        </div>
      </Card>
    </div>
  );
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "company";
}

function ColorCodeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const normalized = isHexColor(value) ? value : "#000000";
  return (
    <label className="text-sm font-medium">
      {label}
      <div className="mt-1 grid grid-cols-[48px_1fr] gap-2">
        <Input
          aria-label={`${label} picker`}
          className="h-10 cursor-pointer p-1"
          type="color"
          value={normalized}
          onChange={(event) => onChange(event.target.value)}
        />
        <Input
          aria-label={`${label} hex code`}
          value={value}
          onChange={(event) => onChange(formatHexInput(event.target.value))}
          placeholder="#0f766e"
          pattern="^#[0-9a-fA-F]{6}$"
          title="Enter a 6-digit hex color, for example #0f766e"
        />
      </div>
    </label>
  );
}

function formatHexInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "#";
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return `#${withHash.slice(1).replace(/[^0-9a-fA-F]/g, "").slice(0, 6)}`;
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

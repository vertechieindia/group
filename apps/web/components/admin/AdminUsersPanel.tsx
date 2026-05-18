"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, PauseCircle, PlayCircle, Plus, Trash2, UserRoundPlus } from "lucide-react";
import { Button, Card, Input, SecondaryButton, Select } from "@vertechie/ui";
import { roles, type AppRole } from "@vertechie/types";
import { useAdminUsers, useCompanyRoles, useCreateAdminUser, useCurrentUser, useDeleteCompanyAdmin, useHoldCompanyServices, useResumeCompanyServices, useUpdateUserPassword } from "@/features/admin/hooks";

const roleLabels: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Group Admin",
  company_admin: "Company Admin",
  hr: "HR Manager",
  accounts_manager: "Accounts Manager",
  recruiter: "Recruiter",
  marketing: "Marketing",
  team_lead: "Supervisor / Team Lead",
  operations: "Operations",
  viewer: "Viewer",
  employee: "Employee",
  candidate: "Candidate"
};

const builtInCompanyRoleSlugs = new Set([
  "accounts-manager",
  "admin",
  "candidate",
  "company-admin",
  "employee",
  "hr",
  "hr-manager",
  "marketing",
  "operations",
  "operations-coordinator",
  "recruiter",
  "super-admin",
  "supervisor",
  "team-lead",
  "viewer"
]);

export function AdminUsersPanel() {
  const { data: me } = useCurrentUser();
  const isSuperAdmin = me?.role === "super_admin";
  const effectiveEntityId = me?.entity.id;
  const { data: users, isLoading } = useAdminUsers(isSuperAdmin ? undefined : effectiveEntityId, Boolean(me));
  const { data: companyRoles } = useCompanyRoles(effectiveEntityId);
  const createUser = useCreateAdminUser();
  const updatePassword = useUpdateUserPassword(effectiveEntityId);
  const holdServices = useHoldCompanyServices();
  const resumeServices = useResumeCompanyServices();
  const deleteCompanyAdmin = useDeleteCompanyAdmin();

  const availableRoles = useMemo(() => {
    if (isSuperAdmin) return roles.filter((role) => role === "company_admin");
    if (me?.role === "company_admin") return roles.filter((role) => ["hr", "accounts_manager", "team_lead", "employee", "candidate", "recruiter"].includes(role));
    if (me?.role === "admin") return roles.filter((role) => role !== "super_admin");
    return [];
  }, [isSuperAdmin, me?.role]);
  const customCompanyRoles = useMemo(
    () => (companyRoles ?? []).filter((role) => !role.isSystem && !builtInCompanyRoleSlugs.has(role.slug)),
    [companyRoles]
  );

  const [form, setForm] = useState({
    companyName: "",
    fullName: "",
    email: "",
    password: "",
    role: "employee" as AppRole,
    employeeNumber: "",
    title: "",
    department: ""
  });
  const [selectedCompanyRoles, setSelectedCompanyRoles] = useState<string[]>([]);
  const [passwordEdits, setPasswordEdits] = useState<Record<string, string>>({});
  const [createdInvite, setCreatedInvite] = useState<{ email?: string; temporaryPassword?: string; setupInviteUrl?: string | null; emailDeliveryStatus?: string | null; emailDeliveryError?: string | null; role?: AppRole; source: "created" | "password" } | null>(null);

  useEffect(() => {
    if (availableRoles.length && !availableRoles.includes(form.role)) {
      setForm((current) => ({ ...current, role: availableRoles[0] }));
    }
  }, [availableRoles, form.role]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createUser.reset();
    setCreatedInvite(null);
    if (!effectiveEntityId) return;
    const created = await createUser.mutateAsync({
      entityId: effectiveEntityId,
      ...form,
      companyName: isSuperAdmin && form.role === "company_admin" ? form.companyName : undefined,
      title: form.title || null,
      department: form.department || null,
      employeeNumber: form.employeeNumber || undefined,
      companyRoleIds: selectedCompanyRoles
    });
    setCreatedInvite({ email: form.email, temporaryPassword: form.password, setupInviteUrl: created.setupInviteUrl, emailDeliveryStatus: created.emailDeliveryStatus, emailDeliveryError: created.emailDeliveryError, role: form.role, source: "created" });
    setForm({ companyName: "", fullName: "", email: "", password: "", role: "employee", employeeNumber: "", title: "", department: "" });
    setSelectedCompanyRoles([]);
  }

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">User Accounts</h1>
            <p className="text-sm text-muted-foreground">{isSuperAdmin ? "Manage company admins, service access, and credentials." : "Create real Supabase login credentials and assign entity-scoped access."}</p>
          </div>
        </div>
        {isSuperAdmin ? (
          <div className="grid gap-3">
            {(users ?? []).map((user) => (
              <Card className="p-4" key={user.id}>
                <div className="grid gap-4 xl:grid-cols-[minmax(160px,1fr)_minmax(180px,1fr)_minmax(230px,1.2fr)]">
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Active company</div>
                    <div className="mt-1 font-semibold">{user.entityName ?? "Company"}</div>
                    <div className={user.entityIsActive === false ? "mt-1 text-xs font-medium text-destructive" : "mt-1 text-xs text-muted-foreground"}>
                      {user.entityIsActive === false ? "Services on hold" : "Active"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Company admin</div>
                    <div className="mt-1 font-semibold">{user.fullName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Company Admin</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Email</div>
                    <div className="mt-1 break-all font-medium">{user.email}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                  {passwordControl(user)}
                  {user.entityIsActive === false ? (
                    <SecondaryButton className="h-9 whitespace-nowrap" disabled={resumeServices.isPending} type="button" onClick={() => resumeServices.mutate(user.id)}>
                      <PlayCircle className="size-4" />Resume services
                    </SecondaryButton>
                  ) : (
                    <SecondaryButton className="h-9 whitespace-nowrap" disabled={holdServices.isPending} type="button" onClick={() => holdServices.mutate(user.id)}>
                      <PauseCircle className="size-4" />Hold services
                    </SecondaryButton>
                  )}
                  <SecondaryButton
                    className="h-9 whitespace-nowrap border-destructive/30 text-destructive hover:bg-destructive/10"
                    disabled={deleteCompanyAdmin.isPending}
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Permanently delete ${user.fullName}? This removes their login credentials.`)) deleteCompanyAdmin.mutate(user.id);
                    }}
                  >
                    <Trash2 className="size-4" />Delete User Permanently
                  </SecondaryButton>
                </div>
              </Card>
            ))}
            {!isLoading && !users?.length && <Card className="p-8 text-center text-sm text-muted-foreground">No company admins have been created yet.</Card>}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Primary Role</th><th className="px-4 py-3">Password</th><th className="px-4 py-3">Actions</th></tr>
              </thead>
              <tbody>
                {(users ?? []).map((user) => (
                  <tr className="border-t border-border" key={user.id}>
                    <td className="px-4 py-3 font-medium">{user.fullName}<div className="text-xs text-muted-foreground">{user.title ?? user.department}</div></td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">{roleLabels[user.role]}<div className="text-xs text-muted-foreground">{user.companyRoles.filter((role) => !role.isSystem && !builtInCompanyRoleSlugs.has(role.slug)).map((role) => role.name).join(", ")}</div></td>
                    <td className="px-4 py-3">{passwordControl(user)}</td>
                    <td className="px-4 py-3">
                      {canDeleteTenantUser(user) ? (
                        <SecondaryButton
                          className="h-9 whitespace-nowrap border-destructive/30 text-destructive hover:bg-destructive/10"
                          disabled={deleteCompanyAdmin.isPending}
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Permanently delete ${user.fullName}? This removes their profile, employee record, and login credentials.`)) deleteCompanyAdmin.mutate(user.id);
                          }}
                        >
                          <Trash2 className="size-4" />Delete
                        </SecondaryButton>
                      ) : (
                        <span className="text-xs text-muted-foreground">Protected</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!isLoading && !users?.length && <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>No users found for this company.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Card className="h-fit p-5">
        <div className="flex items-center gap-2"><UserRoundPlus className="size-5 text-primary" /><h2 className="font-semibold">Create user credentials</h2></div>
        <form className="mt-4 grid gap-3" onSubmit={submit}>
          {isSuperAdmin && form.role === "company_admin" && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <label className="grid gap-1 text-sm font-medium">
                Company name
                <Input required placeholder="Company legal or operating name" value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} />
              </label>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">A new tenant workspace, URL slug, system roles, and company admin invite will be created from this name.</p>
            </div>
          )}
          <Input required placeholder="Full name" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
          <Input required inputMode="email" placeholder="Email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          <Input required minLength={8} placeholder="Initial password" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
          <label className="grid gap-1 text-sm font-medium">
            Primary access role
            <Select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as AppRole }))}>
              {availableRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
            </Select>
          </label>
          {!isSuperAdmin && (
            <>
              <Input placeholder="Employee number" value={form.employeeNumber} onChange={(event) => setForm((current) => ({ ...current, employeeNumber: event.target.value }))} />
              <Input placeholder="Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
              <Input placeholder="Department" value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} />
            </>
          )}
          {customCompanyRoles.length > 0 && (
            <div className="rounded-md border border-border p-3">
              <div className="text-sm font-medium">Additional permission groups</div>
              <div className="mt-2 grid gap-2">
                {customCompanyRoles.map((role) => (
                  <label className="flex items-center gap-2 text-sm" key={role.id}>
                    <input
                      type="checkbox"
                      checked={selectedCompanyRoles.includes(role.id)}
                      onChange={(event) => setSelectedCompanyRoles((current) => event.target.checked ? [...current, role.id] : current.filter((id) => id !== role.id))}
                    />
                    {role.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          {createUser.error && !createdInvite && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{createUser.error.message}</div>}
          {createdInvite?.setupInviteUrl && (
            <div className="rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm">
              <div className="font-medium text-primary">{createdInvite.source === "password" ? "Password updated and access email prepared" : createdInvite.role === "company_admin" ? "Company admin setup invite created" : "User access invite created"}</div>
              <div className="mt-1 text-muted-foreground">Login: {createdInvite.email}</div>
              {createdInvite.emailDeliveryStatus !== "sent" && <div className="mt-1 text-muted-foreground">Temporary password: {createdInvite.temporaryPassword}</div>}
              <div className="mt-1 break-all text-muted-foreground">{createdInvite.setupInviteUrl}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Email delivery: {createdInvite.emailDeliveryStatus === "sent" ? "sent" : createdInvite.emailDeliveryStatus === "not_configured" ? "not sent because RESEND_API_KEY is not configured" : "failed"}
              </div>
              {createdInvite.emailDeliveryError && <div className="mt-2 rounded border border-destructive/20 bg-destructive/10 px-2 py-1 text-xs text-destructive">{createdInvite.emailDeliveryError}</div>}
            </div>
          )}
          <Button disabled={createUser.isPending} type="submit"><Plus className="size-4" />Create user</Button>
        </form>
      </Card>
    </div>
  );

  function passwordControl(user: NonNullable<typeof users>[number]) {
    const canUpdate = isSuperAdmin ? user.role === "company_admin" : !["super_admin", "admin", "company_admin"].includes(user.role);
    if (!canUpdate) return <span className="text-xs text-muted-foreground">Restricted</span>;
    return (
      <div className="flex min-w-[260px] gap-2">
        <Input
          className="h-9"
          minLength={8}
          placeholder="New password"
          type="password"
          value={passwordEdits[user.id] ?? ""}
          onChange={(event) => setPasswordEdits((current) => ({ ...current, [user.id]: event.target.value }))}
        />
        <SecondaryButton
          className="h-9 shrink-0"
          disabled={(passwordEdits[user.id]?.length ?? 0) < 8 || updatePassword.isPending}
          type="button"
          onClick={async () => {
            const result = await updatePassword.mutateAsync({ userId: user.id, input: { password: passwordEdits[user.id] ?? "" } });
            setCreatedInvite({
              email: user.email,
              temporaryPassword: passwordEdits[user.id] ?? "",
              setupInviteUrl: result.setupInviteUrl,
              emailDeliveryStatus: result.emailDeliveryStatus,
              emailDeliveryError: result.emailDeliveryError,
              role: user.role,
              source: "password"
            });
            setPasswordEdits((current) => ({ ...current, [user.id]: "" }));
          }}
        >
          <KeyRound className="size-4" />Update
        </SecondaryButton>
      </div>
    );
  }

  function canDeleteTenantUser(user: NonNullable<typeof users>[number]) {
    if (user.id === me?.id) return false;
    if (["super_admin", "admin", "company_admin"].includes(user.role)) return false;
    if (me?.role === "company_admin") return true;
    if (me?.role === "hr") return ["employee", "candidate", "recruiter", "marketing", "team_lead", "operations", "viewer"].includes(user.role);
    return false;
  }
}

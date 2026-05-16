"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, Plus, UserRoundPlus } from "lucide-react";
import { Button, Card, Input, SecondaryButton, Select } from "@vertechie/ui";
import { roles, type AppRole } from "@vertechie/types";
import { useAdminUsers, useCompanyRoles, useCreateAdminUser, useCurrentUser, useEntities, useUpdateUserPassword } from "@/features/admin/hooks";

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
  const { data: entities } = useEntities();
  const [entityId, setEntityId] = useState("");
  const effectiveEntityId = entityId || me?.entity.id;
  const { data: users, isLoading } = useAdminUsers(effectiveEntityId);
  const { data: companyRoles } = useCompanyRoles(effectiveEntityId);
  const createUser = useCreateAdminUser();
  const updatePassword = useUpdateUserPassword(effectiveEntityId);

  const availableRoles = useMemo(() => {
    if (me?.role === "super_admin") return roles.filter((role) => role === "company_admin");
    if (me?.role === "company_admin") return roles.filter((role) => ["hr", "accounts_manager", "team_lead", "employee", "recruiter"].includes(role));
    if (me?.role === "admin") return roles.filter((role) => role !== "super_admin");
    return [];
  }, [me?.role]);
  const customCompanyRoles = useMemo(
    () => (companyRoles ?? []).filter((role) => !role.isSystem && !builtInCompanyRoleSlugs.has(role.slug)),
    [companyRoles]
  );

  const [form, setForm] = useState({
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

  useEffect(() => {
    if (availableRoles.length && !availableRoles.includes(form.role)) {
      setForm((current) => ({ ...current, role: availableRoles[0] }));
    }
  }, [availableRoles, form.role]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!effectiveEntityId) return;
    await createUser.mutateAsync({
      entityId: effectiveEntityId,
      ...form,
      title: form.title || null,
      department: form.department || null,
      employeeNumber: form.employeeNumber || undefined,
      companyRoleIds: selectedCompanyRoles
    });
    setForm({ fullName: "", email: "", password: "", role: "employee", employeeNumber: "", title: "", department: "" });
    setSelectedCompanyRoles([]);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">User Accounts</h1>
            <p className="text-sm text-muted-foreground">Create real Supabase login credentials and assign entity-scoped access.</p>
          </div>
          {me?.role === "super_admin" && (
            <Select className="max-w-xs" value={effectiveEntityId ?? ""} onChange={(event) => setEntityId(event.target.value)}>
              {(entities ?? []).map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
            </Select>
          )}
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Primary Role</th><th className="px-4 py-3">Password</th></tr>
            </thead>
            <tbody>
              {(users ?? []).map((user) => (
                <tr className="border-t border-border" key={user.id}>
                  <td className="px-4 py-3 font-medium">{user.fullName}<div className="text-xs text-muted-foreground">{user.title ?? user.department}</div></td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{roleLabels[user.role]}<div className="text-xs text-muted-foreground">{user.companyRoles.filter((role) => !role.isSystem && !builtInCompanyRoleSlugs.has(role.slug)).map((role) => role.name).join(", ")}</div></td>
                  <td className="px-4 py-3">
                    {(me?.role === "super_admin" ? user.role === "company_admin" : !["super_admin", "admin", "company_admin"].includes(user.role)) ? (
                      <div className="flex gap-2">
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
                            await updatePassword.mutateAsync({ userId: user.id, input: { password: passwordEdits[user.id] ?? "" } });
                            setPasswordEdits((current) => ({ ...current, [user.id]: "" }));
                          }}
                        >
                          <KeyRound className="size-4" />Update
                        </SecondaryButton>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">Restricted</span>}
                  </td>
                </tr>
              ))}
              {!isLoading && !users?.length && <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={4}>No users found for this company.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Card className="h-fit p-5">
        <div className="flex items-center gap-2"><UserRoundPlus className="size-5 text-primary" /><h2 className="font-semibold">Create user credentials</h2></div>
        <form className="mt-4 grid gap-3" onSubmit={submit}>
          <Input required placeholder="Full name" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
          <Input required inputMode="email" placeholder="Email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          <Input required minLength={8} placeholder="Initial password" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
          <label className="grid gap-1 text-sm font-medium">
            Primary access role
            <Select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as AppRole }))}>
              {availableRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
            </Select>
          </label>
          <Input placeholder="Employee number" value={form.employeeNumber} onChange={(event) => setForm((current) => ({ ...current, employeeNumber: event.target.value }))} />
          <Input placeholder="Title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          <Input placeholder="Department" value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} />
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
          {createUser.error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{createUser.error.message}</div>}
          <Button disabled={createUser.isPending} type="submit"><Plus className="size-4" />Create user</Button>
        </form>
      </Card>
    </div>
  );
}

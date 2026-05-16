"use client";

import { useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { Button, Card, Input, Textarea } from "@vertechie/ui";
import { timesheetPermissions } from "@vertechie/types";
import { useCompanyRoles, useCreateCompanyRole, useCurrentUser } from "@/features/admin/hooks";

const dangerousPermissions = new Set(["entity:view:all", "profile:view:all", "employee:view:all", "audit:view:all", "timesheet:view:all", "timesheet:export:all"]);
const availablePermissions = timesheetPermissions.filter((permission) => !dangerousPermissions.has(permission));

export function AdminRolesPanel() {
  const { data: me } = useCurrentUser();
  const entityId = me?.entity.id;
  const { data: roles } = useCompanyRoles(entityId);
  const createRole = useCreateCompanyRole();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entityId) return;
    await createRole.mutateAsync({ entityId, name, description, permissions });
    setName("");
    setDescription("");
    setPermissions([]);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="grid gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Company Roles</h1>
          <p className="text-sm text-muted-foreground">Create company-specific roles and choose exactly what each role can do.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {(roles ?? []).map((role) => (
            <Card className="p-4" key={role.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{role.name}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>
                </div>
                {role.isSystem && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">System</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {role.permissions.map((permission) => <span className="rounded-full border border-border px-2 py-1 text-xs" key={permission}>{permission}</span>)}
              </div>
            </Card>
          ))}
        </div>
      </div>
      <Card className="h-fit p-5">
        <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /><h2 className="font-semibold">New company role</h2></div>
        <form className="mt-4 grid gap-3" onSubmit={submit}>
          <Input required placeholder="Role name" value={name} onChange={(event) => setName(event.target.value)} />
          <Textarea placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
          <div className="grid max-h-80 gap-2 overflow-auto rounded-md border border-border p-3">
            {availablePermissions.map((permission) => (
              <label className="flex items-center gap-2 text-sm" key={permission}>
                <input
                  type="checkbox"
                  checked={permissions.includes(permission)}
                  onChange={(event) => setPermissions((current) => event.target.checked ? [...current, permission] : current.filter((item) => item !== permission))}
                />
                {permission}
              </label>
            ))}
          </div>
          {createRole.error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{createRole.error.message}</div>}
          <Button disabled={createRole.isPending} type="submit"><Plus className="size-4" />Create role</Button>
        </form>
      </Card>
    </div>
  );
}

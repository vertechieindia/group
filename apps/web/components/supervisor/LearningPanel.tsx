"use client";

import { useMemo, useState } from "react";
import { Bell, BookOpenCheck, CheckCircle2, ExternalLink, Hash, Plus, UsersRound } from "lucide-react";
import { Badge, Button, Card, Input, Select, Textarea } from "@vertechie/ui";
import { useCurrentUser } from "@/features/admin/hooks";
import { useCreateDiscordGroup, useCreateLearningMaterial, useDiscordGroups, useLearningMaterials, useLifecycleEmployees } from "@/features/lifecycle/hooks";

const materialTypes = ["link", "document", "video", "policy", "training"] as const;

export function LearningPanel() {
  const { data: me } = useCurrentUser();
  const entityId = me?.entity.id;
  const { data: materials, isLoading } = useLearningMaterials(entityId);
  const { data: employees } = useLifecycleEmployees(entityId);
  const { data: groups } = useDiscordGroups(entityId);
  const createMaterial = useCreateLearningMaterial();
  const createGroup = useCreateDiscordGroup();
  const [materialForm, setMaterialForm] = useState({
    title: "",
    courseName: "",
    description: "",
    contentUrl: "",
    materialType: "link",
    required: true,
    estimatedMinutes: "",
    dueDate: "",
    assignedEmployeeIds: [] as string[]
  });
  const [groupForm, setGroupForm] = useState({ name: "", discordUrl: "", description: "", employeeIds: [] as string[] });

  const totals = useMemo(() => {
    const assignments = (materials ?? []).flatMap((material) => material.assignments);
    const completed = assignments.filter((assignment) => assignment.status === "completed" || assignment.status === "acknowledged").length;
    return {
      materials: materials?.length ?? 0,
      assigned: assignments.length,
      completed,
      pending: Math.max(assignments.length - completed, 0)
    };
  }, [materials]);

  async function publishMaterial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entityId) return;
    await createMaterial.mutateAsync({
      entityId,
      title: materialForm.title,
      courseName: materialForm.courseName || null,
      description: materialForm.description || null,
      contentUrl: materialForm.contentUrl || null,
      materialType: materialForm.materialType as (typeof materialTypes)[number],
      required: materialForm.required,
      estimatedMinutes: materialForm.estimatedMinutes ? Number(materialForm.estimatedMinutes) : null,
      dueDate: materialForm.dueDate || null,
      assignedEmployeeIds: materialForm.assignedEmployeeIds
    });
    setMaterialForm({ title: "", courseName: "", description: "", contentUrl: "", materialType: "link", required: true, estimatedMinutes: "", dueDate: "", assignedEmployeeIds: [] });
  }

  async function saveGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entityId) return;
    await createGroup.mutateAsync({
      entityId,
      name: groupForm.name,
      discordUrl: groupForm.discordUrl,
      description: groupForm.description || null,
      employeeIds: groupForm.employeeIds
    });
    setGroupForm({ name: "", discordUrl: "", description: "", employeeIds: [] });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="grid gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Learning Center</h1>
            <p className="text-sm text-muted-foreground">Supervisor-managed courses, acknowledgements, employee progress, and learning group coordination.</p>
          </div>
          <Badge className="border-primary/30 bg-primary/5 text-primary"><Bell className="mr-1 size-3" />Assignment alerts enabled</Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Published" value={totals.materials} />
          <Metric label="Assigned learners" value={totals.assigned} />
          <Metric label="Completed" value={totals.completed} />
          <Metric label="Needs follow-up" value={totals.pending} />
        </div>

        <Card className="overflow-hidden">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold">Course stream</h2>
            <p className="text-sm text-muted-foreground">Real material and assignment status from the database.</p>
          </div>
          <div className="grid gap-3 p-4">
            {(materials ?? []).map((material) => {
              const completed = material.assignments.filter((assignment) => assignment.status === "completed" || assignment.status === "acknowledged").length;
              const total = material.assignments.length;
              const percent = total ? Math.round((completed / total) * 100) : 0;
              return (
                <div className="rounded-lg border border-border bg-white p-4" key={material.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{material.title}</h3>
                        <Badge className={material.required ? "border-amber-200 bg-amber-50 text-amber-800" : "border-border bg-muted"}>{material.required ? "Required" : "Optional"}</Badge>
                        <Badge>{material.materialType}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{material.courseName || "General learning"}{material.estimatedMinutes ? ` · ${material.estimatedMinutes} min` : ""}</div>
                      {material.description && <p className="mt-2 text-sm text-muted-foreground">{material.description}</p>}
                      {material.contentUrl && (
                        <a className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary" href={material.contentUrl} rel="noreferrer" target="_blank">
                          Open material <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                    <div className="min-w-36 text-right">
                      <div className="text-lg font-semibold">{percent}%</div>
                      <div className="text-xs text-muted-foreground">{completed} of {total} complete</div>
                      <div className="mt-2 h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {material.assignments.map((assignment) => (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm" key={assignment.id}>
                        <div>
                          <div className="font-medium">{assignment.employeeName || assignment.employeeEmail || "Employee"}</div>
                          {assignment.dueDate && <div className="text-xs text-muted-foreground">Due {assignment.dueDate}</div>}
                        </div>
                        <Badge className={statusClass(assignment.status)}>{assignment.status.replace("_", " ")}</Badge>
                      </div>
                    ))}
                    {!material.assignments.length && <div className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">No employees assigned yet.</div>}
                  </div>
                </div>
              );
            })}
            {isLoading && <Card className="p-6 text-sm text-muted-foreground">Loading learning records...</Card>}
            {!isLoading && !materials?.length && <Card className="p-8 text-center text-sm text-muted-foreground">No learning materials have been published yet.</Card>}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold">Discord learning groups</h2>
            <p className="text-sm text-muted-foreground">Store the official group invite and roster for employees under supervision.</p>
          </div>
          <div className="grid gap-3 p-4">
            {(groups ?? []).map((group) => (
              <div className="rounded-lg border border-border p-4" key={group.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-semibold"><Hash className="size-4 text-primary" />{group.name}</div>
                    {group.description && <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>}
                    <a className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary" href={group.discordUrl} rel="noreferrer" target="_blank">Open Discord invite <ExternalLink className="size-3" /></a>
                  </div>
                  <Badge>{group.memberCount} members</Badge>
                </div>
                {!!group.members.length && <div className="mt-3 flex flex-wrap gap-2">{group.members.map((member) => <Badge key={member.employeeId}>{member.employeeName || member.employeeEmail || "Employee"}</Badge>)}</div>}
              </div>
            ))}
            {!groups?.length && <div className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">No Discord learning groups have been created yet.</div>}
          </div>
        </Card>
      </div>

      <div className="grid h-fit gap-5">
        <Card className="p-5">
          <div className="flex items-center gap-2"><BookOpenCheck className="size-5 text-primary" /><h2 className="font-semibold">Publish learning material</h2></div>
          <form className="mt-4 grid gap-3" onSubmit={publishMaterial}>
            <Input required placeholder="Title" value={materialForm.title} onChange={(event) => setMaterialForm((current) => ({ ...current, title: event.target.value }))} />
            <Input placeholder="Course or category" value={materialForm.courseName} onChange={(event) => setMaterialForm((current) => ({ ...current, courseName: event.target.value }))} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select value={materialForm.materialType} onChange={(event) => setMaterialForm((current) => ({ ...current, materialType: event.target.value }))}>
                {materialTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </Select>
              <Input min={1} placeholder="Minutes" type="number" value={materialForm.estimatedMinutes} onChange={(event) => setMaterialForm((current) => ({ ...current, estimatedMinutes: event.target.value }))} />
            </div>
            <Input placeholder="https://..." value={materialForm.contentUrl} onChange={(event) => setMaterialForm((current) => ({ ...current, contentUrl: event.target.value }))} />
            <Input type="date" value={materialForm.dueDate} onChange={(event) => setMaterialForm((current) => ({ ...current, dueDate: event.target.value }))} />
            <Textarea className="min-h-28" placeholder="What employees should understand or acknowledge" value={materialForm.description} onChange={(event) => setMaterialForm((current) => ({ ...current, description: event.target.value }))} />
            <label className="flex items-center gap-2 text-sm"><input checked={materialForm.required} type="checkbox" onChange={(event) => setMaterialForm((current) => ({ ...current, required: event.target.checked }))} />Required acknowledgement</label>
            <EmployeePicker employeeIds={materialForm.assignedEmployeeIds} employees={employees ?? []} label="Assign learners" onChange={(assignedEmployeeIds) => setMaterialForm((current) => ({ ...current, assignedEmployeeIds }))} />
            {createMaterial.error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{createMaterial.error.message}</div>}
            <Button disabled={createMaterial.isPending} type="submit"><Plus className="size-4" />Publish and alert employees</Button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2"><UsersRound className="size-5 text-primary" /><h2 className="font-semibold">Create Discord group</h2></div>
          <form className="mt-4 grid gap-3" onSubmit={saveGroup}>
            <Input required placeholder="Group name" value={groupForm.name} onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))} />
            <Input required placeholder="Discord invite URL" value={groupForm.discordUrl} onChange={(event) => setGroupForm((current) => ({ ...current, discordUrl: event.target.value }))} />
            <Textarea className="min-h-20" placeholder="Purpose or learning cohort notes" value={groupForm.description} onChange={(event) => setGroupForm((current) => ({ ...current, description: event.target.value }))} />
            <EmployeePicker employeeIds={groupForm.employeeIds} employees={employees ?? []} label="Group members" onChange={(employeeIds) => setGroupForm((current) => ({ ...current, employeeIds }))} />
            {createGroup.error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{createGroup.error.message}</div>}
            <Button disabled={createGroup.isPending} type="submit"><Hash className="size-4" />Save group roster</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </Card>
  );
}

function EmployeePicker({ employeeIds, employees, label, onChange }: { employeeIds: string[]; employees: Array<{ id: string; fullName: string; employeeNumber: string; title: string | null }>; label: string; onChange: (ids: string[]) => void }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-medium">{label}</div>
        <button className="text-xs font-medium text-primary disabled:text-muted-foreground" disabled={!employees.length} type="button" onClick={() => onChange(employeeIds.length === employees.length ? [] : employees.map((employee) => employee.id))}>
          {employees.length && employeeIds.length === employees.length ? "Clear" : "Select all"}
        </button>
      </div>
      <div className="grid max-h-48 gap-2 overflow-auto">
        {employees.map((employee) => (
          <label className="flex items-start gap-2 rounded-md border border-border px-3 py-2 text-sm" key={employee.id}>
            <input
              checked={employeeIds.includes(employee.id)}
              className="mt-1"
              type="checkbox"
              onChange={(event) => onChange(event.target.checked ? [...employeeIds, employee.id] : employeeIds.filter((id) => id !== employee.id))}
            />
            <span>
              <span className="block font-medium">{employee.fullName}</span>
              <span className="block text-xs text-muted-foreground">{employee.employeeNumber}{employee.title ? ` · ${employee.title}` : ""}</span>
            </span>
          </label>
        ))}
        {!employees.length && <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">No employees are available for this entity yet.</div>}
      </div>
    </div>
  );
}

function statusClass(status: string) {
  if (status === "completed" || status === "acknowledged") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "viewed") return "border-sky-200 bg-sky-50 text-sky-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

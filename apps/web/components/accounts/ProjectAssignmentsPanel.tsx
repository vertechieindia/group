"use client";

import { type ChangeEvent, useMemo, useState } from "react";
import { BriefcaseBusiness, Plus } from "lucide-react";
import { Badge, Button, Card, Input, Select } from "@vertechie/ui";
import { useCurrentUser } from "@/features/admin/hooks";
import { useCreateProjectAssignment, useLifecycleEmployees, useProjectAssignments } from "@/features/lifecycle/hooks";

export function ProjectAssignmentsPanel() {
  const { data: me } = useCurrentUser();
  const entityId = me?.entity.id;
  const { data: employees } = useLifecycleEmployees(entityId);
  const { data: assignments, isLoading } = useProjectAssignments(entityId);
  const createAssignment = useCreateProjectAssignment();
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    employeeId: "",
    clientName: "",
    projectName: "",
    roleName: "",
    rateType: "hourly" as "hourly" | "salary",
    billRate: "",
    startDate: "",
    endDate: "",
    isDefault: true
  });
  const selectedEmployee = (employees ?? []).find((employee) => employee.id === form.employeeId);
  const filteredEmployees = useMemo(() => {
    const search = employeeSearch.trim().toLowerCase();
    if (!search) return employees ?? [];
    return (employees ?? []).filter((employee) => [employee.fullName, employee.employeeNumber, employee.email]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(search)));
  }, [employeeSearch, employees]);

  function updateEmployeeSearch(event: ChangeEvent<HTMLInputElement>) {
    setEmployeeSearch(event.target.value);
  }

  function updateClientName(event: ChangeEvent<HTMLInputElement>) {
    setForm((current) => ({ ...current, clientName: event.target.value }));
  }

  function updateProjectName(event: ChangeEvent<HTMLInputElement>) {
    setForm((current) => ({ ...current, projectName: event.target.value }));
  }

  function updateRoleName(event: ChangeEvent<HTMLInputElement>) {
    setForm((current) => ({ ...current, roleName: event.target.value }));
  }

  function updateRateType(event: ChangeEvent<HTMLSelectElement>) {
    setForm((current) => ({ ...current, rateType: event.target.value as "hourly" | "salary" }));
  }

  function updateBillRate(event: ChangeEvent<HTMLInputElement>) {
    setForm((current) => ({ ...current, billRate: event.target.value }));
  }

  function updateStartDate(event: ChangeEvent<HTMLInputElement>) {
    setForm((current) => ({ ...current, startDate: event.target.value }));
  }

  function updateEndDate(event: ChangeEvent<HTMLInputElement>) {
    setForm((current) => ({ ...current, endDate: event.target.value }));
  }

  function updateDefaultProject(event: ChangeEvent<HTMLInputElement>) {
    setForm((current) => ({ ...current, isDefault: event.target.checked }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entityId) return;
    if (!form.employeeId) {
      setFormError("Select an employee before assigning the project.");
      return;
    }
    setFormError(null);
    await createAssignment.mutateAsync({
      entityId,
      employeeId: form.employeeId,
      clientName: form.clientName,
      projectName: form.projectName,
      roleName: form.roleName || null,
      rateType: form.rateType,
      billRate: form.billRate ? Number(form.billRate) : null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      isDefault: form.isDefault
    });
    setEmployeeSearch("");
    setForm({ employeeId: "", clientName: "", projectName: "", roleName: "", rateType: "hourly", billRate: "", startDate: "", endDate: "", isDefault: true });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="grid gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Project Assignments</h1>
          <p className="text-sm text-muted-foreground">Assign client projects to employees so timesheets auto-populate the right work.</p>
        </div>
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Rate</th><th className="px-4 py-3">Default</th></tr>
            </thead>
            <tbody>
              {(assignments ?? []).map((assignment) => (
                <tr className="border-t border-border" key={assignment.id}>
                  <td className="px-4 py-3 font-medium">{assignment.employeeName ?? "Employee"}<div className="text-xs text-muted-foreground">{assignment.employeeNumber ?? "No employee ID"} · {assignment.roleName ?? "Assigned project"}</div></td>
                  <td className="px-4 py-3">{assignment.clientName}</td>
                  <td className="px-4 py-3">{assignment.projectName}</td>
                  <td className="px-4 py-3">{assignment.billRate == null ? "Not set" : assignment.rateType === "salary" ? `$${assignment.billRate.toFixed(2)} salary` : `$${assignment.billRate.toFixed(2)}/hr`}</td>
                  <td className="px-4 py-3">{assignment.isDefault ? <Badge>Default</Badge> : "No"}</td>
                </tr>
              ))}
              {!isLoading && !assignments?.length && <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>No project assignments yet.</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
      <Card className="h-fit p-5">
        <div className="flex items-center gap-2"><BriefcaseBusiness className="size-5 text-primary" /><h2 className="font-semibold">Assign project</h2></div>
        <form className="mt-4 grid gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Employee</label>
            <Input placeholder="Search by employee name, ID, or email" value={employeeSearch} onChange={updateEmployeeSearch} />
            <div className="max-h-52 overflow-auto rounded-md border border-border bg-white">
              {filteredEmployees.map((employee) => (
                <button
                  className={`flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted ${form.employeeId === employee.id ? "bg-primary/10" : ""}`}
                  key={employee.id}
                  type="button"
                  onClick={() => {
                    setForm((current) => ({ ...current, employeeId: employee.id }));
                    setEmployeeSearch(`${employee.fullName} · ${employee.employeeNumber}`);
                  }}
                >
                  <span>
                    <span className="block font-medium">{employee.fullName}</span>
                    <span className="block text-xs text-muted-foreground">{employee.employeeNumber} · {employee.email}</span>
                  </span>
                  {form.employeeId === employee.id && <Badge>Selected</Badge>}
                </button>
              ))}
              {!filteredEmployees.length && <div className="px-3 py-4 text-sm text-muted-foreground">No employees match that search.</div>}
            </div>
            {selectedEmployee && <div className="rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm text-primary">Selected: {selectedEmployee.fullName} · {selectedEmployee.employeeNumber}</div>}
          </div>
          <Input required placeholder="Client name" value={form.clientName} onChange={updateClientName} />
          <Input required placeholder="Project name" value={form.projectName} onChange={updateProjectName} />
          <Input placeholder="Role / billing title" value={form.roleName} onChange={updateRoleName} />
          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <Select value={form.rateType} onChange={updateRateType}>
              <option value="hourly">Per hour</option>
              <option value="salary">Salary</option>
            </Select>
            <Input min={0} placeholder={form.rateType === "salary" ? "Salary amount" : "Hourly bill rate"} step={0.01} type="number" value={form.billRate} onChange={updateBillRate} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Start date<Input type="date" value={form.startDate} onChange={updateStartDate} /></label>
            <label className="text-sm font-medium">End date<Input type="date" value={form.endDate} onChange={updateEndDate} /></label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input checked={form.isDefault} onChange={updateDefaultProject} type="checkbox" />Use as employee default project</label>
          {(formError || createAssignment.error) && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError ?? createAssignment.error?.message}</div>}
          <Button disabled={createAssignment.isPending} type="submit"><Plus className="size-4" />Assign project</Button>
        </form>
      </Card>
    </div>
  );
}

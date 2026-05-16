"use client";

import { BookOpenCheck, CheckCircle2, ExternalLink } from "lucide-react";
import { Badge, Button, Card } from "@vertechie/ui";
import { useMyLearningAssignments, useUpdateLearningAssignment } from "@/features/lifecycle/hooks";

export function MyLearningPanel() {
  const { data: assignments, isLoading } = useMyLearningAssignments();
  const updateAssignment = useUpdateLearningAssignment();
  const completed = (assignments ?? []).filter((assignment) => assignment.status === "completed" || assignment.status === "acknowledged").length;
  const pending = Math.max((assignments?.length ?? 0) - completed, 0);

  async function update(assignmentId: string, status: "viewed" | "acknowledged" | "completed") {
    await updateAssignment.mutateAsync({ assignmentId, status });
  }

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-semibold">My Learning</h1>
        <p className="text-sm text-muted-foreground">Assigned training, policies, and supervisor learning materials that need review or acknowledgement.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Assigned" value={assignments?.length ?? 0} />
        <Metric label="Completed" value={completed} />
        <Metric label="Pending" value={pending} />
      </div>
      <Card className="overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-semibold">Learning queue</h2>
          <p className="text-sm text-muted-foreground">Open each material, then acknowledge or mark complete when finished.</p>
        </div>
        <div className="grid gap-3 p-4">
          {(assignments ?? []).map((assignment) => (
            <div className="rounded-lg border border-border p-4" key={assignment.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{assignment.material.title}</h3>
                    <Badge className={statusClass(assignment.status)}>{assignment.status.replace("_", " ")}</Badge>
                    {assignment.material.required && <Badge className="border-amber-200 bg-amber-50 text-amber-800">Required</Badge>}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {assignment.material.courseName || "General learning"}
                    {assignment.material.estimatedMinutes ? ` · ${assignment.material.estimatedMinutes} min` : ""}
                    {assignment.dueDate ? ` · Due ${assignment.dueDate}` : ""}
                  </div>
                  {assignment.material.description && <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{assignment.material.description}</p>}
                  {assignment.material.contentUrl && (
                    <a className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary" href={assignment.material.contentUrl} rel="noreferrer" target="_blank" onClick={() => assignment.status === "assigned" && update(assignment.id, "viewed")}>
                      Open learning material <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button className="bg-white text-foreground ring-1 ring-border hover:bg-muted" disabled={updateAssignment.isPending || assignment.status === "acknowledged" || assignment.status === "completed"} onClick={() => update(assignment.id, "acknowledged")}>
                    <CheckCircle2 className="size-4" />Acknowledge
                  </Button>
                  <Button disabled={updateAssignment.isPending || assignment.status === "completed"} onClick={() => update(assignment.id, "completed")}>
                    <BookOpenCheck className="size-4" />Complete
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {isLoading && <div className="p-6 text-sm text-muted-foreground">Loading learning assignments...</div>}
          {!isLoading && !assignments?.length && <div className="p-8 text-center text-sm text-muted-foreground">No learning materials have been assigned to you yet.</div>}
        </div>
      </Card>
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

function statusClass(status: string) {
  if (status === "completed" || status === "acknowledged") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "viewed") return "border-sky-200 bg-sky-50 text-sky-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

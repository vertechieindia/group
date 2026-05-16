"use client";

import { useState } from "react";
import { Banknote, Check, FileWarning, Trash2, WalletCards, X } from "lucide-react";
import { Button, Card, SecondaryButton, Textarea } from "@vertechie/ui";
import { useReviewTimesheet, useTimesheet } from "@/features/timesheets/hooks";
import { TimesheetDetail } from "@/components/timesheets/TimesheetDetail";

export function TimesheetReview({ id }: { id: string }) {
  const [comments, setComments] = useState("");
  const approve = useReviewTimesheet(id, "approve");
  const reject = useReviewTimesheet(id, "reject");
  const correction = useReviewTimesheet(id, "requestCorrection");
  const paymentReceived = useReviewTimesheet(id, "paymentReceived");
  const employeePaid = useReviewTimesheet(id, "employeePaid");
  const deleteForRefill = useReviewTimesheet(id, "deleteForRefill");
  const { data } = useTimesheet(id);
  const reasonRequired = !comments.trim();

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <TimesheetDetail id={id} />
      <Card className="h-fit p-5">
        <h2 className="text-lg font-semibold">Review action</h2>
        <p className="mt-1 text-sm text-muted-foreground">Reviewer, timestamp, comments, and status changes are written to activity and audit logs.</p>
        <div className="mt-4 grid gap-3">
          <Textarea value={comments} onChange={(event) => setComments(event.target.value)} placeholder="Reviewer comments" />
          <Button disabled={!data || approve.isPending} onClick={() => approve.mutate({ comments })}><Check className="size-4" />Approve</Button>
          <SecondaryButton disabled={!data || correction.isPending} onClick={() => correction.mutate({ comments })}><FileWarning className="size-4" />Request correction</SecondaryButton>
          <SecondaryButton disabled={!data || reject.isPending || reasonRequired} className="border-destructive text-destructive" onClick={() => reject.mutate({ comments })}><X className="size-4" />Reject with reason</SecondaryButton>
          <div className="my-1 border-t border-border" />
          <SecondaryButton disabled={!data || paymentReceived.isPending} onClick={() => paymentReceived.mutate({ comments })}><Banknote className="size-4" />Payment received from client</SecondaryButton>
          <SecondaryButton disabled={!data || employeePaid.isPending} onClick={() => employeePaid.mutate({ comments })}><WalletCards className="size-4" />Paid to employee</SecondaryButton>
          <SecondaryButton disabled={!data || deleteForRefill.isPending || reasonRequired} className="border-slate-500 text-slate-700" onClick={() => deleteForRefill.mutate({ comments })}><Trash2 className="size-4" />Delete and require refill</SecondaryButton>
          {reasonRequired && <p className="text-xs text-muted-foreground">Reject and delete/refill require a reason.</p>}
        </div>
      </Card>
    </div>
  );
}

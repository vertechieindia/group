"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@vertechie/ui";
import { TimesheetTable } from "@/components/timesheets/TimesheetTable";
import { useTimesheets } from "@/features/timesheets/hooks";

export default function TimesheetsPage() {
  const { data, isLoading } = useTimesheets();
  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold">My Timesheets</h1><p className="text-sm text-muted-foreground">Weekly and monthly time submissions with approval status.</p></div>
        <Link href="/timesheets/new"><Button><Plus className="size-4" />New</Button></Link>
      </div>
      <TimesheetTable rows={data} isLoading={isLoading} />
    </div>
  );
}

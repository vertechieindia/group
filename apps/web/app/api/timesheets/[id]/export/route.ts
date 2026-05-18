import { apiHandler } from "@/lib/route-handler";
import { TimesheetService } from "@/lib/timesheet-service";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return apiHandler(request, async (ctx) => new TimesheetService(ctx).exportTimesheetPdf(params.id), {
    pdf: { filename: `timesheet-${params.id}.pdf` }
  });
}

import { apiHandler } from "@/lib/route-handler";
import { TimesheetService } from "@/lib/timesheet-service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return apiHandler(request, async (ctx) => new TimesheetService(ctx).submit(params.id));
}

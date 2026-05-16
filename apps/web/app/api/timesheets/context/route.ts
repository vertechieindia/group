import { apiHandler } from "@/lib/route-handler";
import { TimesheetService } from "@/lib/timesheet-service";

export async function GET(request: Request) {
  return apiHandler(request, async (ctx) => new TimesheetService(ctx).context());
}

import { updateTimesheetSchema } from "@vertechie/types";
import { apiHandler, parseJson } from "@/lib/route-handler";
import { TimesheetService } from "@/lib/timesheet-service";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return apiHandler(request, async (ctx) => new TimesheetService(ctx).get(params.id));
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return apiHandler(request, async (ctx) => new TimesheetService(ctx).update(params.id, await parseJson(request, updateTimesheetSchema)));
}

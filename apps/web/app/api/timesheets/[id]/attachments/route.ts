import { attachmentCompleteSchema } from "@vertechie/types";
import { apiHandler, parseJson } from "@/lib/route-handler";
import { TimesheetService } from "@/lib/timesheet-service";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return apiHandler(request, async (ctx) => new TimesheetService(ctx).attach(params.id, await parseJson(request, attachmentCompleteSchema)));
}

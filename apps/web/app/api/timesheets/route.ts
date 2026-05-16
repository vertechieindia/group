import { createTimesheetSchema, listTimesheetsSchema } from "@vertechie/types";
import { apiHandler, parseJson, searchParams } from "@/lib/route-handler";
import { TimesheetService } from "@/lib/timesheet-service";

export async function GET(request: Request) {
  return apiHandler(request, async (ctx) => new TimesheetService(ctx).list(listTimesheetsSchema.parse(searchParams(request))));
}

export async function POST(request: Request) {
  return apiHandler(request, async (ctx) => new TimesheetService(ctx).create(await parseJson(request, createTimesheetSchema)));
}

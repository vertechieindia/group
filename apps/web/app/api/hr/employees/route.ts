import { listTimesheetsSchema, updateEmployeeLifecycleSchema } from "@vertechie/types";
import { LifecycleService } from "@/lib/lifecycle-service";
import { apiHandler, parseJson, searchParams } from "@/lib/route-handler";

export async function GET(request: Request) {
  return apiHandler(request, async (ctx) => new LifecycleService(ctx).listEmployees(listTimesheetsSchema.parse(searchParams(request)).entityId));
}

export async function PATCH(request: Request) {
  return apiHandler(request, async (ctx) => new LifecycleService(ctx).updateEmployeeLifecycle(await parseJson(request, updateEmployeeLifecycleSchema)));
}

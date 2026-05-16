import { listTimesheetsSchema } from "@vertechie/types";
import { LifecycleService } from "@/lib/lifecycle-service";
import { apiHandler, searchParams } from "@/lib/route-handler";

export async function GET(request: Request) {
  return apiHandler(request, async (ctx) => new LifecycleService(ctx).listInvoices(listTimesheetsSchema.parse(searchParams(request)).entityId));
}

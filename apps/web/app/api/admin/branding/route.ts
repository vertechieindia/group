import { entityBrandingSchema, listTimesheetsSchema } from "@vertechie/types";
import { AdminService } from "@/lib/admin-service";
import { apiHandler, parseJson, searchParams } from "@/lib/route-handler";

export async function GET(request: Request) {
  return apiHandler(request, async (ctx) => new AdminService(ctx).getBranding(listTimesheetsSchema.parse(searchParams(request)).entityId));
}

export async function PATCH(request: Request) {
  return apiHandler(request, async (ctx) => new AdminService(ctx).updateBranding(await parseJson(request, entityBrandingSchema)));
}

import { createAdminUserSchema, listTimesheetsSchema } from "@vertechie/types";
import { AdminService } from "@/lib/admin-service";
import { apiHandler, parseJson, searchParams } from "@/lib/route-handler";

export async function GET(request: Request) {
  return apiHandler(request, async (ctx) => new AdminService(ctx).listUsers(listTimesheetsSchema.parse(searchParams(request)).entityId));
}

export async function POST(request: Request) {
  return apiHandler(request, async (ctx) => new AdminService(ctx).createUser(await parseJson(request, createAdminUserSchema)));
}

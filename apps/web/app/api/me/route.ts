import { apiHandler } from "@/lib/route-handler";
import { AdminService } from "@/lib/admin-service";

export async function GET(request: Request) {
  return apiHandler(request, async (ctx) => new AdminService(ctx).currentUser());
}

import { AdminService } from "@/lib/admin-service";
import { apiHandler } from "@/lib/route-handler";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return apiHandler(request, async (ctx) => new AdminService(ctx).resumeCompanyServices(params.id));
}

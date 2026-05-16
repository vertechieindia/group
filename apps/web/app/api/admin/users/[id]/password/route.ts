import { updateUserPasswordSchema } from "@vertechie/types";
import { AdminService } from "@/lib/admin-service";
import { apiHandler, parseJson } from "@/lib/route-handler";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return apiHandler(request, async (ctx) => new AdminService(ctx).updateUserPassword(params.id, await parseJson(request, updateUserPasswordSchema)));
}

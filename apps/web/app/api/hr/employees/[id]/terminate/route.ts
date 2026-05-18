import { terminateEmployeeSchema } from "@vertechie/types";
import { LifecycleService } from "@/lib/lifecycle-service";
import { apiHandler, parseJson } from "@/lib/route-handler";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return apiHandler(request, async (ctx) => new LifecycleService(ctx).terminateEmployee(params.id, await parseJson(request, terminateEmployeeSchema)));
}

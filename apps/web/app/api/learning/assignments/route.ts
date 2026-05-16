import { updateLearningAssignmentSchema } from "@vertechie/types";
import { LifecycleService } from "@/lib/lifecycle-service";
import { apiHandler, parseJson } from "@/lib/route-handler";

export async function GET(request: Request) {
  return apiHandler(request, async (ctx) => new LifecycleService(ctx).listMyLearningAssignments());
}

export async function PATCH(request: Request) {
  return apiHandler(request, async (ctx) => new LifecycleService(ctx).updateMyLearningAssignment(await parseJson(request, updateLearningAssignmentSchema)));
}

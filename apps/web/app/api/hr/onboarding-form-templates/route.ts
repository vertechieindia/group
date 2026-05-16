import { createOnboardingFormTemplateSchema, listTimesheetsSchema } from "@vertechie/types";
import { LifecycleService } from "@/lib/lifecycle-service";
import { apiHandler, parseJson, searchParams } from "@/lib/route-handler";

export async function GET(request: Request) {
  return apiHandler(request, async (ctx) => new LifecycleService(ctx).listOnboardingFormTemplates(listTimesheetsSchema.parse(searchParams(request)).entityId));
}

export async function POST(request: Request) {
  return apiHandler(request, async (ctx) => new LifecycleService(ctx).createOnboardingFormTemplate(await parseJson(request, createOnboardingFormTemplateSchema)));
}

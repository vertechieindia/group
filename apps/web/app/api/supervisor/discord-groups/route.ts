import { createDiscordGroupSchema, listTimesheetsSchema } from "@vertechie/types";
import { LifecycleService } from "@/lib/lifecycle-service";
import { apiHandler, parseJson, searchParams } from "@/lib/route-handler";

export async function GET(request: Request) {
  return apiHandler(request, async (ctx) => new LifecycleService(ctx).listDiscordGroups(listTimesheetsSchema.parse(searchParams(request)).entityId));
}

export async function POST(request: Request) {
  return apiHandler(request, async (ctx) => new LifecycleService(ctx).createDiscordGroup(await parseJson(request, createDiscordGroupSchema)));
}

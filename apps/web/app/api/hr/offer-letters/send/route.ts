import { sendOfferLetterSchema } from "@vertechie/types";
import { LifecycleService } from "@/lib/lifecycle-service";
import { apiHandler, parseJson } from "@/lib/route-handler";

export async function POST(request: Request) {
  return apiHandler(request, async (ctx) => new LifecycleService(ctx).sendOfferLetter(await parseJson(request, sendOfferLetterSchema)));
}

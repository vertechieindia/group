import { z, ZodError, type ZodTypeAny } from "zod";
import { fail, getRequestId, ok } from "./api-response";
import { createRequestContext, type RequestContext } from "./request-context";

export async function apiHandler<T>(
  request: Request,
  handler: (ctx: RequestContext) => Promise<T>,
  options: { csv?: boolean } = {}
) {
  const requestId = getRequestId(request);
  try {
    const ctx = await createRequestContext(request, requestId);
    const data = await handler(ctx);
    if (options.csv && typeof data === "string") {
      return new Response(data, {
        headers: {
          "content-type": "text/csv",
          "content-disposition": `attachment; filename="timesheet-export-${new Date().toISOString().slice(0, 10)}.csv"`,
          "x-request-id": requestId
        }
      });
    }
    return ok(data, requestId);
  } catch (error) {
    if (error instanceof ZodError) return fail("VALIDATION_ERROR", "The request payload is invalid.", requestId, 422, error.flatten());
    const message = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : "INTERNAL_ERROR";
    if (message === "UNAUTHENTICATED") return fail("UNAUTHENTICATED", "Authentication is required.", requestId, 401);
    if (message === "ACCOUNT_INACTIVE") return fail("ACCOUNT_INACTIVE", "This account or company workspace is currently inactive.", requestId, 403);
    if (message === "FORBIDDEN" || message === "ENTITY_SCOPE_VIOLATION") return fail("FORBIDDEN", "You do not have access to this resource.", requestId, 403);
    if (message === "TIMESHEET_LOCKED" || message === "INVALID_STATUS_TRANSITION") return fail(message, "The timesheet cannot be changed in its current status.", requestId, 409);
    if (message === "REJECTION_REASON_REQUIRED") return fail(message, "A rejection or delete/refill reason is required.", requestId, 422);
    if (message.includes("NEXT_PUBLIC_SUPABASE_URL") || message.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
      return fail("CONFIGURATION_ERROR", "Supabase environment variables are required before authenticated features can run.", requestId, 503);
    }
    return fail("INTERNAL_ERROR", message, requestId, 500, error);
  }
}

export async function parseJson<T extends ZodTypeAny>(request: Request, schema: T): Promise<z.output<T>> {
  const body = await request.json();
  return schema.parse(body);
}

export function searchParams(request: Request) {
  return Object.fromEntries(new URL(request.url).searchParams.entries());
}

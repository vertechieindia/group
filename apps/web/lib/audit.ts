import type { RequestContext } from "./request-context";

export async function writeAudit(
  ctx: RequestContext,
  input: {
    action: string;
    resourceType: string;
    resourceId?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }
) {
  await ctx.supabase.from("audit_logs").insert({
    entity_id: input.entityId ?? ctx.profile.entityId,
    actor_id: ctx.profile.id,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId,
    request_id: ctx.requestId,
    metadata: input.metadata ?? {},
    created_by: ctx.profile.id,
    updated_by: ctx.profile.id
  });
}

import type { RequestContext } from "./request-context";

export async function notifyEntityRole(
  ctx: RequestContext,
  input: {
    entityId: string;
    role: string;
    type: string;
    title: string;
    body: string;
    payload?: Record<string, unknown>;
  }
) {
  const { data: recipients } = await ctx.supabase
    .from("profiles")
    .select("id")
    .eq("entity_id", input.entityId)
    .eq("role", input.role)
    .eq("is_active", true)
    .is("deleted_at", null);

  if (!recipients?.length) return;

  await ctx.supabase.from("notifications").insert(
    recipients.flatMap((recipient) => [
      {
        entity_id: input.entityId,
        recipient_id: recipient.id,
        channel: "in_app",
        type: input.type,
        title: input.title,
        body: input.body,
        payload: input.payload ?? {},
        created_by: ctx.profile.id,
        updated_by: ctx.profile.id
      },
      {
        entity_id: input.entityId,
        recipient_id: recipient.id,
        channel: "email",
        type: input.type,
        title: input.title,
        body: input.body,
        payload: input.payload ?? {},
        created_by: ctx.profile.id,
        updated_by: ctx.profile.id
      }
    ])
  );
}

export async function notifyProfile(
  ctx: RequestContext,
  input: {
    entityId: string;
    recipientId: string;
    type: string;
    title: string;
    body: string;
    payload?: Record<string, unknown>;
  }
) {
  await ctx.supabase.from("notifications").insert([
    {
      entity_id: input.entityId,
      recipient_id: input.recipientId,
      channel: "in_app",
      type: input.type,
      title: input.title,
      body: input.body,
      payload: input.payload ?? {},
      created_by: ctx.profile.id,
      updated_by: ctx.profile.id
    },
    {
      entity_id: input.entityId,
      recipient_id: input.recipientId,
      channel: "email",
      type: input.type,
      title: input.title,
      body: input.body,
      payload: input.payload ?? {},
      created_by: ctx.profile.id,
      updated_by: ctx.profile.id
    }
  ]);
}

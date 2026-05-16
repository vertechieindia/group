import { createServerSupabaseClient } from "@vertechie/db";
import type { AppRole } from "@vertechie/types";

export type RequestProfile = {
  id: string;
  entityId: string;
  email: string;
  fullName: string;
  role: AppRole;
};

export type RequestContext = {
  requestId: string;
  supabase: ReturnType<typeof createServerSupabaseClient>;
  profile: RequestProfile;
};

export async function createRequestContext(request: Request, requestId: string): Promise<RequestContext> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "") ?? cookieValue(request.headers.get("cookie"), "sb-access-token");
  const supabase = createServerSupabaseClient(token);
  const { data: userResult, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userResult.user) {
    throw new Error("UNAUTHENTICATED");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, entity_id, email, full_name, role")
    .eq("id", userResult.user.id)
    .single();

  if (error || !profile) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  return {
    requestId,
    supabase,
    profile: {
      id: profile.id,
      entityId: profile.entity_id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role
    }
  };
}

function cookieValue(cookieHeader: string | null, name: string) {
  return cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export async function requirePermission(ctx: RequestContext, permission: string, entityId?: string) {
  if (await hasPermission(ctx, permission, entityId)) return;
  throw new Error("FORBIDDEN");
}

export async function hasPermission(ctx: RequestContext, permission: string, entityId?: string) {
  const { data, error } = await ctx.supabase.rpc("has_permission", {
    permission_code: permission,
    target_entity_id: entityId ?? ctx.profile.entityId
  });

  return !error && data === true;
}

export async function assertEntityScope(ctx: RequestContext, entityId: string) {
  if (ctx.profile.role === "super_admin") return;
  if (ctx.profile.entityId !== entityId) throw new Error("ENTITY_SCOPE_VIOLATION");
}

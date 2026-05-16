import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ success: false, error: "Missing Supabase environment" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, title, body, recipient_id, profiles!notifications_recipient_id_fkey(email)")
    .eq("channel", "email")
    .is("read_at", null)
    .limit(50);

  if (error) return Response.json({ success: false, error: error.message }, { status: 500 });

  for (const notification of notifications ?? []) {
    const email = (notification as any).profiles?.email;
    if (resendApiKey && email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${resendApiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: "VerTechie Workforce OS <notifications@vertechie.com>",
          to: email,
          subject: notification.title,
          text: notification.body
        })
      });
    }
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notification.id);
  }

  return Response.json({ success: true, processed: notifications?.length ?? 0 });
});

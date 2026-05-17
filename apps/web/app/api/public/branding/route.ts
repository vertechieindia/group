import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@vertechie/db";
import { fallbackLogoForEntity } from "@/lib/brand-assets";

export async function GET(request: Request) {
  const company = new URL(request.url).searchParams.get("company");
  if (!company) return NextResponse.json({ brandName: "VerTechie Group LLC", brandLogoUrl: "/logos/vertechie-logo.jpg" });

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("business_entities")
    .select("name, slug, portal_slug, brand_name, brand_logo_url")
    .or(`portal_slug.eq.${company},slug.eq.${company}`)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return NextResponse.json({ brandName: "VerTechie Group LLC", brandLogoUrl: "/logos/vertechie-logo.jpg" });

  return NextResponse.json({
    brandName: data?.brand_name || data?.name || "VerTechie Group LLC",
    brandLogoUrl: data?.brand_logo_url || fallbackLogoForEntity({ name: data?.name, slug: data?.slug, portalSlug: data?.portal_slug })
  });
}

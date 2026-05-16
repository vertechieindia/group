import type { Metadata } from "next";
import { createAdminSupabaseClient } from "@vertechie/db";
import { fallbackLogoForEntity } from "@/lib/brand-assets";

export async function generateMetadata({ params }: { params: { company: string } }): Promise<Metadata> {
  const supabase = createAdminSupabaseClient();
  const { data: entity } = await supabase
    .from("business_entities")
    .select("name, slug, portal_slug, brand_name, brand_logo_url")
    .or(`portal_slug.eq.${params.company},slug.eq.${params.company}`)
    .is("deleted_at", null)
    .maybeSingle();

  const name = entity?.brand_name || entity?.name || "VerTechie Group";
  const icon = entity?.brand_logo_url || fallbackLogoForEntity({ name: entity?.name, slug: entity?.slug, portalSlug: entity?.portal_slug });

  return {
    title: `${name} Workforce OS`,
    icons: {
      icon: [{ url: icon }],
      shortcut: [{ url: icon }],
      apple: [{ url: icon }]
    }
  };
}

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return children;
}

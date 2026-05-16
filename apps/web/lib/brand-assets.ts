const logoBySlug: Record<string, string> = {
  "vertechie-llc": "/logos/vertechie-logo.jpg",
  vertechie: "/logos/vertechie-logo.jpg",
  "code4u-ai": "/logos/code4u-ai.jpg",
  code4u: "/logos/code4u-ai.jpg",
  "xerobookz": "/logos/xerobookz.jpg",
  "favnfresh": "/logos/favnfresh.jpg",
  "united-bible-hub": "/logos/united-bible-hub.jpg",
  "united-cyber-hub": "/logos/united-cyber-hub.png",
  "united-sap-hub": "/logos/united-sap-hub.jpg"
};

export function fallbackLogoForEntity(input: { name?: string | null; slug?: string | null; portalSlug?: string | null }) {
  const keys = [input.portalSlug, input.slug, input.name].filter(Boolean).map((value) => slugify(String(value)));
  for (const key of keys) {
    if (logoBySlug[key]) return logoBySlug[key];
  }
  return "/logos/vertechie-logo.jpg";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

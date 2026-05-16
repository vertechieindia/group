"use client";

import { useEffect } from "react";

type TenantFaviconProps = {
  logoUrl?: string | null;
};

const defaultIcon = "/logos/vertechie-logo.jpg";

export function TenantFavicon({ logoUrl }: TenantFaviconProps) {
  useEffect(() => {
    const href = logoUrl || defaultIcon;
    setIcon("icon", href);
    setIcon("shortcut icon", href);
    setIcon("apple-touch-icon", href);
  }, [logoUrl]);

  return null;
}

function setIcon(rel: string, href: string) {
  const selector = `link[rel="${rel}"]`;
  let link = document.head.querySelector<HTMLLinkElement>(selector);
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
}

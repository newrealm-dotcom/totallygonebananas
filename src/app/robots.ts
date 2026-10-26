import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/social-image/"],
      disallow: ["/admin", "/profile", "/login", "/api/", "/auth/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}

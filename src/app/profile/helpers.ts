import { headers } from "next/headers";
import { CANONICAL_SITE_URL, siteUrl } from "@/lib/env";
export { plural, shortDate } from "@/lib/format";

/** The site's own origin, from NEXT_PUBLIC_SITE_URL or the current request. */
export async function siteUrlSafe() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return siteUrl();
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000").split(":")[0] ?? "localhost";
  if (host.endsWith(".vercel.app") || host === "vercel.app") return CANONICAL_SITE_URL;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const rawHost = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${rawHost}`;
}

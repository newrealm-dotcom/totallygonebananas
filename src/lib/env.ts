// Public Supabase settings. Both values are safe to expose to the browser;
// Row Level Security in supabase/migrations is what protects the data.
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase settings. Copy .env.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return { url, key };
}

/** Canonical public origin — never a *.vercel.app deployment host. */
export const CANONICAL_SITE_URL = "https://totallygonebananas.com";

function isVercelAppHost(hostname: string): boolean {
  return hostname === "vercel.app" || hostname.endsWith(".vercel.app");
}

/** Public site origin for metadataBase, sitemap, share links, and redirects. */
export function siteUrl() {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  if (configured) {
    try {
      if (isVercelAppHost(new URL(configured).hostname)) return CANONICAL_SITE_URL;
    } catch {
      /* fall through */
    }
    return configured;
  }
  if (process.env.VERCEL_ENV === "production") return CANONICAL_SITE_URL;
  return "http://localhost:3000";
}

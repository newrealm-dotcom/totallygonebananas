import { getSupabaseEnv } from "@/lib/env";

/** Remembers the one published recipe an anonymous browser has opened. */
export const RECIPE_PREVIEW_COOKIE = "tgb_recipe_preview";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG = 60;

export function isRecipeSlug(value: string): boolean {
  return value.length > 0 && value.length <= MAX_SLUG && SLUG.test(value);
}

/** Cookie value when it points at a real slug, otherwise null. */
export function recipePreviewSlugFromCookie(value: string | undefined): string | null {
  if (!value) return null;
  const slug = value.trim().toLowerCase();
  return isRecipeSlug(slug) ? slug : null;
}

/** Path slug for `/recipes/:slug`, ignoring the create-recipe route. */
export function recipeSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/recipes\/([^/]+)$/);
  if (!match) return null;
  let raw = match[1];
  try {
    raw = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const slug = raw.trim().toLowerCase();
  if (slug === "new" || !isRecipeSlug(slug)) return null;
  return slug;
}

export function recipePreviewCookieOptions() {
  return {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}

/** True when this request is a Next.js prefetch, not a visit. */
export function isPrefetchRequest(headerGet: (name: string) => string | null): boolean {
  if (headerGet("next-router-prefetch")) return true;
  if (headerGet("next-router-segment-prefetch")) return true;
  const purpose = `${headerGet("purpose") ?? ""} ${headerGet("sec-purpose") ?? ""}`.toLowerCase();
  return purpose.includes("prefetch");
}

/** Anonymous visitors may open the saved recipe again, or the first one they hit. */
export function anonymousRecipeIsBlocked(savedSlug: string | null, slug: string, signedIn: boolean): boolean {
  if (signedIn) return false;
  return Boolean(savedSlug && savedSlug !== slug);
}

/** Published recipes only, so a typo or draft does not use up the free view. */
export async function isPublishedRecipeSlug(slug: string): Promise<boolean> {
  if (!isRecipeSlug(slug)) return false;
  const { url, key } = getSupabaseEnv();
  const endpoint = new URL("/rest/v1/recipes", url);
  endpoint.searchParams.set("select", "slug");
  endpoint.searchParams.set("slug", `eq.${slug}`);
  endpoint.searchParams.set("status", "eq.published");
  endpoint.searchParams.set("limit", "1");
  try {
    const res = await fetch(endpoint, {
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        accept: "application/json",
      },
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const rows = (await res.json()) as { slug?: string }[];
    return Array.isArray(rows) && rows.some((row) => row.slug === slug);
  } catch {
    return false;
  }
}

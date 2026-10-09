import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";

/** Rebuild at most once an hour so crawlers get a stable, cacheable document. */
export const revalidate = 3600;

type SlugRow = { slug: string; updated_at: string | null; published_at: string | null };

async function fetchAllSlugs(table: "recipes" | "posts"): Promise<SlugRow[]> {
  const supabase = createPublicClient();
  const pageSize = 1000;
  const rows: SlugRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select("slug, updated_at, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`sitemap ${table}: ${error.message}`);
    const batch = (data as SlugRow[] | null) ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

function lastMod(row: Pick<SlugRow, "updated_at" | "published_at">): Date {
  const raw = row.updated_at || row.published_at;
  const d = raw ? new Date(raw) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl().replace(/\/$/, "");
  const now = new Date();

  const [recipes, posts] = await Promise.all([fetchAllSlugs("recipes"), fetchAllSlugs("posts")]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/recipes`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/our-faves`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/policy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const recipePages: MetadataRoute.Sitemap = recipes
    .filter((r) => Boolean(r.slug?.trim()))
    .map((r) => ({
      url: `${base}/recipes/${encodeURI(r.slug)}`,
      lastModified: lastMod(r),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  const postPages: MetadataRoute.Sitemap = posts
    .filter((p) => Boolean(p.slug?.trim()))
    .map((p) => ({
      url: `${base}/blog/${encodeURI(p.slug)}`,
      lastModified: lastMod(p),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  return [...staticPages, ...recipePages, ...postPages];
}

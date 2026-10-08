import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type SlugRow = { slug: string; updated_at: string | null; published_at: string | null };

async function fetchAllSlugs(table: "recipes" | "posts"): Promise<SlugRow[]> {
  const supabase = await createClient();
  const pageSize = 1000;
  const rows: SlugRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data } = await supabase
      .from(table)
      .select("slug, updated_at, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(from, from + pageSize - 1);
    const batch = (data as SlugRow[] | null) ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

function lastMod(row: Pick<SlugRow, "updated_at" | "published_at">): Date {
  const raw = row.updated_at || row.published_at;
  return raw ? new Date(raw) : new Date();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const [recipes, posts] = await Promise.all([fetchAllSlugs("recipes"), fetchAllSlugs("posts")]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/recipes`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/our-faves`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const recipePages: MetadataRoute.Sitemap = recipes.map((r) => ({
    url: `${base}/recipes/${r.slug}`,
    lastModified: lastMod(r),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const postPages: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: lastMod(p),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...recipePages, ...postPages];
}

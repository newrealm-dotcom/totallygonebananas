import { siteUrl } from "@/lib/env";
import { mediaSrc } from "@/lib/media";
import { stripInlineMarkdown } from "@/lib/render-post-markdown";
import { createPublicClient } from "@/lib/supabase/public";

/** Newest items only, so a scheduler's first sync does not replay the whole archive. */
const ITEM_LIMIT = 30;

/** Same caption tags the direct social poster uses. */
const HASHTAGS = "#TotallyGoneBananas #banana #bananarecipes";

export type FeedKind = "recipe" | "post";

interface FeedItem {
  kind: FeedKind;
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  coverPath: string | null;
  publishedAt: string;
}

interface FeedSourceRow {
  slug: string | null;
  title: string | null;
  tags: string[] | null;
  cover_path: string | null;
  published_at: string | null;
  updated_at: string | null;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function plain(value: string | null | undefined): string {
  return stripInlineMarkdown(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

function rfc822(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString();
}

function publishedStamp(row: FeedSourceRow): string | null {
  const raw = row.published_at || row.updated_at;
  if (!raw) return null;
  const time = Date.parse(raw);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

/** JPEG the social networks already accept, or the original cover when the slug cannot use that route. */
function imageFor(item: FeedItem, base: string): { url: string; type: string } | null {
  if (!item.coverPath) return null;
  if (/^[a-z0-9-]{1,120}$/.test(item.slug)) {
    return { url: `${base}/api/social-image/${item.kind}/${item.slug}.jpg`, type: "image/jpeg" };
  }
  const src = mediaSrc(item.coverPath);
  if (!src) return null;
  return { url: src.startsWith("/") ? `${base}${src}` : src, type: "image/jpeg" };
}

function toItem(
  kind: FeedKind,
  row: FeedSourceRow,
  summary: string | null,
): FeedItem | null {
  const slug = row.slug?.trim() ?? "";
  const title = plain(row.title);
  const publishedAt = publishedStamp(row);
  if (!slug || !title || !publishedAt) return null;
  return {
    kind,
    slug,
    title,
    summary: truncate(plain(summary), 500),
    tags: (row.tags ?? []).map((tag) => plain(tag)).filter(Boolean),
    coverPath: row.cover_path,
    publishedAt,
  };
}

async function loadKind(kind: FeedKind): Promise<FeedItem[]> {
  try {
    const supabase = createPublicClient();
    if (kind === "recipe") {
      const { data, error } = await supabase
        .from("recipes")
        .select("slug, title, description, tags, cover_path, published_at, updated_at")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(ITEM_LIMIT);
      if (error) {
        console.error(`rss recipes: ${error.message}`);
        return [];
      }
      return ((data as (FeedSourceRow & { description: string | null })[] | null) ?? [])
        .map((row) => toItem("recipe", row, row.description))
        .filter((item): item is FeedItem => !!item);
    }

    const { data, error } = await supabase
      .from("posts")
      .select("slug, title, excerpt, meta_description, tags, cover_path, published_at, updated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(ITEM_LIMIT);
    if (error) {
      console.error(`rss posts: ${error.message}`);
      return [];
    }
    return ((data as (FeedSourceRow & { excerpt: string | null; meta_description: string | null })[] | null) ?? [])
      .map((row) => toItem("post", row, row.excerpt || row.meta_description))
      .filter((item): item is FeedItem => !!item);
  } catch (err) {
    console.error(`rss ${kind}:`, err);
    return [];
  }
}

function itemXml(item: FeedItem, base: string): string {
  const path = item.kind === "recipe" ? `/recipes/${encodeURI(item.slug)}` : `/blog/${encodeURI(item.slug)}`;
  const link = `${base}${path}`;
  const cta = item.kind === "recipe"
    ? "Get the full recipe at totallygonebananas.com"
    : "Read the full post at totallygonebananas.com";
  const caption = [item.summary, cta, HASHTAGS].filter(Boolean).join("\n\n");
  const image = imageFor(item, base);
  const html = [
    image ? `<p><img src="${xmlEscape(image.url)}" alt="${xmlEscape(item.title)}" /></p>` : "",
    item.summary ? `<p>${xmlEscape(item.summary)}</p>` : "",
    `<p>${xmlEscape(cta)}</p>`,
    `<p>${xmlEscape(HASHTAGS)}</p>`,
    `<p><a href="${xmlEscape(link)}">${xmlEscape(link)}</a></p>`,
  ].filter(Boolean).join("");
  const categories = [item.kind === "recipe" ? "Recipe" : "Blog", ...item.tags]
    .map((category) => `      <category>${xmlEscape(category)}</category>`)
    .join("\n");
  const media = image
    ? [
        `      <enclosure url="${xmlEscape(image.url)}" length="0" type="${image.type}" />`,
        `      <media:content url="${xmlEscape(image.url)}" medium="image" type="${image.type}">`,
        `        <media:title>${xmlEscape(item.title)}</media:title>`,
        `      </media:content>`,
      ].join("\n")
    : "";

  return [
    "    <item>",
    `      <title>${xmlEscape(item.title)}</title>`,
    `      <link>${xmlEscape(link)}</link>`,
    `      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
    `      <pubDate>${rfc822(item.publishedAt)}</pubDate>`,
    `      <description>${xmlEscape(caption)}</description>`,
    `      <content:encoded>${xmlEscape(html)}</content:encoded>`,
    categories,
    media,
    "    </item>",
  ].filter(Boolean).join("\n");
}

/** RSS 2.0 document of the latest published recipes and posts. */
export async function renderRssFeed(kind?: FeedKind | null): Promise<string> {
  const base = siteUrl().replace(/\/$/, "");
  const kinds: FeedKind[] = kind === "recipe" || kind === "post" ? [kind] : ["recipe", "post"];
  const batches = await Promise.all(kinds.map((entry) => loadKind(entry)));
  const items = batches
    .flat()
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, ITEM_LIMIT);

  const self = kind === "recipe" || kind === "post" ? `${base}/feed.xml?kind=${kind}` : `${base}/feed.xml`;
  const title = kind === "recipe"
    ? "Totally Gone Bananas recipes"
    : kind === "post"
      ? "Totally Gone Bananas blog"
      : "Totally Gone Bananas";
  const description = kind === "recipe"
    ? "The latest banana recipes from Totally Gone Bananas."
    : kind === "post"
      ? "The latest stories from Totally Gone Bananas."
      : "The latest banana recipes and stories from Totally Gone Bananas.";
  const newest = items[0]?.publishedAt;

  const body = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">`,
    `  <channel>`,
    `    <title>${xmlEscape(title)}</title>`,
    `    <link>${xmlEscape(base)}</link>`,
    `    <description>${xmlEscape(description)}</description>`,
    `    <language>en-us</language>`,
    `    <lastBuildDate>${newest ? rfc822(newest) : new Date().toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${xmlEscape(self)}" rel="self" type="application/rss+xml" />`,
    `    <image>`,
    `      <url>${xmlEscape(`${base}/logo.png`)}</url>`,
    `      <title>${xmlEscape(title)}</title>`,
    `      <link>${xmlEscape(base)}</link>`,
    `    </image>`,
    items.map((item) => itemXml(item, base)).join("\n"),
    `  </channel>`,
    `</rss>`,
  ].filter(Boolean).join("\n");

  return `${body}\n`;
}

import { renderRssFeed, type FeedKind } from "@/lib/rss-feed";

function kindFrom(request: Request): FeedKind | null {
  const kind = new URL(request.url).searchParams.get("kind");
  return kind === "recipe" || kind === "post" ? kind : null;
}

/** Public RSS feed for schedulers: https://totallygonebananas.com/feed.xml */
export async function GET(request: Request) {
  const xml = await renderRssFeed(kindFrom(request));
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  countPosts,
  getBlogCategories,
  getProfileByUsernameOrId,
  listPosts,
} from "@/lib/queries";
import { shortDate } from "@/lib/format";
import { isValidTag, normalizeTag } from "@/lib/tags";
import { BlogInfiniteGrid } from "@/components/BlogInfiniteGrid";
import { FilterPillsScroller } from "@/components/FilterPillsScroller";
import { FlipCounter } from "@/components/FlipCounter";

export const metadata: Metadata = {
  title: "Bananas in the Wild",
  description:
    "Welcome to the archive, where every post we've ever written about bananas lives in one place.",
};

const INITIAL_LIMIT = 12;
const FAVORITES_CATEGORY = "favorites";
const ARCHIVE_LEDE =
  "History, weird science, botanical oddities, and banana lore — pick a topic or dive into the latest story.";

export default async function BlogPage({ searchParams }: PageProps<"/blog">) {
  const sp = await searchParams;
  const author = typeof sp.author === "string" ? sp.author.trim() : "";
  const category = typeof sp.category === "string" ? sp.category.trim() : "";
  const date = typeof sp.date === "string" ? sp.date.trim() : "";
  const rawTag = typeof sp.tag === "string" ? sp.tag.trim() : "";
  const tag = rawTag && isValidTag(rawTag) ? normalizeTag(rawTag) : "";
  if (category === FAVORITES_CATEGORY) redirect("/our-faves");

  const filters = {
    ...(author ? { author } : {}),
    ...(category ? { category } : {}),
    ...(date ? { date } : {}),
    ...(tag ? { tag } : {}),
    // Favorites live on /our-faves — never list them in the archive.
    excludeCategory: FAVORITES_CATEGORY,
  };
  const filtered = Boolean(author || category || date || tag);

  const [posts, total, blogCategories, authorProfile] = await Promise.all([
    listPosts({ publishedOnly: true, limit: INITIAL_LIMIT, offset: 0, ...filters }),
    countPosts({ publishedOnly: true, ...filters }),
    getBlogCategories(),
    author ? getProfileByUsernameOrId(author) : Promise.resolve(null),
  ]);

  const browseCategories = blogCategories.filter((c) => c.id !== FAVORITES_CATEGORY);
  const categoryName = category
    ? blogCategories.find((c) => c.id === category)?.name ?? category
    : null;
  const authorLabel = authorProfile?.display_name || authorProfile?.username || author || null;
  const dateLabel = date && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? shortDate(`${date}T16:00:00.000Z`)
    : date || null;

  let heading = "Bananas in the Wild";
  let lede = ARCHIVE_LEDE;
  if (author && authorLabel) {
    heading = `Posts by ${authorLabel}`;
    lede = `Published posts from ${authorLabel}.`;
  } else if (category && categoryName) {
    heading = categoryName;
    lede = `Stories filed under ${categoryName}.`;
  } else if (tag) {
    heading = `Tagged “${tag}”`;
    lede = `Posts marked with the ${tag} tag.`;
  } else if (date && dateLabel) {
    heading = `Posts from ${dateLabel}`;
    lede = `Everything published on ${dateLabel} (Eastern Time).`;
  }

  const categoryNames = Object.fromEntries(blogCategories.map((c) => [c.id, c.name]));

  return (
    <div className="wrap blog-index">
      <header className="blog-archive-hero">
        <p className="blog-archive-kicker" aria-hidden="true">The archive</p>
        <h1>{heading}</h1>
        <p className="lede">{lede}</p>
        {!filtered && total > 0 ? (
          <p className="blog-archive-count">
            <span className="sr">
              {total} {total === 1 ? "story" : "stories"} waiting to be peeled open
            </span>
            <span aria-hidden="true" className="blog-archive-count-visual">
              <FlipCounter value={total} persistKey="blog-archive-story-count" />
              <span className="blog-archive-count-label">
                {total === 1 ? "story" : "stories"} waiting to be peeled open
              </span>
            </span>
          </p>
        ) : null}
        {browseCategories.length > 0 && !author && !date ? (
          <div className="blog-topic-row">
            <span className="blog-topic-label">Categories:</span>
            <FilterPillsScroller label="categories">
              <nav className="blog-topic-nav" aria-label="Browse by topic">
                <Link
                  className="blog-topic"
                  href="/blog"
                  aria-current={!category ? "page" : undefined}
                >
                  All stories
                </Link>
                {browseCategories.map((c) => (
                  <Link
                    key={c.id}
                    className="blog-topic"
                    href={`/blog?category=${encodeURIComponent(c.id)}`}
                    aria-current={category === c.id ? "page" : undefined}
                  >
                    {c.name}
                  </Link>
                ))}
              </nav>
            </FilterPillsScroller>
          </div>
        ) : null}
        {filtered ? (
          <p className="blog-archive-reset">
            <Link className="btn ghost small" href="/blog">View all posts</Link>
          </p>
        ) : null}
      </header>

      {posts.length === 0 ? (
        <div className="empty">
          <p>{filtered ? "No posts match this filter." : "No posts yet. Check back soon."}</p>
          {filtered ? <Link className="btn" href="/blog">Back to the archive</Link> : null}
        </div>
      ) : (
        <BlogInfiniteGrid
          key={`${filters.author ?? ""}|${filters.category ?? ""}|${filters.date ?? ""}|${filters.tag ?? ""}|${filters.excludeCategory ?? ""}`}
          initialPosts={posts}
          total={total}
          filters={filters}
          showFeatured={!filtered}
          categoryNames={categoryNames}
          showDates={false}
        />
      )}
      <div style={{ height: "3rem" }} />
    </div>
  );
}

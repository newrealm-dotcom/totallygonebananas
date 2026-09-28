import type { Metadata } from "next";
import Link from "next/link";
import {
  countPosts,
  getBlogCategories,
  getProfileByUsernameOrId,
  listPosts,
} from "@/lib/queries";
import { shortDate } from "@/lib/format";
import { BlogInfiniteGrid } from "@/components/BlogInfiniteGrid";

export const metadata: Metadata = {
  title: "Bananas in the Wild",
  description:
    "Welcome to the archive, where every post we've ever written about bananas lives in one place.",
};

const INITIAL_LIMIT = 12;
const ARCHIVE_LEDE =
  "Welcome to the archive, where every post we've ever written about bananas lives in one place. Some of it is history, like how the banana made its way from Southeast Asia to nearly every grocery store on the planet, or why the variety your grandparents ate tasted different from the one you buy today. Some of it is trivia you'll want to bring up at dinner, such as the fact that bananas are technically berries and the plants they grow on are technically herbs. And some of it is just fun and weird banana-themed gadgets, and the occasional deep dive into why a banana peel became the universal symbol for slipping. Poke around, start wherever looks interesting, and don't worry about reading in order. There's no wrong way to peel this thing.";

export default async function BlogPage({ searchParams }: PageProps<"/blog">) {
  const sp = await searchParams;
  const author = typeof sp.author === "string" ? sp.author.trim() : "";
  const category = typeof sp.category === "string" ? sp.category.trim() : "";
  const date = typeof sp.date === "string" ? sp.date.trim() : "";
  const filters = {
    ...(author ? { author } : {}),
    ...(category ? { category } : {}),
    ...(date ? { date } : {}),
  };
  const filtered = Boolean(author || category || date);

  const [posts, total, blogCategories, authorProfile] = await Promise.all([
    listPosts({ publishedOnly: true, limit: INITIAL_LIMIT, offset: 0, ...filters }),
    countPosts({ publishedOnly: true, ...filters }),
    category ? getBlogCategories() : Promise.resolve([]),
    author ? getProfileByUsernameOrId(author) : Promise.resolve(null),
  ]);

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
    heading = `Category: ${categoryName}`;
    lede = `Blog posts filed under ${categoryName}.`;
  } else if (date && dateLabel) {
    heading = `Posts from ${dateLabel}`;
    lede = `Everything published on ${dateLabel} (Eastern Time).`;
  }

  return (
    <div className="wrap blog-index">
      <div className="page-head">
        <h1>{heading}</h1>
        <p className="lede">{lede}</p>
        {filtered ? (
          <p><Link className="btn ghost small" href="/blog">View all posts</Link></p>
        ) : null}
      </div>
      {posts.length === 0 ? (
        <div className="empty">
          <p>{filtered ? "No posts match this filter." : "No posts yet. Check back soon."}</p>
          {filtered ? <Link className="btn" href="/blog">Back to the archive</Link> : null}
        </div>
      ) : (
        <BlogInfiniteGrid
          key={`${filters.author ?? ""}|${filters.category ?? ""}|${filters.date ?? ""}`}
          initialPosts={posts}
          total={total}
          filters={filters}
        />
      )}
      <div style={{ height: "3rem" }} />
    </div>
  );
}

import type { Metadata } from "next";
import { countPosts, listPosts } from "@/lib/queries";
import { BlogInfiniteGrid } from "@/components/BlogInfiniteGrid";

export const metadata: Metadata = {
  title: "Bananas in the Wild",
  description:
    "Welcome to the archive, where every post we've ever written about bananas lives in one place.",
};

const INITIAL_LIMIT = 12;

export default async function BlogPage() {
  const [posts, total] = await Promise.all([
    listPosts({ publishedOnly: true, limit: INITIAL_LIMIT, offset: 0 }),
    countPosts({ publishedOnly: true }),
  ]);

  return (
    <div className="wrap blog-index">
      <div className="page-head">
        <h1>Bananas in the Wild</h1>
        <p className="lede">
          Welcome to the archive, where every post we&apos;ve ever written about bananas lives in one place. Some of it is history, like how the banana made its way from Southeast Asia to nearly every grocery store on the planet, or why the variety your grandparents ate tasted different from the one you buy today. Some of it is trivia you&apos;ll want to bring up at dinner, such as the fact that bananas are technically berries and the plants they grow on are technically herbs. And some of it is just fun and weird banana-themed gadgets, and the occasional deep dive into why a banana peel became the universal symbol for slipping. Poke around, start wherever looks interesting, and don&apos;t worry about reading in order. There&apos;s no wrong way to peel this thing.
        </p>
      </div>
      {posts.length === 0 ? (
        <div className="empty"><p>No posts yet. Check back soon.</p></div>
      ) : (
        <BlogInfiniteGrid initialPosts={posts} total={total} />
      )}
      <div style={{ height: "3rem" }} />
    </div>
  );
}

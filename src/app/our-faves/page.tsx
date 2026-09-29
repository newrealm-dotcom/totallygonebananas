import type { Metadata } from "next";
import { countPosts, getBlogCategories, listPosts } from "@/lib/queries";
import { BlogInfiniteGrid } from "@/components/BlogInfiniteGrid";

export const metadata: Metadata = {
  title: "Our Faves",
  description: "Hand-picked favorite banana-inspired pieces from Totally Gone Bananas.",
};

const FAVORITES_CATEGORY = "favorites";
const INITIAL_LIMIT = 12;

export default async function OurFavesPage() {
  const filters = { category: FAVORITES_CATEGORY };
  const [posts, total, blogCategories] = await Promise.all([
    listPosts({ publishedOnly: true, ...filters, limit: INITIAL_LIMIT, offset: 0 }),
    countPosts({ publishedOnly: true, ...filters }),
    getBlogCategories(),
  ]);
  const categoryNames = Object.fromEntries(blogCategories.map((c) => [c.id, c.name]));

  return (
    <div className="wrap our-faves-page">
      <header className="blog-archive-hero">
        <h1>Our Faves</h1>
        <p className="lede">
          Can&apos;t get enough of the banana? We&apos;ve rounded up our favorite banana-inspired pieces in one place,
          so go take a look and find the one that makes you smile.
        </p>
      </header>
      {posts.length === 0 ? (
        <div className="empty">
          <p>No favorites yet. Check back soon.</p>
        </div>
      ) : (
        <BlogInfiniteGrid
          initialPosts={posts}
          total={total}
          filters={filters}
          showFeatured
          categoryNames={categoryNames}
          featuredLabel="Featured fave"
          moreHeading="More faves"
          moreHint="Pick a card and keep peeling"
        />
      )}
      <div style={{ height: "3rem" }} />
    </div>
  );
}

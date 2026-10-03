import type { Metadata } from "next";
import Image from "next/image";
import { countPosts, getBlogCategories, listPosts, pickRandomPost } from "@/lib/queries";
import { FavesGrid } from "@/components/FavesGrid";

export const metadata: Metadata = {
  title: "Our Faves",
  description: "Hand-picked favorite banana-inspired pieces from Totally Gone Bananas.",
};

/** Fresh random featured fave on each visit. */
export const dynamic = "force-dynamic";

const FAVORITES_CATEGORY = "favorites";
const INITIAL_LIMIT = 12;

export default async function OurFavesPage() {
  const filters = { category: FAVORITES_CATEGORY };
  const [posts, total, blogCategories, featuredPost] = await Promise.all([
    listPosts({ publishedOnly: true, ...filters, limit: INITIAL_LIMIT, offset: 0 }),
    countPosts({ publishedOnly: true, ...filters }),
    getBlogCategories(),
    pickRandomPost({ publishedOnly: true, ...filters }),
  ]);
  const categoryNames = Object.fromEntries(blogCategories.map((c) => [c.id, c.name]));

  return (
    <div className="wrap our-faves-page">
      <header className="faves-hero">
        <div className="faves-hero-copy">
          <p className="blog-archive-kicker">Hand-picked</p>
          <h1>Our Faves</h1>
          <p className="lede">
            Banana-inspired things we actually like — snacks, scents, gadgets, and little luxuries, all in one place.
          </p>
          {posts.length > 0 ? (
            <a className="btn" href="#faves-feed">Browse the picks</a>
          ) : null}
        </div>
        <div className="faves-hero-mascot">
          <Image
            src="/images/character-faves.webp"
            alt=""
            width={720}
            height={900}
            priority
            sizes="(max-width: 900px) 240px, 48vw"
          />
        </div>
      </header>
      {posts.length === 0 ? (
        <div className="empty">
          <p>No favorites yet. Check back soon.</p>
        </div>
      ) : (
        <div id="faves-feed">
          <FavesGrid
            initialPosts={posts}
            total={total}
            featuredPost={featuredPost}
            categoryNames={categoryNames}
          />
        </div>
      )}
      <div style={{ height: "3rem" }} />
    </div>
  );
}

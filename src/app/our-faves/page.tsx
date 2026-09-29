import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { listPosts } from "@/lib/queries";
import { shortDate } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { stripInlineMarkdown } from "@/lib/render-post-markdown";

export const metadata: Metadata = {
  title: "Our Faves",
  description: "Hand-picked favorite banana-inspired pieces from Totally Gone Bananas.",
};

const FAVORITES_CATEGORY = "favorites";

export default async function OurFavesPage() {
  const posts = await listPosts({
    publishedOnly: true,
    category: FAVORITES_CATEGORY,
    limit: 60,
    offset: 0,
  });

  return (
    <div className="wrap our-faves-page">
      <div className="page-head">
        <h1>Our Faves</h1>
        <p className="lede">
          Can&apos;t get enough of the banana? We&apos;ve rounded up our favorite banana-inspired pieces in one place,
          so go take a look and find the one that makes you smile.
        </p>
      </div>
      {posts.length === 0 ? (
        <div className="empty">
          <p>No favorites yet. Check back soon.</p>
        </div>
      ) : (
        <ul className="blog-grid home-blog-grid">
          {posts.map((p) => {
            const cover = mediaSrc(p.cover_path);
            return (
              <li key={p.id} className="blog-card">
                {cover ? (
                  <Link href={`/blog/${p.slug}`} className="blog-card-media" tabIndex={-1} aria-hidden>
                    <Image src={cover} alt="" width={640} height={360} unoptimized />
                  </Link>
                ) : (
                  <Link href={`/blog/${p.slug}`} className="blog-card-media blog-card-media-ph" tabIndex={-1} aria-hidden />
                )}
                <div className="blog-card-body">
                  <h3><Link href={`/blog/${p.slug}`}>{stripInlineMarkdown(p.title)}</Link></h3>
                  {p.excerpt ? <p>{stripInlineMarkdown(p.excerpt)}</p> : null}
                  {p.published_at ? <p className="muted">{shortDate(p.published_at)}</p> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div style={{ height: "3rem" }} />
    </div>
  );
}

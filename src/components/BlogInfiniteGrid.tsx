"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { shortDate } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { stripInlineMarkdown } from "@/lib/render-post-markdown";
import type { Post } from "@/lib/types";

const PAGE_SIZE = 12;

function categoryLabel(post: Post, names?: Record<string, string>): string | null {
  const id = post.categories?.find((c) => c && c !== "favorites");
  if (!id) return null;
  return names?.[id] ?? id;
}

function PostCard({
  post,
  categoryNames,
  featured = false,
  featuredLabel = "Latest story",
}: {
  post: Post;
  categoryNames?: Record<string, string>;
  featured?: boolean;
  featuredLabel?: string;
}) {
  const cover = mediaSrc(post.cover_path);
  const topic = categoryLabel(post, categoryNames);
  const title = stripInlineMarkdown(post.title);
  const excerpt = post.excerpt ? stripInlineMarkdown(post.excerpt) : null;
  const href = `/blog/${post.slug}`;

  if (featured) {
    return (
      <article className="blog-featured">
        <Link href={href} className="blog-featured-media" tabIndex={-1} aria-hidden>
          {cover ? (
            <Image src={cover} alt="" width={1200} height={675} unoptimized priority />
          ) : (
            <span className="blog-card-media-ph blog-featured-ph" />
          )}
        </Link>
        <div className="blog-featured-copy">
          <p className="blog-featured-label">{featuredLabel}</p>
          {topic ? <p className="blog-card-topic">{topic}</p> : null}
          <h2><Link href={href}>{title}</Link></h2>
          {excerpt ? <p className="blog-featured-excerpt">{excerpt}</p> : null}
          <div className="blog-featured-meta">
            {post.published_at ? <span>{shortDate(post.published_at)}</span> : null}
            <Link className="btn blog-read-cta" href={href}>Read the story</Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <li className="blog-card">
      {cover ? (
        <Link href={href} className="blog-card-media" tabIndex={-1} aria-hidden>
          <Image src={cover} alt="" width={640} height={360} unoptimized />
        </Link>
      ) : (
        <Link href={href} className="blog-card-media blog-card-media-ph" tabIndex={-1} aria-hidden />
      )}
      <div className="blog-card-body">
        {topic ? <p className="blog-card-topic">{topic}</p> : null}
        <h2><Link href={href}>{title}</Link></h2>
        {excerpt ? <p>{excerpt}</p> : null}
        <div className="blog-card-foot">
          {post.published_at ? <p className="muted">{shortDate(post.published_at)}</p> : <span />}
          <Link className="blog-card-read" href={href}>Read</Link>
        </div>
      </div>
    </li>
  );
}

export function BlogInfiniteGrid({
  initialPosts,
  total,
  filters = {},
  showFeatured = false,
  featuredPost = null,
  categoryNames,
  featuredLabel = "Latest story",
  moreHeading = "More from the archive",
  moreHint = "Pick a card and keep peeling",
}: {
  initialPosts: Post[];
  total: number;
  filters?: { author?: string; category?: string; date?: string; excludeCategory?: string };
  showFeatured?: boolean;
  /** When set, this post is featured instead of the first item in `initialPosts`. */
  featuredPost?: Post | null;
  categoryNames?: Record<string, string>;
  featuredLabel?: string;
  moreHeading?: string;
  moreHint?: string;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(initialPosts.length < total);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const featured =
    featuredPost ??
    (showFeatured && posts.length > 0 ? posts[0] : null);
  const gridPosts = featured ? posts.filter((p) => p.id !== featured.id) : posts;

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const q = new URLSearchParams({
        offset: String(posts.length),
        limit: String(PAGE_SIZE),
      });
      if (filters.author) q.set("author", filters.author);
      if (filters.category) q.set("category", filters.category);
      if (filters.date) q.set("date", filters.date);
      if (filters.excludeCategory) q.set("excludeCategory", filters.excludeCategory);
      const res = await fetch(`/api/posts?${q}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as { posts: Post[]; hasMore: boolean };
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...data.posts.filter((p) => !seen.has(p.id))];
      });
      setHasMore(data.hasMore);
    } catch {
      /* keep hasMore so the sentinel can retry */
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [filters.author, filters.category, filters.date, filters.excludeCategory, hasMore, posts.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div className="blog-feed">
      {featured ? (
        <PostCard
          post={featured}
          categoryNames={categoryNames}
          featured
          featuredLabel={featuredLabel}
        />
      ) : null}
      {gridPosts.length > 0 ? (
        <>
          {featured ? (
            <div className="blog-more-head">
              <h2>{moreHeading}</h2>
              {moreHint ? <p className="blog-more-hint">{moreHint}</p> : null}
            </div>
          ) : null}
          <ul className={`blog-grid home-blog-grid${featured ? " blog-grid-rest" : ""}`}>
            {gridPosts.map((p) => (
              <PostCard key={p.id} post={p} categoryNames={categoryNames} />
            ))}
          </ul>
        </>
      ) : null}
      {hasMore ? <div ref={sentinelRef} className="blog-feed-sentinel" aria-hidden="true" /> : null}
      {loading ? <p className="hint blog-feed-status" role="status">Loading more posts…</p> : null}
      {!hasMore && posts.length > PAGE_SIZE ? (
        <p className="hint blog-feed-status">That&apos;s every post for now.</p>
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { mediaSrc } from "@/lib/media";
import { stripInlineMarkdown } from "@/lib/render-post-markdown";
import type { Post } from "@/lib/types";

/** 3 rows × 3 columns per page after the featured spot. */
const PAGE_SIZE = 9;

function categoryLabel(post: Post, names?: Record<string, string>): string | null {
  const id = post.categories?.find((c) => c && c !== "favorites");
  if (!id) return null;
  return names?.[id] ?? id;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function FaveSpot({ post, categoryNames }: { post: Post; categoryNames?: Record<string, string> }) {
  const cover = mediaSrc(post.cover_path);
  const topic = categoryLabel(post, categoryNames);
  const title = stripInlineMarkdown(post.title);
  const excerpt = post.excerpt ? stripInlineMarkdown(post.excerpt) : null;
  const href = `/blog/${post.slug}`;

  return (
    <article className="faves-spot">
      <Link href={href} className="faves-spot-media" tabIndex={-1} aria-hidden>
        {cover ? (
          <Image src={cover} alt="" width={1200} height={900} unoptimized priority />
        ) : (
          <span className="faves-media-ph" />
        )}
      </Link>
      <div className="faves-spot-copy">
        <p className="faves-spot-index" aria-hidden="true">{pad(1)}</p>
        <p className="faves-spot-label">Start here</p>
        {topic ? <p className="blog-card-topic">{topic}</p> : null}
        <h2><Link href={href}>{title}</Link></h2>
        {excerpt ? <p className="faves-spot-excerpt">{excerpt}</p> : null}
        <Link className="btn blog-read-cta" href={href}>Read the story</Link>
      </div>
    </article>
  );
}

function FaveTile({
  post,
  index,
  categoryNames,
}: {
  post: Post;
  index: number;
  categoryNames?: Record<string, string>;
}) {
  const cover = mediaSrc(post.cover_path);
  const topic = categoryLabel(post, categoryNames);
  const title = stripInlineMarkdown(post.title);
  const href = `/blog/${post.slug}`;

  return (
    <li className="faves-tile">
      <Link href={href} className="faves-tile-media" tabIndex={-1} aria-hidden>
        {cover ? (
          <Image src={cover} alt="" width={800} height={600} unoptimized />
        ) : (
          <span className="faves-media-ph" />
        )}
        <span className="faves-tile-index" aria-hidden="true">{pad(index)}</span>
      </Link>
      <div className="faves-tile-copy">
        {topic ? <p className="blog-card-topic">{topic}</p> : null}
        <h2><Link href={href}>{title}</Link></h2>
        <Link className="blog-card-read" href={href}>Read</Link>
      </div>
    </li>
  );
}

export function FavesGrid({
  initialPosts,
  total,
  featuredPost,
  categoryNames,
}: {
  initialPosts: Post[];
  total: number;
  featuredPost: Post | null;
  categoryNames?: Record<string, string>;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(initialPosts.length < total);
  const [loading, setLoading] = useState(false);
  /** After the first Load more click, further pages load via infinite scroll. */
  const [scrollEnabled, setScrollEnabled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const featured = featuredPost ?? posts[0] ?? null;
  const rest = featured ? posts.filter((p) => p.id !== featured.id) : posts;

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const q = new URLSearchParams({
        offset: String(posts.length),
        limit: String(PAGE_SIZE),
        category: "favorites",
      });
      const res = await fetch(`/api/posts?${q}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as { posts: Post[]; hasMore: boolean };
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...data.posts.filter((p) => !seen.has(p.id))];
      });
      setHasMore(data.hasMore);
    } catch {
      /* keep hasMore so the sentinel / button can retry */
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore, posts.length]);

  useEffect(() => {
    if (!scrollEnabled) return;
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
  }, [hasMore, loadMore, scrollEnabled]);

  async function onLoadMoreClick() {
    await loadMore();
    setScrollEnabled(true);
  }

  if (!featured) return null;

  return (
    <div className="faves-feed">
      <FaveSpot post={featured} categoryNames={categoryNames} />
      {rest.length > 0 ? (
        <ul className="faves-grid">
          {rest.map((p, i) => (
            <FaveTile key={p.id} post={p} index={i + 2} categoryNames={categoryNames} />
          ))}
        </ul>
      ) : null}
      {hasMore && !scrollEnabled ? (
        <div className="faves-feed-more">
          <button type="button" className="btn dark" disabled={loading} onClick={() => void onLoadMoreClick()}>
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
      {scrollEnabled && hasMore ? (
        <div ref={sentinelRef} className="blog-feed-sentinel" aria-hidden="true" />
      ) : null}
      {scrollEnabled && loading ? (
        <p className="hint blog-feed-status" role="status">Loading more faves…</p>
      ) : null}
    </div>
  );
}

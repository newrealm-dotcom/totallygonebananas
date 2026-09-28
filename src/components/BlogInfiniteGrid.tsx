"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { shortDate } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { stripInlineMarkdown } from "@/lib/render-post-markdown";
import type { Post } from "@/lib/types";

const PAGE_SIZE = 12;

export function BlogInfiniteGrid({
  initialPosts,
  total,
}: {
  initialPosts: Post[];
  total: number;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(initialPosts.length < total);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const q = new URLSearchParams({
        offset: String(posts.length),
        limit: String(PAGE_SIZE),
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
      /* keep hasMore so the sentinel can retry */
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore, posts.length]);

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
                <h2><Link href={`/blog/${p.slug}`}>{stripInlineMarkdown(p.title)}</Link></h2>
                {p.excerpt ? <p>{stripInlineMarkdown(p.excerpt)}</p> : null}
                {p.published_at ? <p className="muted">{shortDate(p.published_at)}</p> : null}
              </div>
            </li>
          );
        })}
      </ul>
      {hasMore ? <div ref={sentinelRef} className="blog-feed-sentinel" aria-hidden="true" /> : null}
      {loading ? <p className="hint blog-feed-status" role="status">Loading more posts…</p> : null}
      {!hasMore && posts.length > PAGE_SIZE ? (
        <p className="hint blog-feed-status">That&apos;s every post for now.</p>
      ) : null}
    </div>
  );
}

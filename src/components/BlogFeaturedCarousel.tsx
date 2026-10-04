"use client";

import { useCallback, useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { mediaSrc } from "@/lib/media";
import { stripInlineMarkdown } from "@/lib/render-post-markdown";
import type { Post } from "@/lib/types";

function topicLabel(post: Post, names?: Record<string, string>): string | null {
  const id = post.categories?.find((c) => c && c !== "favorites");
  if (!id) return null;
  return names?.[id] ?? id;
}

function wrapIndex(i: number, n: number): number {
  return ((i % n) + n) % n;
}

function relativeOffset(i: number, active: number, n: number): number {
  let d = i - active;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

export function BlogFeaturedCarousel({
  posts,
  categoryNames,
}: {
  posts: Post[];
  categoryNames?: Record<string, string>;
}) {
  const labelId = useId();
  const [index, setIndex] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const n = posts.length;

  const go = useCallback(
    (next: number) => {
      if (n < 2) return;
      setIndex(wrapIndex(next, n));
    },
    [n],
  );

  if (n === 0) return null;

  const activeIndex = wrapIndex(index, n);

  const visibleSlides = posts
    .map((post, i) => {
      const offset = n === 1 ? 0 : relativeOffset(i, activeIndex, n);
      return { post, i, offset, abs: Math.abs(offset) };
    })
    .filter((slide) => slide.abs <= 2)
    .sort((a, b) => a.offset - b.offset);

  return (
    <section className="blog-coverflow-wrap" aria-labelledby={labelId}>
      <h2 id={labelId} className="sr">Featured stories</h2>
      <div
        className="blog-coverflow"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            go(index - 1);
          }
          if (e.key === "ArrowRight") {
            e.preventDefault();
            go(index + 1);
          }
        }}
        onTouchStart={(e) => setTouchX(e.changedTouches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (touchX == null) return;
          const x = e.changedTouches[0]?.clientX ?? touchX;
          const delta = x - touchX;
          if (delta > 40) go(index - 1);
          if (delta < -40) go(index + 1);
          setTouchX(null);
        }}
      >
        {n > 1 ? (
          <button
            type="button"
            className="blog-coverflow-nav prev"
            aria-label="Previous story"
            onClick={() => go(index - 1)}
          >
            ‹
          </button>
        ) : null}
        {visibleSlides.map(({ post, i, offset, abs }) => {
          const cover = mediaSrc(post.cover_path);
          const title = stripInlineMarkdown(post.title);
          const topic = topicLabel(post, categoryNames);
          const active = offset === 0;
          const href = `/blog/${post.slug}`;
          const band =
            abs === 0 ? "is-active" : abs === 1 ? "is-near" : "is-far";
          return (
            <article
              key={post.id}
              className={`blog-coverflow-slide ${band}`}
            >
              {active ? (
                <Link
                  href={href}
                  className="blog-coverflow-link"
                  aria-label={`${title} — READ MORE`}
                >
                  {cover ? (
                    <Image src={cover} alt="" width={1200} height={675} unoptimized priority={i === 0} />
                  ) : (
                    <span className="blog-coverflow-ph" />
                  )}
                  <span className="blog-coverflow-shade" aria-hidden="true" />
                  <span className="blog-coverflow-copy" aria-hidden="true">
                    {topic ? <span className="blog-coverflow-topic">{topic}</span> : null}
                    <span className="blog-coverflow-title">{title}</span>
                    <span className="blog-coverflow-cta">READ MORE</span>
                  </span>
                </Link>
              ) : (
                <button
                  type="button"
                  className="blog-coverflow-peek"
                  aria-label={`Show ${title}`}
                  onClick={() => go(i)}
                >
                  {cover ? (
                    <Image src={cover} alt="" width={640} height={800} unoptimized />
                  ) : (
                    <span className="blog-coverflow-ph" />
                  )}
                </button>
              )}
            </article>
          );
        })}
        {n > 1 ? (
          <button
            type="button"
            className="blog-coverflow-nav next"
            aria-label="Next story"
            onClick={() => go(index + 1)}
          >
            ›
          </button>
        ) : null}
      </div>
    </section>
  );
}

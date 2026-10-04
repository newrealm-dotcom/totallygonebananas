import Image from "next/image";
import Link from "next/link";
import { mediaSrc } from "@/lib/media";
import { stripInlineMarkdown } from "@/lib/render-post-markdown";
import type { Post } from "@/lib/types";

export function postCoverTopic(post: Post, names?: Record<string, string>): string | null {
  const ids = post.categories ?? [];
  const id = ids.find((c) => c && c !== "favorites") ?? ids.find((c) => Boolean(c)) ?? null;
  if (!id) return null;
  if (id === "favorites") return names?.[id] ?? "Favorites";
  return names?.[id] ?? id;
}

export function BlogCoverCard({
  post,
  categoryNames,
}: {
  post: Post;
  categoryNames?: Record<string, string>;
}) {
  const cover = mediaSrc(post.cover_path);
  const topic = postCoverTopic(post, categoryNames);
  const title = stripInlineMarkdown(post.title);
  const excerpt = post.excerpt ? stripInlineMarkdown(post.excerpt) : null;
  const href = `/blog/${post.slug}`;

  return (
    <li className="blog-cover-card">
      <Link href={href} className="blog-cover-card-link" aria-label={title}>
        {cover ? (
          <Image src={cover} alt="" width={800} height={600} unoptimized />
        ) : (
          <span className="blog-cover-card-ph" />
        )}
        <span className="blog-cover-card-shade" aria-hidden="true" />
        <span className="blog-cover-card-copy" aria-hidden="true">
          <span className="blog-cover-card-title">{title}</span>
          {topic ? <span className="blog-cover-card-topic">{topic}</span> : null}
          {excerpt ? <span className="blog-cover-card-excerpt">{excerpt}</span> : null}
        </span>
      </Link>
    </li>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getBlogCategories, getPostBySlug, getViewer, isEditorRole, listApprovedPostComments, listRelatedPosts } from "@/lib/queries";
import { easternDateKey, longDate } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { BlogCoverCard } from "@/components/BlogCoverCard";
import { HtmlWithScripts } from "@/components/HtmlWithScripts";
import { PostCommentForm } from "@/components/PostCommentForm";
import { renderPostMarkdown } from "@/lib/render-post-markdown";

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || (post.status !== "published" && !(await getViewer()).profile)) return { title: "Post" };
  return {
    title: post.seo_title || post.title,
    description: post.meta_description || post.excerpt || undefined,
  };
}

function headJsonScript(value: unknown): string | null {
  if (value === null || typeof value !== "object") return null;
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const [{ profile }, blogCategories, comments] = await Promise.all([
    getViewer(),
    getBlogCategories(),
    listApprovedPostComments(post.id),
  ]);
  const editor = isEditorRole(profile);
  if (post.status !== "published" && !editor) notFound();

  const isFavorite = (post.categories ?? []).includes("favorites");
  const related = await listRelatedPosts({
    excludeId: post.id,
    authorId: post.author_id,
    limit: 3,
    ...(isFavorite
      ? { category: "favorites" }
      : { excludeCategory: "favorites" }),
  });

  const cover = mediaSrc(post.cover_path);
  const bodyHtml = renderPostMarkdown(post.body);
  const headJson = headJsonScript(post.head_json);
  const categoryNames = Object.fromEntries(blogCategories.map((c) => [c.id, c.name]));
  const authorName = post.author?.display_name || "Totally Gone Bananas";
  const authorHref = post.author_id
    ? `/blog?author=${encodeURIComponent(post.author?.username || post.author_id)}`
    : null;
  const dateHref = post.published_at
    ? `/blog?date=${encodeURIComponent(easternDateKey(post.published_at))}`
    : null;
  const sectionHref = isFavorite ? "/our-faves" : "/blog";
  const sectionLabel = isFavorite ? "Our Faves" : "Blog";

  return (
    <>
      <article className="wrap blog-post">
        {headJson ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: headJson }}
          />
        ) : null}
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="crumbs-sep" aria-hidden="true">/</span>
          <Link href={sectionHref}>{sectionLabel}</Link>
          <span className="crumbs-sep" aria-hidden="true">/</span>
          <span className="crumbs-current">{post.title}</span>
        </nav>
        <header className="page-head">
          {post.status === "draft" && <p className="status s-draft">Draft — only editors can see this</p>}
          <h1>{post.title}</h1>
          <p className="blog-byline">
            <span className="blog-byline-item">
              <strong>Date:</strong>{" "}
              {dateHref && post.published_at ? (
                <Link href={dateHref}>{longDate(post.published_at)}</Link>
              ) : (
                <span>—</span>
              )}
            </span>
            <span className="blog-byline-item">
              <strong>Author:</strong>{" "}
              {authorHref ? <Link href={authorHref}>{authorName}</Link> : <span>{authorName}</span>}
            </span>
          </p>
          {editor ? (
            <p className="blog-post-edit">
              <Link className="btn small ghost" href={`/admin/posts/${post.id}/edit`}>Edit in admin</Link>
            </p>
          ) : null}
        </header>
        {cover ? (
          <div className="blog-hero">
            <Image src={cover} alt="" width={1200} height={675} unoptimized priority />
          </div>
        ) : null}
        <HtmlWithScripts className="blog-body" html={bodyHtml} />
        <div className="blog-post-affiliate">
          <a
            target="_blank"
            rel="noopener noreferrer sponsored"
            href="https://click.linksynergy.com/fs-bin/click?id=VpCq3uDNXNY&offerid=2037571.369&subid=0&type=4"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- affiliate creatives must load from the network */}
            <img
              alt="Giftcards.com Gift Card"
              src="https://ad.linksynergy.com/fs-bin/show?id=VpCq3uDNXNY&bids=2037571.369&subid=0&type=4&gridnum=0"
            />
          </a>
        </div>
        {(post.tags?.length ?? 0) > 0 ? (
          <div className="meta blog-post-tags" aria-label="Tags">
            {post.tags.map((t) => (
              <Link key={t} className="pill" href={`/blog?tag=${encodeURIComponent(t)}`}>
                {t}
              </Link>
            ))}
          </div>
        ) : null}

        <section className="blog-comments" aria-labelledby="post-comments-h">
          <h2 id="post-comments-h">Comments</h2>
          {comments.length > 0 ? (
            <ul className="blog-comment-list">
              {comments.map((c) => (
                <li key={c.id} className="blog-comment">
                  <p className="blog-comment-meta">
                    <strong>{c.display_name}</strong>
                    <span>{longDate(c.created_at)}</span>
                  </p>
                  <p className="blog-comment-body">{c.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="blog-comments-empty">No comments yet. Be the first.</p>
          )}
          {post.status === "published" ? (
            <PostCommentForm postId={post.id} defaultName={profile?.display_name ?? ""} />
          ) : (
            <p className="hint">Comments open when this post is published.</p>
          )}
        </section>
      </article>

      {related.length > 0 ? (
        <section className="wrap blog-post blog-related" aria-labelledby="related-posts-h">
          <div className="sec-head">
            <div>
              <h2 id="related-posts-h">Related posts</h2>
              <p>{isFavorite ? "More from Our Faves." : "More from the blog."}</p>
            </div>
            <Link className="btn ghost small" href={sectionHref}>
              {isFavorite ? "View Our Faves" : "View all posts"}
            </Link>
          </div>
          <ul className="blog-cover-grid">
            {related.map((p) => (
              <BlogCoverCard key={p.id} post={p} categoryNames={categoryNames} />
            ))}
          </ul>
        </section>
      ) : null}
      <div style={{ height: "3rem" }} />
    </>
  );
}

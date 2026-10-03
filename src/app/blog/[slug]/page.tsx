import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getBlogCategories, getPostBySlug, getViewer, isEditorRole, listRelatedPosts } from "@/lib/queries";
import { easternDateKey, shortDate } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { HtmlWithScripts } from "@/components/HtmlWithScripts";
import { renderPostMarkdown, stripInlineMarkdown } from "@/lib/render-post-markdown";

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

  const [{ profile }, blogCategories] = await Promise.all([getViewer(), getBlogCategories()]);
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
  const nameById = new Map(blogCategories.map((c) => [c.id, c.name]));
  const categories = (post.categories ?? [])
    .filter((id) => {
      if (!id) return false;
      // Favorites only appears on Favorites posts; never list it on archive posts.
      if (id === "favorites") return isFavorite;
      return true;
    })
    .map((id) => ({
      id,
      name: id === "favorites" ? (nameById.get(id) ?? "Favorites") : (nameById.get(id) ?? id),
      href: id === "favorites" ? "/our-faves" : `/blog?category=${encodeURIComponent(id)}`,
    }))
    .filter((c) => c.name);
  const authorName = post.author?.display_name || "Totally Gone Bananas";
  const authorHref = post.author_id
    ? `/blog?author=${encodeURIComponent(post.author?.username || post.author_id)}`
    : null;
  const dateHref = post.published_at
    ? `/blog?date=${encodeURIComponent(easternDateKey(post.published_at))}`
    : null;

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
          <Link href="/blog">Blog</Link>
          <span className="crumbs-item">
            <span aria-hidden="true">&gt;</span>
            <span>{post.title}</span>
          </span>
        </nav>
        <header className="page-head">
          {post.status === "draft" && <p className="status s-draft">Draft — only editors can see this</p>}
          <h1>{post.title}</h1>
          <p className="lede blog-byline">
            <span>
              Author:{" "}
              {authorHref ? <Link href={authorHref}>{authorName}</Link> : authorName}
            </span>
            <span className="blog-byline-sep" aria-hidden="true">|</span>
            <span>
              Date:{" "}
              {dateHref && post.published_at ? (
                <Link href={dateHref}>{shortDate(post.published_at)}</Link>
              ) : (
                "—"
              )}
            </span>
            <span className="blog-byline-sep" aria-hidden="true">|</span>
            <span>
              Category:{" "}
              {categories.length ? (
                categories.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 ? ", " : null}
                    <Link href={c.href}>{c.name}</Link>
                  </span>
                ))
              ) : (
                "—"
              )}
            </span>
          </p>
          {(post.tags?.length ?? 0) > 0 ? (
            <div className="meta blog-post-tags" aria-label="Tags">
              {post.tags.map((t) => (
                <Link key={t} className="pill" href={`/blog?tag=${encodeURIComponent(t)}`}>
                  {t}
                </Link>
              ))}
            </div>
          ) : null}
          {editor && (
            <p><Link className="btn small ghost" href={`/admin/posts/${post.id}/edit`}>Edit in admin</Link></p>
          )}
        </header>
        {cover && (
          <div className="blog-hero">
            <Image src={cover} alt="" width={960} height={540} unoptimized priority />
          </div>
        )}
        <HtmlWithScripts className="blog-body" html={bodyHtml} />
      </article>

      {related.length > 0 ? (
        <section className="wrap blog-post blog-related" aria-labelledby="related-posts-h">
          <div className="sec-head">
            <div>
              <h2 id="related-posts-h">Related posts</h2>
              <p>{isFavorite ? "More from Our Faves." : "More from the blog."}</p>
            </div>
            <Link className="btn ghost small" href={isFavorite ? "/our-faves" : "/blog"}>
              {isFavorite ? "View Our Faves" : "View all posts"}
            </Link>
          </div>
          <ul className="blog-grid home-blog-grid">
            {related.map((p) => {
              const relatedCover = mediaSrc(p.cover_path);
              return (
                <li key={p.id} className="blog-card">
                  {relatedCover ? (
                    <Link href={`/blog/${p.slug}`} className="blog-card-media" tabIndex={-1} aria-hidden>
                      <Image src={relatedCover} alt="" width={640} height={360} unoptimized />
                    </Link>
                  ) : (
                    <Link href={`/blog/${p.slug}`} className="blog-card-media blog-card-media-ph" tabIndex={-1} aria-hidden />
                  )}
                  <div className="blog-card-body">
                    <h3><Link href={`/blog/${p.slug}`}>{stripInlineMarkdown(p.title)}</Link></h3>
                    {p.excerpt ? <p>{stripInlineMarkdown(p.excerpt)}</p> : null}
                    <div className="blog-card-foot">
                      <span />
                      <Link className="blog-card-read" href={`/blog/${p.slug}`}>Read</Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <div style={{ height: "3rem" }} />
    </>
  );
}

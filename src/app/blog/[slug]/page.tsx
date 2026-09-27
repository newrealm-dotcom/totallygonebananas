import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPostBySlug, getViewer, isEditorRole } from "@/lib/queries";
import { shortDate } from "@/lib/format";
import { publicUrl } from "@/lib/media";

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || (post.status !== "published" && !(await getViewer()).profile)) return { title: "Post" };
  return {
    title: post.title,
    description: post.excerpt || undefined,
  };
}

function paragraphs(body: string) {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const { profile } = await getViewer();
  const editor = isEditorRole(profile);
  if (post.status !== "published" && !editor) notFound();

  const cover = publicUrl(post.cover_path);
  const paras = paragraphs(post.body);

  return (
    <article className="wrap narrow blog-post">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/blog">Blog</Link>
        <span aria-hidden="true">&gt;&gt;</span>
        <span>{post.title}</span>
      </nav>
      <header className="page-head">
        {post.status === "draft" && <p className="status s-draft">Draft — only editors can see this</p>}
        <h1>{post.title}</h1>
        <p className="lede">
          {post.author?.display_name || "Totally Gone Bananas"}
          {post.published_at ? ` · ${shortDate(post.published_at)}` : ""}
        </p>
        {editor && (
          <p><Link className="btn small ghost" href={`/admin/posts/${post.id}/edit`}>Edit in admin</Link></p>
        )}
      </header>
      {cover && (
        <div className="blog-hero">
          <Image src={cover} alt="" width={960} height={540} unoptimized priority />
        </div>
      )}
      <div className="blog-body">
        {paras.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <div style={{ height: "3rem" }} />
    </article>
  );
}

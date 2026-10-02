import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBlogCategories, getPostById, getRecipeTags } from "@/lib/queries";
import { PostForm } from "@/components/PostForm";

export const metadata: Metadata = { title: "Admin · Edit post" };

export default async function EditPostPage({ params }: PageProps<"/admin/posts/[id]/edit">) {
  const { id } = await params;
  const [post, blogCategories, recipeTags] = await Promise.all([
    getPostById(id),
    getBlogCategories(),
    getRecipeTags(),
  ]);
  if (!post) notFound();

  const listHref = (post.categories ?? []).includes("favorites")
    ? "/admin/our-faves"
    : "/admin/posts";

  return (
    <>
      <div className="sec-head">
        <div>
          <h2>Edit post</h2>
          <p>{post.title}</p>
        </div>
      </div>
      <PostForm
        key={`${post.id}:${post.categories.join(",")}`}
        post={post}
        blogCategories={blogCategories}
        activeTags={recipeTags.map((t) => t.name)}
        listHref={listHref}
      />
    </>
  );
}

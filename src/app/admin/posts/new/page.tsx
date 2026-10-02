import type { Metadata } from "next";
import { getBlogCategories, getRecipeTags } from "@/lib/queries";
import { PostForm } from "@/components/PostForm";

export const metadata: Metadata = { title: "Admin · New post" };

export default async function NewPostPage() {
  const [blogCategories, recipeTags] = await Promise.all([getBlogCategories(), getRecipeTags()]);
  return (
    <>
      <div className="sec-head">
        <div>
          <h2>New blog post</h2>
          <p>Fill in the post details, then optionally upload JSON for the document head.</p>
        </div>
      </div>
      <PostForm blogCategories={blogCategories} activeTags={recipeTags.map((t) => t.name)} />
    </>
  );
}

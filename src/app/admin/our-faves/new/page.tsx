import type { Metadata } from "next";
import { getBlogCategories, getRecipeTags } from "@/lib/queries";
import { PostForm } from "@/components/PostForm";

export const metadata: Metadata = { title: "Admin · New fave" };

const FAVORITES_CATEGORY = "favorites";

export default async function NewOurFavePage() {
  const [blogCategories, recipeTags] = await Promise.all([getBlogCategories(), getRecipeTags()]);
  return (
    <>
      <div className="sec-head">
        <div>
          <h2>New fave</h2>
          <p>Fill in the post details. It will be tagged Favorites and appear on /our-faves when published.</p>
        </div>
      </div>
      <PostForm
        blogCategories={blogCategories}
        activeTags={recipeTags.map((t) => t.name)}
        defaultCategories={[FAVORITES_CATEGORY]}
        listHref="/admin/our-faves"
      />
    </>
  );
}

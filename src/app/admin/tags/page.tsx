import type { Metadata } from "next";
import { getAdminRecipeTags } from "@/lib/queries";
import { TagAdmin } from "@/components/TagAdmin";

export const metadata: Metadata = { title: "Admin · Tags" };

export default async function AdminTagsPage() {
  const tags = await getAdminRecipeTags();
  return (
    <>
      <div className="sec-head">
        <div>
          <h2>Tags</h2>
          <p>Add or remove tags used on recipes, blog posts, forms, and filters.</p>
        </div>
      </div>
      <TagAdmin tags={tags} />
    </>
  );
}

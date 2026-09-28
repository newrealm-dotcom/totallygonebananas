import type { Metadata } from "next";
import { getBlogCategories } from "@/lib/queries";
import { BlogCategoryAdmin } from "@/components/BlogCategoryAdmin";

export const metadata: Metadata = { title: "Admin · Blog Categories" };

export default async function AdminBlogCategoriesPage() {
  const categories = await getBlogCategories();
  return (
    <>
      <div className="sec-head">
        <div>
          <h2>Blog categories</h2>
          <p>Organize blog posts. These are separate from recipe categories.</p>
        </div>
      </div>
      <BlogCategoryAdmin categories={categories} />
    </>
  );
}

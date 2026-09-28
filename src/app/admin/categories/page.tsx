import type { Metadata } from "next";
import { getCategories, getViewer, isAdminRole } from "@/lib/queries";
import { CategoryAdmin } from "@/components/CategoryAdmin";

export const metadata: Metadata = { title: "Admin · Recipe Categories" };

export default async function AdminCategoriesPage() {
  const [{ profile }, categories] = await Promise.all([getViewer(), getCategories()]);
  return (
    <>
      <div className="sec-head">
        <div>
          <h2>Recipe categories</h2>
          <p>
            Organize recipes. Edits save when you leave a field.
            {isAdminRole(profile) ? " Select one or many to edit, clone, or delete." : ""}
            {" "}Blog post categories are managed separately.
          </p>
        </div>
      </div>
      <CategoryAdmin categories={categories} isAdmin={isAdminRole(profile)} />
    </>
  );
}

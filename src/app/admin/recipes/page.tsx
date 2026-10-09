import type { Metadata } from "next";
import Link from "next/link";
import { getViewer, isAdminRole, listAdminRecipes } from "@/lib/queries";
import { shortDate } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { AdminBulkList } from "@/components/AdminBulkList";

export const metadata: Metadata = { title: "Admin · Recipes" };

export default async function AdminRecipesPage() {
  const [{ profile }, recipes] = await Promise.all([getViewer(), listAdminRecipes()]);
  const admin = isAdminRole(profile);

  return (
    <>
      <div className="sec-head">
        <div>
          <h2>Recipes</h2>
          <p>
            All statuses — edit any recipe or publish a new one.
            {admin ? " Select one or many to edit status, clone, or delete." : ""}
          </p>
        </div>
        <Link className="btn small" href="/recipes/new">New recipe</Link>
      </div>
      {recipes.length === 0 ? (
        <div className="empty"><p>No recipes yet.</p><Link className="btn" href="/recipes/new">Add the first one</Link></div>
      ) : (
        <AdminBulkList
          kind="recipe"
          isAdmin={admin}
          items={recipes.map((r) => ({
            id: r.id,
            name: r.title,
            editHref: `/recipes/${r.slug}/edit`,
            viewHref: `/recipes/${r.slug}`,
            status: r.status,
            detail: `updated ${shortDate(r.updated_at)}`,
            imageSrc: mediaSrc(r.cover_path),
          }))}
        />
      )}
    </>
  );
}

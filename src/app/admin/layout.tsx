import { redirect } from "next/navigation";
import { getViewer, isAdminRole, isEditorRole } from "@/lib/queries";
import { AdminNav } from "@/components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, profile } = await getViewer();
  if (!userId) redirect("/login?next=/admin");
  if (!profile || !isEditorRole(profile)) redirect("/");

  return (
    <div className="wrap admin">
      <div className="page-head">
        <h1>Admin</h1>
        <p className="lede">Upload and manage recipes, blog posts, recipe categories, tags, and more.</p>
      </div>
      <AdminNav isAdmin={isAdminRole(profile)} />
      {children}
      <div style={{ height: "3rem" }} />
    </div>
  );
}

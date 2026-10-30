import { redirect } from "next/navigation";
import { adminCounts, getViewer, isAdminRole, isEditorRole } from "@/lib/queries";
import { AdminAlerts } from "@/components/AdminAlerts";
import { AdminNav } from "@/components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, profile, aal } = await getViewer();
  if (!userId) redirect("/login?next=/admin");
  if (!profile || !isEditorRole(profile)) redirect("/");
  if (isAdminRole(profile) && aal !== "aal2") redirect("/login/mfa?next=/admin");

  const counts = await adminCounts();

  return (
    <div className="wrap admin">
      <div className="page-head">
        <h1>Admin</h1>
        <p className="lede">Upload and manage recipes, blog posts, recipe categories, tags, and more.</p>
      </div>
      <AdminNav
        isAdmin={isAdminRole(profile)}
        pendingReview={counts.pending}
        pendingComments={counts.pendingComments}
        referralsRecent={counts.referralsRecent}
      />
      <AdminAlerts
        pending={counts.pending}
        pendingComments={counts.pendingComments}
        referralsRecent={counts.referralsRecent}
      />
      {children}
    </div>
  );
}

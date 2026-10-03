import { redirect } from "next/navigation";
import { adminCounts, getViewer, isAdminRole, isEditorRole } from "@/lib/queries";
import { AdminAlerts } from "@/components/AdminAlerts";
import { AdminNav } from "@/components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, profile } = await getViewer();
  if (!userId) redirect("/login?next=/admin");
  if (!profile || !isEditorRole(profile)) redirect("/");

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
        referralsRecent={counts.referralsRecent}
        socialPending={counts.socialPending}
      />
      <AdminAlerts pending={counts.pending} referralsRecent={counts.referralsRecent} />
      {children}
      <div style={{ height: "3rem" }} />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/queries";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata: Metadata = { title: "Edit profile" };

export default async function SettingsPage() {
  const { profile } = await getViewer();
  if (!profile) redirect("/login?next=/profile/settings");
  return (
    <div className="wrap narrow">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/profile">My Banana Stand</Link>
        <span className="crumbs-item">
          <span aria-hidden="true">&gt;</span>
          <span>Edit profile</span>
        </span>
      </nav>
      <div className="page-head"><h1>Edit profile</h1></div>
      <ProfileForm profile={profile} />
    </div>
  );
}

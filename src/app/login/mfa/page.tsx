import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MfaPanel } from "@/components/MfaPanel";
import { getViewer, isAdminRole } from "@/lib/queries";

export const metadata: Metadata = { title: "Admin verification" };

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/profile";
  const { userId, profile, aal } = await getViewer();
  if (!userId) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!profile || !isAdminRole(profile)) redirect(next);
  if (aal === "aal2") redirect(next);

  return (
    <div className="wrap narrow">
      <div className="page-head">
        <h1>Admin verification</h1>
        <p className="lede">Enter a code from your authenticator app to continue.</p>
      </div>
      <MfaPanel isAdmin required next={next} />
    </div>
  );
}

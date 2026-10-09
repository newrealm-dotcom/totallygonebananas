import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PinterestAdmin } from "@/components/PinterestAdmin";
import { getViewer, isAdminRole } from "@/lib/queries";
import { siteUrl } from "@/lib/env";
import {
  getPinterestConnection,
  listPinterestBoards,
  pinterestAppCredentials,
  pinterestRedirectUri,
  type PinterestBoard,
} from "@/lib/social/pinterest";

export const metadata: Metadata = { title: "Admin · Pinterest" };

export default async function AdminPinterestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profile } = await getViewer();
  if (!isAdminRole(profile)) redirect("/admin");

  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const justConnected = sp.connected === "1";
  const appConfigured = !!pinterestAppCredentials();
  const connection = await getPinterestConnection();

  let boards: PinterestBoard[] = [];
  if (connection?.access_token) {
    try {
      boards = await listPinterestBoards(connection.access_token);
    } catch {
      const cached = connection.meta && typeof connection.meta === "object" ? (connection.meta as { boards?: PinterestBoard[] }).boards : null;
      boards = Array.isArray(cached) ? cached : [];
    }
  }

  return (
    <>
      <div className="page-head" style={{ paddingTop: 0 }}>
        <h2>Pinterest</h2>
        <p className="lede">
          Connect the Totally Gone Bananas Pinterest account so newly published recipes and blog posts with cover images
          are pinned automatically.
        </p>
      </div>
      <PinterestAdmin
        connected={!!connection}
        boardId={connection?.board_id ?? null}
        boards={boards}
        appConfigured={appConfigured}
        callbackUrl={pinterestRedirectUri()}
        error={error}
        justConnected={justConnected}
      />
      <p className="hint" style={{ marginTop: "1.5rem" }}>
        Site URL used for OAuth: <code>{siteUrl()}</code>
      </p>
    </>
  );
}

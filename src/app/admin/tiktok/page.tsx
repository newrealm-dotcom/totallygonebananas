import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TikTokAdmin } from "@/components/TikTokAdmin";
import { getViewer, isAdminRole } from "@/lib/queries";
import { siteUrl } from "@/lib/env";
import { getTikTokConnection, queryTikTokCreator, tiktokAppCredentials, tiktokRedirectUri } from "@/lib/social/tiktok";

export const metadata: Metadata = { title: "Admin · TikTok" };

function storedName(meta: Record<string, unknown> | null): string | null {
  const username = meta && typeof meta.username === "string" ? meta.username : null;
  return username;
}

export default async function AdminTikTokPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { profile } = await getViewer();
  if (!isAdminRole(profile)) redirect("/admin");

  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const justConnected = sp.connected === "1";
  const appConfigured = !!tiktokAppCredentials();
  const connection = await getTikTokConnection();

  let username = storedName(connection?.meta ?? null);
  if (connection?.access_token) {
    try {
      const creator = await queryTikTokCreator(connection.access_token);
      username = creator.username || username;
    } catch {
      /* Keep the name saved at connect time when the token query fails. */
    }
  }

  return (
    <>
      <div className="page-head" style={{ paddingTop: 0 }}>
        <h2>TikTok</h2>
        <p className="lede">
          Connect the Totally Gone Bananas TikTok account so newly published recipes, blog posts, and Our Faves with
          cover images are posted as photos.
        </p>
      </div>
      <TikTokAdmin
        connected={!!connection}
        username={username}
        appConfigured={appConfigured}
        callbackUrl={tiktokRedirectUri()}
        urlPrefix={`${siteUrl()}/`}
        error={error}
        justConnected={justConnected}
      />
      <p className="hint" style={{ marginTop: "1.5rem" }}>
        Site URL used for OAuth: <code>{siteUrl()}</code>
      </p>
    </>
  );
}

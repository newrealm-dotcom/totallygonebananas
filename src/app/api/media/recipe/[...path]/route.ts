import { createAdminClient } from "@/lib/supabase/admin";
import { MEDIA_PATH_RE, RECIPE_BUCKET } from "@/lib/media";
import { getViewer, isEditorRole } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Serves a recipe file when it is published, owned by the caller, or opened by an editor with MFA. */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const joined = (await params).path.join("/");
  if (!MEDIA_PATH_RE.test(joined)) return new Response("Not found", { status: 404 });

  const admin = createAdminClient();
  const { data: published, error } = await admin.rpc("recipe_storage_path_is_published", { object_name: joined });
  if (error) return new Response("Not found", { status: 404 });

  let allowed = published === true;
  if (!allowed) {
    const { userId, profile, aal } = await getViewer();
    const owner = joined.startsWith(`${userId}/`);
    allowed = owner || isEditorRole(profile, aal);
  }
  if (!allowed) return new Response("Not found", { status: 404 });

  const { data, error: downloadError } = await admin.storage.from(RECIPE_BUCKET).download(joined);
  if (downloadError || !data) return new Response("Not found", { status: 404 });

  return new Response(data, {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Cache-Control": published === true ? "public, max-age=86400" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

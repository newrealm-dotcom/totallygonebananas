"use server";

import { revalidatePath } from "next/cache";
import { getViewer, isAdminRole } from "@/lib/queries";
import { disconnectTikTok } from "@/lib/social/tiktok";

type Result = { ok: true } | { ok: false; error: string };

export async function disconnectTikTokAccount(): Promise<Result> {
  const { profile, aal } = await getViewer();
  if (!isAdminRole(profile)) return { ok: false, error: "Only admins can disconnect TikTok." };
  if (aal !== "aal2") return { ok: false, error: "Please complete multi-factor authentication before disconnecting TikTok." };
  try {
    await disconnectTikTok();
    revalidatePath("/admin/tiktok");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not disconnect." };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { getViewer, isAdminRole } from "@/lib/queries";
import { disconnectPinterest, setPinterestBoardId } from "@/lib/social/pinterest";

type Result = { ok: true } | { ok: false; error: string };

export async function savePinterestBoard(boardId: string): Promise<Result> {
  const { profile, aal } = await getViewer();
  if (!isAdminRole(profile)) return { ok: false, error: "Only admins can choose a Pinterest board." };
  if (aal !== "aal2") return { ok: false, error: "Please complete multi-factor authentication before choosing a board." };
  const id = boardId.trim();
  if (!id) return { ok: false, error: "Pick a board." };
  try {
    await setPinterestBoardId(id);
    revalidatePath("/admin/pinterest");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save board." };
  }
}

export async function disconnectPinterestAccount(): Promise<Result> {
  const { profile, aal } = await getViewer();
  if (!isAdminRole(profile)) return { ok: false, error: "Only admins can disconnect Pinterest." };
  if (aal !== "aal2") return { ok: false, error: "Please complete multi-factor authentication before disconnecting Pinterest." };
  try {
    await disconnectPinterest();
    revalidatePath("/admin/pinterest");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not disconnect." };
  }
}

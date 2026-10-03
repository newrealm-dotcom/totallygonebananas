"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isEditorRole } from "@/lib/queries";

type SocialQueueResult = { ok: true } | { ok: false; error: string };

async function requireEditor(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, profile } = await getViewer();
  if (!userId || !isEditorRole(profile)) return { ok: false, error: "Only editors can manage the social queue." };
  return { ok: true };
}

function cleanCaption(value: string): string {
  return value.replace(/\r\n/g, "\n").trim().slice(0, 2200);
}

export async function updateSocialCaption(id: string, caption: string): Promise<SocialQueueResult> {
  const gate = await requireEditor();
  if (!gate.ok) return gate;

  const nextCaption = cleanCaption(caption);
  if (!nextCaption) return { ok: false, error: "Caption cannot be empty." };

  const supabase = await createClient();
  const { error } = await supabase.from("social_queue").update({ caption: nextCaption }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/social");
  return { ok: true };
}

export async function markSocialPosted(id: string): Promise<SocialQueueResult> {
  const gate = await requireEditor();
  if (!gate.ok) return gate;

  const supabase = await createClient();
  const { error } = await supabase.from("social_queue").update({ status: "posted" }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/social");
  return { ok: true };
}

export async function markSocialSkipped(id: string): Promise<SocialQueueResult> {
  const gate = await requireEditor();
  if (!gate.ok) return gate;

  const supabase = await createClient();
  const { error } = await supabase.from("social_queue").update({ status: "skipped" }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/social");
  return { ok: true };
}

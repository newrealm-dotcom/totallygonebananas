"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isEditorRole } from "@/lib/queries";
import { fieldErrors, homepagePromoInput } from "@/lib/validation";
import { MEDIA_PATH_RE } from "@/lib/media";

export type SaveHomepagePromoResult = { ok: true } | { ok: false; errors: Record<string, string> };

export async function saveHomepagePromo(raw: unknown): Promise<SaveHomepagePromoResult> {
  const parsed = homepagePromoInput.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const input = parsed.data;

  const { userId, profile } = await getViewer();
  if (!userId || !isEditorRole(profile)) return { ok: false, errors: { form: "Only editors can edit the homepage promo." } };

  if (MEDIA_PATH_RE.test(input.imagePath) && !input.imagePath.startsWith(`${userId}/`)) {
    const supabaseCheck = await createClient();
    const { data: existing } = await supabaseCheck.from("homepage_promo").select("image_path").eq("id", "default").maybeSingle();
    if (input.imagePath !== existing?.image_path) {
      return { ok: false, errors: { imagePath: "Image couldn't be verified. Upload it again." } };
    }
  }

  const supabase = await createClient();
  const row = {
    id: "default",
    heading: input.heading,
    body: input.body,
    button_label: input.buttonLabel,
    button_href: input.buttonHref,
    image_path: input.imagePath,
  };
  const { error } = await supabase.from("homepage_promo").upsert(row, { onConflict: "id" });
  if (error) return { ok: false, errors: { form: error.message } };

  revalidatePath("/");
  revalidatePath("/admin/homepage");
  return { ok: true };
}

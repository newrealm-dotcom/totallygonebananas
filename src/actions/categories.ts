"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isEditorRole } from "@/lib/queries";
import { categoryInput, fieldErrors } from "@/lib/validation";
import { slugify } from "@/lib/format";

export type SaveCategoryResult = { ok: true; id: string } | { ok: false; errors: Record<string, string> };

export async function saveCategory(raw: unknown, existingId?: string): Promise<SaveCategoryResult> {
  const parsed = categoryInput.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const input = parsed.data;

  const { profile } = await getViewer();
  if (!isEditorRole(profile)) return { ok: false, errors: { form: "Only editors can manage categories." } };

  const supabase = await createClient();
  const id = existingId || input.id || slugify(input.name).slice(0, 40);
  if (!/^[a-z0-9-]{2,40}$/.test(id)) return { ok: false, errors: { id: "IDs are 2–40 lowercase letters, numbers, or hyphens" } };

  const row = {
    id,
    name: input.name,
    emoji: input.emoji || "🍌",
    tagline: input.tagline || null,
    sort_order: input.sortOrder,
  };

  const { error } = existingId
    ? await supabase.from("categories").update({ name: row.name, emoji: row.emoji, tagline: row.tagline, sort_order: row.sort_order }).eq("id", existingId)
    : await supabase.from("categories").insert(row);

  if (error) {
    if (error.code === "23505") return { ok: false, errors: { id: "That category ID is already taken." } };
    return { ok: false, errors: { form: error.message } };
  }

  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath("/admin/categories");
  return { ok: true, id };
}

export async function deleteCategory(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { profile } = await getViewer();
  if (!isEditorRole(profile)) return { ok: false, error: "Only editors can delete categories." };
  const supabase = await createClient();
  const { data: recipes } = await supabase.from("recipes").select("id, categories").contains("categories", [id]);
  for (const recipe of recipes ?? []) {
    const next = (recipe.categories ?? []).filter((c: string) => c !== id);
    await supabase.from("recipes").update({ categories: next }).eq("id", recipe.id);
  }
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath("/admin/categories");
  return { ok: true };
}

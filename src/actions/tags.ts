"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isEditorRole } from "@/lib/queries";
import { fieldErrors, recipeTagInput } from "@/lib/validation";

export type SaveRecipeTagResult = { ok: true; name: string } | { ok: false; errors: Record<string, string> };

function revalidateTagPaths() {
  revalidatePath("/recipes");
  revalidatePath("/recipes/new");
  revalidatePath("/admin/tags");
  revalidatePath("/admin");
}

export async function saveRecipeTag(raw: unknown): Promise<SaveRecipeTagResult> {
  const parsed = recipeTagInput.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const input = parsed.data;

  const { profile } = await getViewer();
  if (!isEditorRole(profile)) return { ok: false, errors: { form: "Only editors can manage tags." } };

  const supabase = await createClient();
  const { count } = await supabase.from("recipe_tags").select("name", { count: "exact", head: true });
  const sortOrder = input.sortOrder || count || 0;

  const { error } = await supabase.from("recipe_tags").insert({
    name: input.name,
    sort_order: sortOrder,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, errors: { name: "That tag is already active." } };
    return { ok: false, errors: { form: error.message } };
  }

  revalidateTagPaths();
  return { ok: true, name: input.name };
}

export async function deleteRecipeTag(name: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { profile } = await getViewer();
  if (!isEditorRole(profile)) return { ok: false, error: "Only editors can delete tags." };

  const supabase = await createClient();

  // Drop the tag from any recipes that reference it.
  const { data: recipes } = await supabase.from("recipes").select("id, tags").contains("tags", [name]);
  for (const recipe of recipes ?? []) {
    const next = (recipe.tags ?? []).filter((t: string) => t !== name);
    await supabase.from("recipes").update({ tags: next }).eq("id", recipe.id);
  }

  const { error } = await supabase.from("recipe_tags").delete().eq("name", name);
  if (error) return { ok: false, error: error.message };

  revalidateTagPaths();
  return { ok: true };
}

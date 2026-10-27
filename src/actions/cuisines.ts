"use server";

import { cuisineIssue, normalizeCuisine } from "@/lib/cuisines";
import { getViewer, isEditorRole } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export type SaveCuisineResult = { ok: true; name: string } | { ok: false; error: string };

/** Insert a cuisine if it is not already in the catalog. Editors only. */
export async function ensureRecipeCuisine(raw: string): Promise<SaveCuisineResult> {
  const { profile } = await getViewer();
  if (!isEditorRole(profile)) return { ok: false, error: "Only editors can add a cuisine." };

  const name = normalizeCuisine(raw);
  const issue = cuisineIssue(name);
  if (issue) return { ok: false, error: issue };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("recipe_cuisines").select("name").eq("name", name).maybeSingle();
  if (existing?.name) return { ok: true, name: existing.name };

  const { count } = await supabase.from("recipe_cuisines").select("name", { count: "exact", head: true });
  const { error } = await supabase.from("recipe_cuisines").insert({ name, sort_order: count ?? 0 });
  if (error) {
    if (error.code === "23505") return { ok: true, name };
    return { ok: false, error: "Couldn't add that cuisine." };
  }
  return { ok: true, name };
}

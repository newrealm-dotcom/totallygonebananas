"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isEditorRole } from "@/lib/queries";
import { fieldErrors, recipeInput } from "@/lib/validation";
import { slugify } from "@/lib/format";
import { flattenSteps, normalizeStepGroups } from "@/lib/steps";
import { estimateRecipeNutrition } from "@/lib/nutrition";
import { renderPostMarkdown } from "@/lib/render-post-markdown";
import { REFERRAL_COOKIE, sanitizeReferral } from "@/lib/referral";
import type { RecipeStatus } from "@/lib/types";
export type SaveRecipeResult = { ok: true; slug: string; status: RecipeStatus } | { ok: false; errors: Record<string, string> };

async function uniqueSlug(title: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const base = slugify(title);
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data } = await supabase.from("recipes").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Create (no recipeId) or update a recipe. Media files are uploaded straight to Storage by the
 * browser first; this action only receives their paths and checks the caller may use them.
 */
export async function saveRecipe(raw: unknown, recipeId?: string): Promise<SaveRecipeResult> {
  const parsed = recipeInput.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const input = parsed.data;

  const { userId, profile } = await getViewer();
  if (!userId) return { ok: false, errors: { form: "Please sign in again, then try saving." } };
  const editor = isEditorRole(profile);
  const supabase = await createClient();

  // Existing recipe (for edits): re-read it rather than trusting the client.
  let existing: { id: string; slug: string; status: RecipeStatus; author_id: string | null; knownPaths: Set<string> } | null = null;
  if (recipeId) {
    const { data } = await supabase.from("recipes").select("id, slug, status, author_id, steps, cover_path, recipe_media(path)").eq("id", recipeId).maybeSingle();
    if (!data) return { ok: false, errors: { form: "That recipe no longer exists." } };
    if (!editor && (data.author_id !== userId || data.status === "published")) {
      return { ok: false, errors: { form: "You can't edit this recipe." } };
    }
    const known = new Set<string>();
    (data.recipe_media as { path: string }[] | null)?.forEach((m) => known.add(m.path));
    for (const step of flattenSteps(normalizeStepGroups(data.steps))) {
      if (step.media?.path) known.add(step.media.path);
    }
    if (data.cover_path) known.add(data.cover_path);
    existing = { id: data.id, slug: data.slug, status: data.status, author_id: data.author_id, knownPaths: known };
  }

  // Every media path must be in the caller's own folder, or already belong to this recipe.
  const allPaths = [
    ...input.gallery.map((g) => g.path),
    ...input.steps.flatMap((g) => g.steps.flatMap((s) => (s.media ? [s.media.path] : []))),
  ];
  const foreign = allPaths.find((p) => !p.startsWith(`${userId}/`) && !existing?.knownPaths.has(p));
  if (foreign) return { ok: false, errors: { gallery: "One of the files couldn't be verified. Remove it and upload it again." } };

  // Category: editors may create one on the fly.
  let categoryId = input.categoryId;
  if (categoryId === "__new") {
    if (!editor || !input.newCategory) return { ok: false, errors: { categoryId: "Pick a category" } };
    categoryId = slugify(input.newCategory.name).slice(0, 40);
    const { error } = await supabase
      .from("categories")
      .upsert({ id: categoryId, name: input.newCategory.name, emoji: input.newCategory.emoji || "🍌", sort_order: 100 }, { onConflict: "id", ignoreDuplicates: true });
    if (error) return { ok: false, errors: { categoryId: "Couldn't create that category." } };
  }

  // Status: members submit for review; only editors publish.
  let status: RecipeStatus;
  if (input.intent === "draft") status = "draft";
  else if (input.intent === "publish") {
    if (!editor) return { ok: false, errors: { form: "Only editors can publish directly. Submit it for review instead." } };
    status = "published";
  } else status = editor ? "published" : "pending";

  const cover = input.gallery.find((g) => g.kind === "image")?.path ?? null;
  const notesHtml = input.notes ? renderPostMarkdown(input.notes) : "";
  const nutrition = estimateRecipeNutrition(input.ingredients, input.servings || null);
  const row = {
    title: input.title,
    description: input.description || null,
    category_id: categoryId,
    emoji: input.emoji || null,
    total_minutes: input.totalMinutes,
    notes: notesHtml || null,
    nutrition,
    servings: input.servings || null,
    difficulty: input.difficulty,
    tags: input.tags,
    equipment: input.equipment,
    ingredients: input.ingredients,
    steps: input.steps.map((g) => ({
      title: g.title,
      steps: g.steps.map((s) => (s.media ? { text: s.text, media: s.media } : { text: s.text })),
    })),
    cover_path: cover,
    status,
    adapted_from_name: input.adaptedFromName || null,
    adapted_from_url: input.adaptedFromUrl || null,
  };

  let id: string;
  let slug: string;
  if (existing) {
    const { error } = await supabase.from("recipes").update(row).eq("id", existing.id);
    if (error) return { ok: false, errors: { form: "Couldn't save your changes. Please try again." } };
    id = existing.id;
    slug = existing.slug;
    await supabase.from("recipe_media").delete().eq("recipe_id", id);
  } else {
    slug = await uniqueSlug(input.title, supabase);
    const jar = await cookies();
    const referredBy = sanitizeReferral(jar.get(REFERRAL_COOKIE)?.value);
    const { data, error } = await supabase
      .from("recipes")
      .insert({ ...row, slug, author_id: userId, referred_by: referredBy })
      .select("id")
      .single();
    if (error || !data) return { ok: false, errors: { form: "Couldn't save your recipe. Please try again." } };
    id = data.id;
    if (referredBy) {
      try {
        jar.delete(REFERRAL_COOKIE);
      } catch {
        /* ignore read-only cookie contexts */
      }
    }
  }

  if (input.gallery.length) {
    const { error } = await supabase
      .from("recipe_media")
      .insert(input.gallery.map((g, position) => ({ recipe_id: id, kind: g.kind, path: g.path, caption: g.caption || null, position })));
    if (error) return { ok: false, errors: { gallery: "The recipe saved, but its photos didn't. Try saving again." } };
  }

  revalidatePath("/", "layout");
  return { ok: true, slug, status };
}

export async function deleteRecipe(recipeId: string): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await getViewer();
  if (!userId) return { ok: false, error: "Please sign in again." };
  const supabase = await createClient();
  // RLS limits this to the author's unpublished recipes, or any recipe for editors.
  const { data, error } = await supabase.from("recipes").delete().eq("id", recipeId).select("id");
  if (error || !data?.length) return { ok: false, error: "You can't delete this recipe." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function reviewRecipe(recipeId: string, decision: "publish" | "reject", note = ""): Promise<{ ok: boolean; error?: string }> {
  const { profile } = await getViewer();
  if (!isEditorRole(profile)) return { ok: false, error: "Only editors can review recipes." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("recipes")
    .update({ status: decision === "publish" ? "published" : "rejected", review_note: note.trim().slice(0, 500) || null })
    .eq("id", recipeId)
    .eq("status", "pending");
  if (error) return { ok: false, error: "Couldn't update that recipe." };
  revalidatePath("/", "layout");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isAdminRole } from "@/lib/queries";
import { slugify } from "@/lib/format";
import type { RecipeStatus } from "@/lib/types";
import type { StepGroup } from "@/lib/steps";

type Ok = { ok: true; id?: string; slug?: string };
type Fail = { ok: false; error: string };
type Result = Ok | Fail;

async function requireAdmin(): Promise<{ userId: string } | Fail> {
  const { userId, profile } = await getViewer();
  if (!userId || !isAdminRole(profile)) return { ok: false, error: "Only admins can do that." };
  return { userId };
}

async function uniqueSlug(
  table: "recipes" | "posts",
  base: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const root = (slugify(base) || table.slice(0, -1)).slice(0, 70);
  for (let i = 0; i < 8; i++) {
    const candidate = i === 0 ? root : `${root}-${Math.random().toString(36).slice(2, 5)}`;
    const { data } = await supabase.from(table).select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

async function uniqueCategoryId(base: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const root = (slugify(base) || "category").slice(0, 36);
  for (let i = 0; i < 8; i++) {
    const candidate = (i === 0 ? root : `${root}-${Math.random().toString(36).slice(2, 4)}`).slice(0, 40);
    const { data } = await supabase.from("categories").select("id").eq("id", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${root.slice(0, 30)}-${Date.now().toString(36)}`.slice(0, 40);
}

export async function adminDeleteRecipe(recipeId: string): Promise<Result> {
  const gate = await requireAdmin();
  if ("ok" in gate) return gate;
  const supabase = await createClient();
  const { data, error } = await supabase.from("recipes").delete().eq("id", recipeId).select("id");
  if (error || !data?.length) return { ok: false, error: error?.message || "Couldn't delete that recipe." };
  revalidatePath("/", "layout");
  revalidatePath("/admin/recipes");
  return { ok: true };
}

export async function adminCloneRecipe(recipeId: string): Promise<Result> {
  const gate = await requireAdmin();
  if ("ok" in gate) return gate;
  const supabase = await createClient();

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select(
      "title, description, category_id, emoji, total_minutes, time_note, servings, difficulty, tags, equipment, ingredients, steps, cover_path, recipe_media(kind, path, caption, position)",
    )
    .eq("id", recipeId)
    .maybeSingle();
  if (error || !recipe) return { ok: false, error: "Recipe not found." };

  const title = `${recipe.title} (copy)`.slice(0, 100);
  const slug = await uniqueSlug("recipes", title, supabase);
  const media = (recipe.recipe_media ?? []) as { kind: string; path: string; caption: string | null; position: number }[];

  const { data: created, error: insertError } = await supabase
    .from("recipes")
    .insert({
      title,
      slug,
      description: recipe.description,
      category_id: recipe.category_id,
      emoji: recipe.emoji,
      total_minutes: recipe.total_minutes,
      time_note: recipe.time_note,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      tags: recipe.tags ?? [],
      equipment: recipe.equipment ?? [],
      ingredients: recipe.ingredients ?? [],
      steps: (recipe.steps ?? []) as StepGroup[],
      cover_path: recipe.cover_path,
      status: "draft" satisfies RecipeStatus,
      author_id: gate.userId,
      review_note: null,
    })
    .select("id, slug")
    .single();
  if (insertError || !created) return { ok: false, error: insertError?.message || "Couldn't clone the recipe." };

  if (media.length) {
    const { error: mediaError } = await supabase.from("recipe_media").insert(
      media.map((m) => ({
        recipe_id: created.id,
        kind: m.kind,
        path: m.path,
        caption: m.caption,
        position: m.position,
      })),
    );
    if (mediaError) return { ok: false, error: "Recipe cloned, but gallery copy failed." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/recipes");
  return { ok: true, id: created.id, slug: created.slug };
}

export async function adminDeletePost(postId: string): Promise<Result> {
  const gate = await requireAdmin();
  if ("ok" in gate) return gate;
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").delete().eq("id", postId).select("slug").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Post not found." };
  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  if (data.slug) revalidatePath(`/blog/${data.slug}`);
  return { ok: true };
}

export async function adminClonePost(postId: string): Promise<Result> {
  const gate = await requireAdmin();
  if ("ok" in gate) return gate;
  const supabase = await createClient();

  const { data: post, error } = await supabase.from("posts").select("*").eq("id", postId).maybeSingle();
  if (error || !post) return { ok: false, error: "Post not found." };

  const title = `${post.title} (copy)`.slice(0, 120);
  const slug = await uniqueSlug("posts", title, supabase);
  const { data: created, error: insertError } = await supabase
    .from("posts")
    .insert({
      title,
      slug,
      excerpt: post.excerpt,
      body: post.body,
      cover_path: post.cover_path,
      head_json: post.head_json,
      seo_title: post.seo_title,
      meta_description: post.meta_description,
      categories: post.categories ?? [],
      status: "draft",
      author_id: gate.userId,
      published_at: null,
    })
    .select("id, slug")
    .single();
  if (insertError || !created) return { ok: false, error: insertError?.message || "Couldn't clone the post." };

  revalidatePath("/admin/posts");
  return { ok: true, id: created.id, slug: created.slug };
}

export async function adminDeleteCategory(categoryId: string): Promise<Result> {
  const gate = await requireAdmin();
  if ("ok" in gate) return gate;
  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function adminCloneCategory(categoryId: string): Promise<Result> {
  const gate = await requireAdmin();
  if ("ok" in gate) return gate;
  const supabase = await createClient();

  const { data: cat, error } = await supabase.from("categories").select("*").eq("id", categoryId).maybeSingle();
  if (error || !cat) return { ok: false, error: "Category not found." };

  const name = `${cat.name} (copy)`.slice(0, 40);
  const id = await uniqueCategoryId(`${cat.id}-copy`, supabase);
  const { error: insertError } = await supabase.from("categories").insert({
    id,
    name,
    emoji: cat.emoji,
    tagline: cat.tagline,
    sort_order: cat.sort_order + 1,
  });
  if (insertError) return { ok: false, error: insertError.message };

  revalidatePath("/", "layout");
  revalidatePath("/admin/categories");
  return { ok: true, id };
}

function cleanIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter((id): id is string => typeof id === "string" && id.length > 0))];
}

export async function adminBulkDeleteRecipes(ids: unknown): Promise<Result & { count?: number }> {
  const gate = await requireAdmin();
  if ("ok" in gate) return gate;
  const list = cleanIds(ids);
  if (!list.length) return { ok: false, error: "Select at least one recipe." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("recipes").delete().in("id", list).select("id");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  revalidatePath("/admin/recipes");
  return { ok: true, count: data?.length ?? 0 };
}

export async function adminBulkDeletePosts(ids: unknown): Promise<Result & { count?: number }> {
  const gate = await requireAdmin();
  if ("ok" in gate) return gate;
  const list = cleanIds(ids);
  if (!list.length) return { ok: false, error: "Select at least one post." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").delete().in("id", list).select("id, slug");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  data?.forEach((p) => p.slug && revalidatePath(`/blog/${p.slug}`));
  return { ok: true, count: data?.length ?? 0 };
}

export async function adminBulkDeleteCategories(ids: unknown): Promise<Result & { count?: number }> {
  const gate = await requireAdmin();
  if ("ok" in gate) return gate;
  const list = cleanIds(ids);
  if (!list.length) return { ok: false, error: "Select at least one category." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").delete().in("id", list).select("id");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  revalidatePath("/admin/categories");
  return { ok: true, count: data?.length ?? 0 };
}

export async function adminBulkSetRecipeStatus(
  ids: unknown,
  status: RecipeStatus,
): Promise<Result & { count?: number }> {
  const gate = await requireAdmin();
  if ("ok" in gate) return gate;
  const list = cleanIds(ids);
  if (!list.length) return { ok: false, error: "Select at least one recipe." };
  if (!["draft", "pending", "published", "rejected"].includes(status)) {
    return { ok: false, error: "Invalid status." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("recipes").update({ status }).in("id", list).select("id");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  revalidatePath("/admin/recipes");
  return { ok: true, count: data?.length ?? 0 };
}

export async function adminBulkSetPostStatus(
  ids: unknown,
  status: "draft" | "published",
): Promise<Result & { count?: number }> {
  const gate = await requireAdmin();
  if ("ok" in gate) return gate;
  const list = cleanIds(ids);
  if (!list.length) return { ok: false, error: "Select at least one post." };
  if (status !== "draft" && status !== "published") return { ok: false, error: "Invalid status." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").update({ status }).in("id", list).select("id, slug");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  data?.forEach((p) => p.slug && revalidatePath(`/blog/${p.slug}`));
  return { ok: true, count: data?.length ?? 0 };
}

export async function adminBulkCloneRecipes(ids: unknown): Promise<Result & { count?: number }> {
  const gate = await requireAdmin();
  if ("ok" in gate) return gate;
  const list = cleanIds(ids);
  if (!list.length) return { ok: false, error: "Select at least one recipe." };
  let count = 0;
  for (const id of list) {
    const result = await adminCloneRecipe(id);
    if (!result.ok) return { ok: false, error: result.error };
    count += 1;
  }
  return { ok: true, count };
}

export async function adminBulkClonePosts(ids: unknown): Promise<Result & { count?: number }> {
  const gate = await requireAdmin();
  if ("ok" in gate) return gate;
  const list = cleanIds(ids);
  if (!list.length) return { ok: false, error: "Select at least one post." };
  let count = 0;
  for (const id of list) {
    const result = await adminClonePost(id);
    if (!result.ok) return { ok: false, error: result.error };
    count += 1;
  }
  return { ok: true, count };
}

export async function adminBulkCloneCategories(ids: unknown): Promise<Result & { count?: number }> {
  const gate = await requireAdmin();
  if ("ok" in gate) return gate;
  const list = cleanIds(ids);
  if (!list.length) return { ok: false, error: "Select at least one category." };
  let count = 0;
  for (const id of list) {
    const result = await adminCloneCategory(id);
    if (!result.ok) return { ok: false, error: result.error };
    count += 1;
  }
  return { ok: true, count };
}

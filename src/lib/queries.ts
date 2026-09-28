import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { pointsFromCounts, standingsFor } from "@/lib/standings";
import type { Category, HomepagePromo, Post, PostWithAuthor, Profile, Rating, Recipe, RecipeWithExtras } from "@/lib/types";

export const DEFAULT_HOMEPAGE_PROMO: HomepagePromo = {
  id: "default",
  heading: "Got ripe bananas? We have ideas.",
  body: "Placeholder copy for a full-width homepage band. Swap this text for a seasonal promo, community callout, or whatever you want to spotlight next.",
  button_label: "See what's cooking",
  button_href: "/recipes",
  image_path: "/featured-home.webp",
  updated_at: new Date(0).toISOString(),
};

const CARD_FIELDS =
  "id, slug, title, description, category_id, emoji, total_minutes, time_note, servings, difficulty, tags, cover_path, status, published_at, created_at";

export type RecipeCardData = Pick<
  Recipe,
  "id" | "slug" | "title" | "description" | "category_id" | "emoji" | "total_minutes" | "time_note" | "servings" | "difficulty" | "tags" | "cover_path" | "status" | "published_at" | "created_at"
>;

/** The signed-in user and their profile, or nulls. Cached per request. */
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = (claims?.sub as string | undefined) ?? null;
  if (!userId) return { userId: null, profile: null as Profile | null };

  const { data: existing } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle<Profile>();
  if (existing) return { userId, profile: existing };

  // Accounts created before the schema (or if the auth trigger missed) have no row yet.
  const email = typeof claims?.email === "string" ? claims.email : "";
  const meta = claims?.user_metadata as { full_name?: string; name?: string } | undefined;
  const display =
    meta?.full_name || meta?.name || (email.includes("@") ? email.split("@")[0] : null) || "Banana fan";
  const { data: created } = await supabase
    .from("profiles")
    .upsert({ id: userId, display_name: display }, { onConflict: "id", ignoreDuplicates: false })
    .select("*")
    .maybeSingle<Profile>();
  return { userId, profile: created ?? null };
});

export const isEditorRole = (p: Profile | null) => p?.role === "editor" || p?.role === "admin";
export const isAdminRole = (p: Profile | null) => p?.role === "admin";

/** Saved / made / published counts → points + rank for the signed-in user. */
export const getViewerStandings = cache(async () => {
  const { userId } = await getViewer();
  if (!userId) return null;
  const supabase = await createClient();
  const [saves, made, published] = await Promise.all([
    supabase.from("saves").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("cook_logs").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("recipes").select("*", { count: "exact", head: true }).eq("author_id", userId).eq("status", "published"),
  ]);
  return standingsFor(
    pointsFromCounts({
      saved: saves.count ?? 0,
      made: made.count ?? 0,
      published: published.count ?? 0,
    }),
  );
});

export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("sort_order").order("name");
  return data ?? [];
});

export interface RecipeFilters {
  q?: string;
  category?: string;
  tag?: string;
  maxMinutes?: number;
  sort?: "new" | "quick" | "easy" | "az";
  limit?: number;
  offset?: number;
}

export async function listRecipes(f: RecipeFilters = {}): Promise<RecipeCardData[]> {
  const supabase = await createClient();
  let query = supabase.from("recipes").select(CARD_FIELDS).eq("status", "published");
  if (f.category) query = query.eq("category_id", f.category);
  if (f.tag) query = query.contains("tags", [f.tag]);
  if (f.maxMinutes) query = query.lte("total_minutes", f.maxMinutes);
  if (f.q) query = query.textSearch("search", f.q, { type: "websearch", config: "english" });
  switch (f.sort) {
    case "quick": query = query.order("total_minutes", { ascending: true, nullsFirst: false }); break;
    case "easy": query = query.order("difficulty", { ascending: true, nullsFirst: false }); break;
    case "az": query = query.order("title"); break;
    default: query = query.order("published_at", { ascending: false, nullsFirst: false });
  }
  const limit = f.limit ?? 60;
  const offset = f.offset ?? 0;
  const { data } = await query.range(offset, offset + limit - 1);
  return (data as RecipeCardData[]) ?? [];
}

export async function countRecipes(f: RecipeFilters = {}): Promise<number> {
  const supabase = await createClient();
  let query = supabase.from("recipes").select("id", { count: "exact", head: true }).eq("status", "published");
  if (f.category) query = query.eq("category_id", f.category);
  if (f.tag) query = query.contains("tags", [f.tag]);
  if (f.maxMinutes) query = query.lte("total_minutes", f.maxMinutes);
  if (f.q) query = query.textSearch("search", f.q, { type: "websearch", config: "english" });
  const { count } = await query;
  return count ?? 0;
}

export async function getRatings(ids: string[]): Promise<Map<string, Rating>> {
  if (!ids.length) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.from("recipe_ratings").select("*").in("recipe_id", ids);
  return new Map((data as Rating[] | null)?.map((r) => [r.recipe_id, r]) ?? []);
}

export async function getSavedIds(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("saves").select("recipe_id").eq("user_id", userId);
  return new Set(data?.map((s) => s.recipe_id as string) ?? []);
}

export const getRecipeBySlug = cache(async (slug: string): Promise<RecipeWithExtras | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recipes")
    .select("*, author:profiles!recipes_author_id_fkey(username, display_name, avatar_path), recipe_media(*)")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const recipe = data as RecipeWithExtras;
  recipe.tags = recipe.tags ?? [];
  recipe.ingredients = recipe.ingredients ?? [];
  recipe.steps = recipe.steps ?? [];
  recipe.recipe_media = [...(recipe.recipe_media ?? [])].sort((a, b) => a.position - b.position);
  return recipe;
});

/** Can this viewer edit this recipe? Mirrors the database policy. */
export function canEdit(recipe: Pick<Recipe, "author_id" | "status">, userId: string | null, profile: Profile | null) {
  if (!userId) return false;
  if (isEditorRole(profile)) return true;
  return recipe.author_id === userId && recipe.status !== "published";
}

export type AdminRecipeRow = Pick<
  Recipe,
  "id" | "slug" | "title" | "status" | "category_id" | "updated_at" | "created_at" | "author_id"
>;

export async function listAdminRecipes(limit = 100): Promise<AdminRecipeRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recipes")
    .select("id, slug, title, status, category_id, updated_at, created_at, author_id")
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data as AdminRecipeRow[]) ?? [];
}

export async function listPosts(opts: { publishedOnly?: boolean; limit?: number } = {}): Promise<Post[]> {
  const supabase = await createClient();
  let query = supabase.from("posts").select("*").order("published_at", { ascending: false, nullsFirst: false }).order("updated_at", { ascending: false });
  if (opts.publishedOnly) query = query.eq("status", "published");
  const { data } = await query.limit(opts.limit ?? 60);
  return (data as Post[]) ?? [];
}

export const getPostBySlug = cache(async (slug: string): Promise<PostWithAuthor | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("*, author:profiles!posts_author_id_fkey(username, display_name, avatar_path)")
    .eq("slug", slug)
    .maybeSingle();
  return (data as PostWithAuthor | null) ?? null;
});

export const getPostById = cache(async (id: string): Promise<Post | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  return (data as Post | null) ?? null;
});

export async function listProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  return (data as Profile[]) ?? [];
}

export const getHomepagePromo = cache(async (): Promise<HomepagePromo> => {
  const supabase = await createClient();
  const { data } = await supabase.from("homepage_promo").select("*").eq("id", "default").maybeSingle();
  return (data as HomepagePromo | null) ?? DEFAULT_HOMEPAGE_PROMO;
});

export async function adminCounts() {
  const supabase = await createClient();
  const [recipes, pending, posts, categories, profiles] = await Promise.all([
    supabase.from("recipes").select("id", { count: "exact", head: true }),
    supabase.from("recipes").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);
  return {
    recipes: recipes.count ?? 0,
    pending: pending.count ?? 0,
    posts: posts.count ?? 0,
    categories: categories.count ?? 0,
    profiles: profiles.count ?? 0,
  };
}

import { cache } from "react";
import { randomInt } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { easternDayRange } from "@/lib/format";
import { pointsFromCounts, standingsFor } from "@/lib/standings";
import { normalizeIngredientGroups } from "@/lib/ingredients";
import { normalizeNutrition } from "@/lib/nutrition";
import { normalizeStepGroups } from "@/lib/steps";
import type { AdminRecipeTag, BlogCategory, Category, HomepagePromo, Post, PostWithAuthor, Profile, Rating, Recipe, RecipeTag, RecipeWithExtras } from "@/lib/types";


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

function normalizePost<T extends Post>(row: T): T {
  return {
    ...row,
    categories: Array.isArray(row.categories)
      ? row.categories.map((c) => String(c).trim()).filter(Boolean)
      : [],
    tags: Array.isArray(row.tags) ? row.tags.map((t) => String(t).trim()).filter(Boolean) : [],
  };
}

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

/** Blog categories only — never use `getCategories()` (recipe categories) for posts. */
export const getBlogCategories = cache(async (): Promise<BlogCategory[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("blog_categories").select("*").order("sort_order").order("name");
  return (data as BlogCategory[]) ?? [];
});

/** All available recipe/blog tags: active tags plus every tag used on recipes or posts. */
export const getRecipeTags = cache(async (): Promise<RecipeTag[]> => {
  const supabase = await createClient();
  const [{ data: active }, { data: recipes }, { data: posts }] = await Promise.all([
    supabase.from("recipe_tags").select("*").order("sort_order").order("name"),
    supabase.from("recipes").select("tags"),
    supabase.from("posts").select("tags"),
  ]);

  const activeRows = (active as RecipeTag[] | null) ?? [];
  const byName = new Map<string, RecipeTag>(activeRows.map((t) => [t.name, t]));

  for (const row of [...(recipes ?? []), ...(posts ?? [])]) {
    for (const tag of row.tags ?? []) {
      if (!tag || byName.has(tag)) continue;
      byName.set(tag, { name: tag, sort_order: 999, created_at: "" });
    }
  }

  const activeNames = new Set(activeRows.map((t) => t.name));
  return [...byName.values()].sort((a, b) => {
    const aActive = activeNames.has(a.name);
    const bActive = activeNames.has(b.name);
    if (aActive && bActive) return a.sort_order - b.sort_order || a.name.localeCompare(b.name);
    if (aActive) return -1;
    if (bActive) return 1;
    return a.name.localeCompare(b.name);
  });
});

/** All tags for admin: saved active tags plus every tag currently used on recipes or posts. */
export const getAdminRecipeTags = cache(async (): Promise<AdminRecipeTag[]> => {
  const supabase = await createClient();
  const [{ data: active }, { data: recipes }, { data: posts }] = await Promise.all([
    supabase.from("recipe_tags").select("name, sort_order").order("sort_order").order("name"),
    supabase.from("recipes").select("tags"),
    supabase.from("posts").select("tags"),
  ]);

  const recipeCounts = new Map<string, number>();
  for (const row of recipes ?? []) {
    for (const tag of row.tags ?? []) {
      if (!tag) continue;
      recipeCounts.set(tag, (recipeCounts.get(tag) ?? 0) + 1);
    }
  }

  const postCounts = new Map<string, number>();
  for (const row of posts ?? []) {
    for (const tag of row.tags ?? []) {
      if (!tag) continue;
      postCounts.set(tag, (postCounts.get(tag) ?? 0) + 1);
    }
  }

  const activeRows = active ?? [];
  const activeNames = new Set(activeRows.map((t) => t.name));
  const names = new Set<string>([...activeNames, ...recipeCounts.keys(), ...postCounts.keys()]);

  return [...names]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({
      name,
      recipeCount: recipeCounts.get(name) ?? 0,
      postCount: postCounts.get(name) ?? 0,
      sort_order: activeRows.find((t) => t.name === name)?.sort_order ?? 999,
    }));
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
  recipe.equipment = recipe.equipment ?? [];
  recipe.ingredients = normalizeIngredientGroups(recipe.ingredients);
  recipe.steps = normalizeStepGroups(recipe.steps);
  recipe.notes = recipe.notes ?? null;
  recipe.nutrition = normalizeNutrition(recipe.nutrition);
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

export type PostListFilters = {
  publishedOnly?: boolean;
  limit?: number;
  offset?: number;
  /** Profile username or author uuid. */
  author?: string;
  /** Blog category id (not a recipe category). */
  category?: string;
  /** Exclude posts that include this blog category id. */
  excludeCategory?: string;
  /** Tag name stored on posts.tags. */
  tag?: string;
  /** Eastern calendar day YYYY-MM-DD. */
  date?: string;
};

async function resolveAuthorId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  author?: string,
): Promise<string | null> {
  if (!author) return null;
  const key = author.trim();
  if (!key) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) {
    return key;
  }
  const { data } = await supabase.from("profiles").select("id").eq("username", key.toLowerCase()).maybeSingle();
  return data?.id ?? null;
}

export async function listPosts(opts: PostListFilters = {}): Promise<Post[]> {
  const supabase = await createClient();
  const authorId = await resolveAuthorId(supabase, opts.author);
  if (opts.author && !authorId) return [];
  const dateRange = opts.date ? easternDayRange(opts.date) : null;
  if (opts.date && !dateRange) return [];

  let query = supabase
    .from("posts")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });
  if (opts.publishedOnly) query = query.eq("status", "published");
  if (authorId) query = query.eq("author_id", authorId);
  if (opts.category) query = query.contains("categories", [opts.category]);
  if (opts.excludeCategory) query = query.not("categories", "cs", `{${opts.excludeCategory}}`);
  if (opts.tag) query = query.contains("tags", [opts.tag]);
  if (dateRange) query = query.gte("published_at", dateRange.start).lt("published_at", dateRange.end);

  const from = opts.offset ?? 0;
  const to = from + (opts.limit ?? 60) - 1;
  const { data } = await query.range(from, to);
  return ((data as Post[]) ?? []).map((p) => normalizePost(p));
}

export async function countPosts(opts: Omit<PostListFilters, "limit" | "offset"> = {}): Promise<number> {
  const supabase = await createClient();
  const authorId = await resolveAuthorId(supabase, opts.author);
  if (opts.author && !authorId) return 0;
  const dateRange = opts.date ? easternDayRange(opts.date) : null;
  if (opts.date && !dateRange) return 0;

  let query = supabase.from("posts").select("id", { count: "exact", head: true });
  if (opts.publishedOnly) query = query.eq("status", "published");
  if (authorId) query = query.eq("author_id", authorId);
  if (opts.category) query = query.contains("categories", [opts.category]);
  if (opts.excludeCategory) query = query.not("categories", "cs", `{${opts.excludeCategory}}`);
  if (opts.tag) query = query.contains("tags", [opts.tag]);
  if (dateRange) query = query.gte("published_at", dateRange.start).lt("published_at", dateRange.end);

  const { count } = await query;
  return count ?? 0;
}

/** One published post chosen uniformly at random for the given filters. */
export async function pickRandomPost(opts: Omit<PostListFilters, "limit" | "offset"> = {}): Promise<Post | null> {
  const supabase = await createClient();
  const authorId = await resolveAuthorId(supabase, opts.author);
  if (opts.author && !authorId) return null;
  const dateRange = opts.date ? easternDayRange(opts.date) : null;
  if (opts.date && !dateRange) return null;

  let query = supabase.from("posts").select("id");
  if (opts.publishedOnly) query = query.eq("status", "published");
  if (authorId) query = query.eq("author_id", authorId);
  if (opts.category) query = query.contains("categories", [opts.category]);
  if (opts.excludeCategory) query = query.not("categories", "cs", `{${opts.excludeCategory}}`);
  if (opts.tag) query = query.contains("tags", [opts.tag]);
  if (dateRange) query = query.gte("published_at", dateRange.start).lt("published_at", dateRange.end);

  const { data: ids } = await query;
  if (!ids?.length) return null;

  const pick = ids[randomInt(ids.length)]!;
  const { data } = await supabase.from("posts").select("*").eq("id", pick.id).maybeSingle();
  if (!data) return null;
  return normalizePost(data as Post);
}

/** Look up a profile for blog author filter headings. */
export async function getProfileByUsernameOrId(key: string): Promise<Pick<Profile, "id" | "username" | "display_name"> | null> {
  const supabase = await createClient();
  const trimmed = key.trim();
  if (!trimmed) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)) {
    const { data } = await supabase.from("profiles").select("id, username, display_name").eq("id", trimmed).maybeSingle();
    return data;
  }
  const { data } = await supabase.from("profiles").select("id, username, display_name").eq("username", trimmed.toLowerCase()).maybeSingle();
  return data;
}



/** Other published posts for a related row — same author first, then recent fill. */
export async function listRelatedPosts(opts: {
  excludeId: string;
  authorId?: string | null;
  /** When set, only include posts that have this blog category. */
  category?: string;
  /** When set, skip posts that include this blog category. */
  excludeCategory?: string;
  limit?: number;
}): Promise<Post[]> {
  const limit = opts.limit ?? 3;
  const supabase = await createClient();
  const out: Post[] = [];
  const seen = new Set<string>([opts.excludeId]);
  const category = opts.category?.trim() || "";
  const excludeCategory = opts.excludeCategory?.trim() || "";

  if (opts.authorId) {
    let query = supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .eq("author_id", opts.authorId)
      .neq("id", opts.excludeId)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (category) query = query.contains("categories", [category]);
    if (excludeCategory) query = query.not("categories", "cs", `{${excludeCategory}}`);
    const { data } = await query;
    for (const row of (data as Post[]) ?? []) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
      if (out.length >= limit) return out;
    }
  }

  let fill = supabase
    .from("posts")
    .select("*")
    .eq("status", "published")
    .neq("id", opts.excludeId)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(limit + out.length);
  if (category) fill = fill.contains("categories", [category]);
  if (excludeCategory) fill = fill.not("categories", "cs", `{${excludeCategory}}`);
  const { data } = await fill;
  for (const row of (data as Post[]) ?? []) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

export const getPostBySlug = cache(async (slug: string): Promise<PostWithAuthor | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("*, author:profiles!posts_author_id_fkey(username, display_name, avatar_path)")
    .eq("slug", slug)
    .maybeSingle();
  return data ? normalizePost({ ...(data as PostWithAuthor), categories: (data as Post).categories ?? [] }) : null;
});

export const getPostById = cache(async (id: string): Promise<Post | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("id, slug, title, excerpt, body, cover_path, head_json, seo_title, meta_description, categories, tags, status, author_id, created_at, updated_at, published_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return normalizePost(data as Post);
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
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [recipes, pending, posts, categories, blogCategories, tags, profiles, referralsRecent] = await Promise.all([
    supabase.from("recipes").select("id", { count: "exact", head: true }),
    supabase.from("recipes").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    supabase.from("blog_categories").select("id", { count: "exact", head: true }),
    supabase.from("recipe_tags").select("name", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .not("referred_by", "is", null)
      .gte("created_at", weekAgo),
  ]);
  return {
    recipes: recipes.count ?? 0,
    pending: pending.count ?? 0,
    posts: posts.count ?? 0,
    categories: categories.count ?? 0,
    blogCategories: blogCategories.count ?? 0,
    tags: tags.count ?? 0,
    profiles: profiles.count ?? 0,
    referralsRecent: referralsRecent.count ?? 0,
  };
}

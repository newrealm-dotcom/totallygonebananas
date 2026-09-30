// Row shapes for the tables in supabase/migrations.
// Tip: once your project is linked, `npm run db:types` generates exact types.

import type { IngredientGroup } from "@/lib/ingredients";
import type { RecipeNutrition } from "@/lib/nutrition";
import type { StepGroup } from "@/lib/steps";

export type Role = "member" | "editor" | "admin";
export type RecipeStatus = "draft" | "pending" | "published" | "rejected";
export type PostStatus = "draft" | "published";
export type MediaKind = "image" | "video";

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_path: string | null;
  bio: string | null;
  role: Role;
  created_at: string;
}

/** Recipe category (`public.categories`). Not for blog posts. */
export interface Category {
  id: string;
  name: string;
  emoji: string | null;
  tagline: string | null;
  sort_order: number;
}

/** Blog post category (`public.blog_categories`). Never reuse recipe Category. */
export interface BlogCategory {
  id: string;
  name: string;
  sort_order: number;
  created_at?: string;
}

export interface HomepagePromo {
  id: string;
  heading: string;
  body: string;
  button_label: string;
  button_href: string;
  image_path: string;
  updated_at: string;
}

export interface MediaRef {
  kind: MediaKind;
  path: string;
}

export interface Step {
  text: string;
  media?: MediaRef | null;
}

export interface RecipeMedia extends MediaRef {
  id: string;
  recipe_id: string;
  caption: string | null;
  position: number;
}

export interface Recipe {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category_id: string | null;
  emoji: string | null;
  total_minutes: number | null;
  /** @deprecated Prefer `notes`. Kept for older cards that overrode the time label. */
  time_note: string | null;
  /** Rich-text HTML notes from the recipe form. */
  notes: string | null;
  /** Estimated nutrition facts calculated from ingredients. */
  nutrition: RecipeNutrition | null;
  /** Free-form serving size, e.g. "8", "1 loaf", "makes 12 muffins". */
  servings: string | null;
  difficulty: number | null;
  tags: string[];
  equipment: string[];
  /** Titled ingredient lists; first group title may be empty. */
  ingredients: IngredientGroup[];
  /** Titled step lists; first group title may be empty. */
  steps: StepGroup[];
  cover_path: string | null;
  status: RecipeStatus;
  author_id: string | null;
  review_note: string | null;
  referred_by: string | null;
  adapted_from_name: string | null;
  adapted_from_url: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export type AuthorSummary = Pick<Profile, "username" | "display_name" | "avatar_path">;

export interface RecipeWithExtras extends Recipe {
  author: AuthorSummary | null;
  recipe_media: RecipeMedia[];
}

export interface Rating {
  recipe_id: string;
  avg_rating: number;
  ratings_count: number;
}

export interface CookLog {
  id: string;
  user_id: string;
  recipe_id: string;
  rating: number;
  tip: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  cover_path: string | null;
  head_json: Record<string, unknown> | unknown[] | null;
  seo_title: string | null;
  meta_description: string | null;
  /** Blog category ids from `blog_categories` — not recipe category ids. */
  categories: string[];
  status: PostStatus;
  author_id: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export type PostWithAuthor = Post & { author: AuthorSummary | null };

export const TAGS = ["vegan", "gluten-free", "dairy-free", "kid-friendly", "no added sugar", "quick"] as const;
export const ROLES = ["member", "editor", "admin"] as const;

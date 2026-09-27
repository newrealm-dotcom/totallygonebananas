// Row shapes for the tables in supabase/migrations.
// Tip: once your project is linked, `npm run db:types` generates exact types.

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

export interface Category {
  id: string;
  name: string;
  emoji: string | null;
  tagline: string | null;
  sort_order: number;
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
  time_note: string | null;
  servings: number | null;
  difficulty: number | null;
  tags: string[];
  ingredients: string[];
  steps: Step[];
  cover_path: string | null;
  status: RecipeStatus;
  author_id: string | null;
  review_note: string | null;
  referred_by: string | null;
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
  status: PostStatus;
  author_id: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export type PostWithAuthor = Post & { author: AuthorSummary | null };

export const TAGS = ["vegan", "gluten-free", "dairy-free", "kid-friendly", "no added sugar", "quick"] as const;
export const ROLES = ["member", "editor", "admin"] as const;

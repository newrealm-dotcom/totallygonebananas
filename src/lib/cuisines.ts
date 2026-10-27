import { titleCase } from "@/lib/format";

/** Default recipeCuisine for Google when a recipe has not been given another region. */
export const DEFAULT_CUISINE = "American";

/** Seed list. Live choices come from `recipe_cuisines`. */
export const CUISINES = [
  "American",
  "Southern",
  "Caribbean",
  "Mexican",
  "Filipino",
  "Indian",
  "Thai",
] as const;

/** Trim, collapse spaces, and title-case a cuisine name. Empty becomes American. */
export function normalizeCuisine(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (!cleaned) return DEFAULT_CUISINE;
  return titleCase(cleaned.toLowerCase());
}

export function cuisineIssue(name: string): string | null {
  if (name.length < 2) return "Cuisine needs at least 2 characters";
  if (name.length > 40) return "Keep the cuisine under 40 characters";
  if (!/^[\p{L}\p{N}](?:[\p{L}\p{N}'&., -]*[\p{L}\p{N}.])?$/u.test(name)) {
    return "Use letters, numbers, spaces, or hyphens";
  }
  return null;
}

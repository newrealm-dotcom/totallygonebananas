import { NextResponse } from "next/server";
import { countRecipes, getRatings, getSavedIds, getViewer, listRecipes, type RecipeFilters } from "@/lib/queries";
import { isValidTag, normalizeTag } from "@/lib/tags";

export const PAGE_SIZE = 12;

const str = (v: string | null) => (v && v.trim() ? v.trim() : undefined);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const limit = Math.min(PAGE_SIZE, Math.max(1, Number(url.searchParams.get("limit")) || PAGE_SIZE));
  const tagRaw = str(url.searchParams.get("tag"));
  const f: RecipeFilters = {
    q: str(url.searchParams.get("q"))?.slice(0, 100),
    category: str(url.searchParams.get("category")),
    tag: tagRaw && isValidTag(tagRaw) ? normalizeTag(tagRaw) : undefined,
    maxMinutes: Number(str(url.searchParams.get("time"))) || undefined,
    sort: (["new", "quick", "easy", "az"] as const).find((s) => s === str(url.searchParams.get("sort"))) ?? "new",
    limit,
    offset,
  };

  const [recipes, total, viewer] = await Promise.all([listRecipes(f), countRecipes(f), getViewer()]);
  const [ratings, saved] = await Promise.all([getRatings(recipes.map((r) => r.id)), getSavedIds(viewer.userId)]);

  return NextResponse.json({
    recipes,
    ratings: Object.fromEntries([...ratings.entries()]),
    saved: [...saved],
    total,
    offset,
    hasMore: offset + recipes.length < total,
  });
}

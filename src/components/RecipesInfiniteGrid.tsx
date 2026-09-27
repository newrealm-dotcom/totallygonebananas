"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RecipeCardData } from "@/lib/queries";
import type { Category, Rating } from "@/lib/types";
import { RecipeCard } from "@/components/RecipeCard";

const PAGE_SIZE = 40;

interface RecipesInfiniteGridProps {
  initialRecipes: RecipeCardData[];
  initialRatings: Record<string, Rating>;
  initialSaved: string[];
  categories: Category[];
  signedIn: boolean;
  showCategory: boolean;
  total: number;
  filters: { q?: string; category?: string; tag?: string; time?: string; sort?: string };
  empty: React.ReactNode;
}

export function RecipesInfiniteGrid({
  initialRecipes,
  initialRatings,
  initialSaved,
  categories,
  signedIn,
  showCategory,
  total,
  filters,
  empty,
}: RecipesInfiniteGridProps) {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [ratings, setRatings] = useState(initialRatings);
  const [saved, setSaved] = useState(() => new Set(initialSaved));
  const [hasMore, setHasMore] = useState(initialRecipes.length < total);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("offset", String(recipes.length));
      q.set("limit", String(PAGE_SIZE));
      if (filters.q) q.set("q", filters.q);
      if (filters.category) q.set("category", filters.category);
      if (filters.tag) q.set("tag", filters.tag);
      if (filters.time) q.set("time", filters.time);
      if (filters.sort && filters.sort !== "new") q.set("sort", filters.sort);
      const res = await fetch(`/api/recipes?${q}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as {
        recipes: RecipeCardData[];
        ratings: Record<string, Rating>;
        saved: string[];
        hasMore: boolean;
      };
      setRecipes((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...data.recipes.filter((r) => !seen.has(r.id))];
      });
      setRatings((prev) => ({ ...prev, ...data.ratings }));
      setSaved((prev) => {
        const next = new Set(prev);
        data.saved.forEach((id) => next.add(id));
        return next;
      });
      setHasMore(data.hasMore);
    } catch {
      /* keep hasMore so the sentinel can retry */
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [filters, hasMore, recipes.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

  if (!recipes.length) return <>{empty}</>;

  return (
    <div className="recipes-feed">
      <div className="grid">
        {recipes.map((r) => (
          <RecipeCard
            key={r.id}
            recipe={r}
            categories={categories}
            rating={ratings[r.id]}
            saved={saved.has(r.id)}
            signedIn={signedIn}
            showCategory={showCategory}
          />
        ))}
      </div>
      <div ref={sentinelRef} className="recipes-feed-sentinel" aria-hidden="true" />
      {loading && <p className="hint recipes-feed-status" role="status">Loading more recipes…</p>}
      {!hasMore && recipes.length > PAGE_SIZE && (
        <p className="hint recipes-feed-status">That&apos;s every recipe in this list.</p>
      )}
    </div>
  );
}

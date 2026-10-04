import type { Metadata } from "next";
import Link from "next/link";
import { countRecipes, getCategories, getRatings, getRecipeTagsByPopularity, getSavedIds, getViewer, listRecipes, type RecipeFilters } from "@/lib/queries";
import { CategoryStickers } from "@/components/CategoryStickers";
import { FilterPillsScroller } from "@/components/FilterPillsScroller";
import { FlipCounter } from "@/components/FlipCounter";
import { HeroSlide } from "@/components/HeroSlide";
import { RecipesInfiniteGrid } from "@/components/RecipesInfiniteGrid";
import { isValidTag, normalizeTag } from "@/lib/tags";
import { plural, titleCase } from "@/lib/format";

export const metadata: Metadata = { title: "Recipes" };

const PAGE_SIZE = 40;
const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function RecipesPage({ searchParams }: PageProps<"/recipes">) {
  const sp = await searchParams;
  const f: RecipeFilters = {
    q: str(sp.q)?.trim().slice(0, 100) || undefined,
    category: str(sp.category),
    tag: (() => {
      const t = str(sp.tag);
      return t && isValidTag(t) ? normalizeTag(t) : undefined;
    })(),
    sort: (["new", "quick", "easy", "az"] as const).find((s) => s === str(sp.sort)) ?? "new",
    limit: PAGE_SIZE,
    offset: 0,
  };
  const [categories, recipes, total, viewer, recipeTags] = await Promise.all([
    getCategories(),
    listRecipes(f),
    countRecipes(f),
    getViewer(),
    getRecipeTagsByPopularity(),
  ]);
  const [ratings, saved] = await Promise.all([getRatings(recipes.map((r) => r.id)), getSavedIds(viewer.userId)]);
  const cat = categories.find((c) => c.id === f.category);
  const href = (patch: Partial<Record<string, string | undefined>>) => {
    const q = new URLSearchParams();
    const merged = { q: f.q, category: f.category, tag: f.tag, sort: f.sort === "new" ? undefined : f.sort, ...patch };
    Object.entries(merged).forEach(([k, v]) => v && q.set(k, v));
    const s = q.toString();
    return `/recipes${s ? `?${s}` : ""}`;
  };
  const filtered = Boolean(f.q || f.category || f.tag);

  return (
    <div className="recipes-index">
      <div className="wrap">
        <div className="page-head recipes-index-hero">
          <div className="recipes-index-hero-copy">
            <h1>{titleCase(cat ? cat.name : "Every banana recipe")}</h1>
            <p className="lede">{cat?.tagline ?? "Every great recipe starts with what you've got. Filter by category or tag, or search for ingredients already in your kitchen. From quick snacks to slow Sunday loaves, there's a perfect match for every banana, no matter how spotty."}</p>
          </div>
          <div className="recipes-index-hero-art" aria-hidden="true">
            <div className="recipes-index-peek">
              <HeroSlide
                lightSrc="/main-slider/main-banana-02.webp"
                darkSrc="/main-slider/dark/dark-main-banana-02.webp"
                alt=""
              />
            </div>
          </div>
        </div>
      </div>

      <div className="recipes-index-band">
        <div className="recipes-index-rule" aria-hidden="true" />
      </div>

      <div className="recipes-index-panel">
        <div className="wrap">
          <form className="filters" action="/recipes" role="search">
            {f.category && <input type="hidden" name="category" value={f.category} />}
            {f.tag && <input type="hidden" name="tag" value={f.tag} />}
            <div className="f search-f">
              <label htmlFor="q">Search</label>
              <input id="q" name="q" type="search" className="field" defaultValue={f.q} placeholder="Chocolate, oats, walnuts…" />
            </div>
            <div className="f">
              <label htmlFor="sort">Sort by</label>
              <select id="sort" name="sort" className="field filters-sort" defaultValue={f.sort}>
                <option value="new">Newest</option><option value="quick">Quickest</option><option value="easy">Easiest</option><option value="az">A to Z</option>
              </select>
            </div>
            <button className="btn" type="submit">Apply</button>
          </form>

          <div className="filter-pills">
            <div className="filter-pills-row">
              <span className="filter-pills-label">Categories:</span>
              <FilterPillsScroller label="categories">
                <CategoryStickers small categories={categories} active={f.category} hrefFor={(id) => href({ category: id ?? undefined })} />
              </FilterPillsScroller>
            </div>
            {recipeTags.length > 0 && (
              <div className="filter-pills-row">
                <span className="filter-pills-label">Tags:</span>
                <FilterPillsScroller label="tags">
                  <nav className="chips" aria-label="Tags">
                    {recipeTags.map((t) => (
                      <Link key={t.name} className="chip" href={href({ tag: f.tag === t.name ? undefined : t.name })} aria-current={f.tag === t.name ? "true" : undefined}>{t.name}</Link>
                    ))}
                  </nav>
                </FilterPillsScroller>
              </div>
            )}
          </div>

          <div className="result-bar">
            <p aria-live="polite">
              <span className="sr">{plural(total, "recipe")}{filtered ? " found" : ""}</span>
              <span aria-hidden="true" className="result-bar-count">
                <FlipCounter value={total} persistKey={filtered ? undefined : "recipes-index-count"} />
                <span>
                  {total === 1 ? "recipe" : "recipes"}
                  {filtered ? " found" : ""}
                </span>
              </span>
            </p>
            {filtered && <Link className="btn ghost small" href="/recipes">Clear filters</Link>}
          </div>

          <RecipesInfiniteGrid
            key={[f.q, f.category, f.tag, f.sort].join("|")}
            initialRecipes={recipes}
            initialRatings={Object.fromEntries(ratings)}
            initialSaved={[...saved]}
            categories={categories}
            signedIn={!!viewer.userId}
            showCategory={!cat}
            total={total}
            filters={{
              q: f.q,
              category: f.category,
              tag: f.tag,
              sort: f.sort,
            }}
            empty={<div className="empty"><span className="big">🍌🔍</span><p>Nothing matches all of those filters.</p><Link className="btn ghost" href="/recipes">Clear filters</Link></div>}
          />
        </div>
      </div>
    </div>
  );
}

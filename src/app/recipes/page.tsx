import type { Metadata } from "next";
import Link from "next/link";
import { countRecipes, getCategories, getRatings, getSavedIds, getViewer, listRecipes, type RecipeFilters } from "@/lib/queries";
import { CategoryStickers } from "@/components/CategoryStickers";
import { RecipesInfiniteGrid } from "@/components/RecipesInfiniteGrid";
import { TAGS } from "@/lib/types";
import { plural, titleCase } from "@/lib/format";

export const metadata: Metadata = { title: "Recipes" };

const PAGE_SIZE = 40;
const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function RecipesPage({ searchParams }: PageProps<"/recipes">) {
  const sp = await searchParams;
  const f: RecipeFilters = {
    q: str(sp.q)?.trim().slice(0, 100) || undefined,
    category: str(sp.category),
    tag: TAGS.includes(str(sp.tag) as (typeof TAGS)[number]) ? str(sp.tag) : undefined,
    sort: (["new", "quick", "easy", "az"] as const).find((s) => s === str(sp.sort)) ?? "new",
    limit: PAGE_SIZE,
    offset: 0,
  };
  const [categories, recipes, total, viewer] = await Promise.all([
    getCategories(),
    listRecipes(f),
    countRecipes(f),
    getViewer(),
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
    <div className="wrap">
      <div className="page-head">
        <h1>{titleCase(cat ? cat.name : "Every banana recipe")}</h1>
        <p className="lede">{cat?.tagline ?? "Filter by category, tag or search for whatever's already in your kitchen."}</p>
      </div>

      <form className="filters" action="/recipes" role="search">
        {f.category && <input type="hidden" name="category" value={f.category} />}
        {f.tag && <input type="hidden" name="tag" value={f.tag} />}
        <div className="f search-f">
          <label htmlFor="q">Search</label>
          <input id="q" name="q" type="search" className="field" defaultValue={f.q} placeholder="Chocolate, oats, walnuts…" />
        </div>
        <div className="f">
          <label htmlFor="sort">Sort by</label>
          <select id="sort" name="sort" className="field" defaultValue={f.sort}>
            <option value="new">Newest</option><option value="quick">Quickest</option><option value="easy">Easiest</option><option value="az">A to Z</option>
          </select>
        </div>
        <button className="btn" type="submit">Apply</button>
      </form>

      <CategoryStickers small categories={categories} active={f.category} hrefFor={(id) => href({ category: id ?? undefined })} />
      <nav className="chips" aria-label="Diet and lifestyle">
        {TAGS.map((t) => (
          <Link key={t} className="chip" href={href({ tag: f.tag === t ? undefined : t })} aria-current={f.tag === t ? "true" : undefined}>{t}</Link>
        ))}
      </nav>

      <div className="result-bar">
        <p aria-live="polite">{plural(total, "recipe")}{filtered ? " found" : ""}</p>
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
      <div style={{ height: "3rem" }} />
    </div>
  );
}

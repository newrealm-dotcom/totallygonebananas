"use client";

import { useId, useState } from "react";
import Link from "next/link";
import type { RecipeCardData } from "@/lib/queries";
import type { Category, Rating, RecipeStatus } from "@/lib/types";
import { shortDate } from "@/lib/format";
import { RecipeCard } from "@/components/RecipeCard";
import { DeleteRecipeButton } from "@/components/OwnerTools";
import { MediaView } from "@/components/MediaView";

type SortMode = "date" | "az";

const STATUS_LABEL: Record<RecipeStatus, string> = {
  draft: "Draft",
  pending: "In review",
  published: "Published",
  rejected: "Sent back",
};

function matchesQuery(title: string, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return title.toLowerCase().includes(needle);
}

function sortByTitleThenDate<T>(
  items: T[],
  sort: SortMode,
  titleOf: (item: T) => string,
  dateOf: (item: T) => string,
): T[] {
  const next = [...items];
  if (sort === "az") {
    next.sort((a, b) => titleOf(a).localeCompare(titleOf(b), undefined, { sensitivity: "base" }));
  } else {
    next.sort((a, b) => dateOf(b).localeCompare(dateOf(a)));
  }
  return next;
}

function ProfileSearchSort({
  q,
  sort,
  onQ,
  onSort,
  searchPlaceholder,
}: {
  q: string;
  sort: SortMode;
  onQ: (value: string) => void;
  onSort: (value: SortMode) => void;
  searchPlaceholder: string;
}) {
  const id = useId();
  const searchId = `${id}-q`;
  const sortId = `${id}-sort`;
  return (
    <form
      className="filters profile-collection-filters"
      role="search"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="f search-f">
        <label htmlFor={searchId}>Search</label>
        <input
          id={searchId}
          type="search"
          className="field"
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder={searchPlaceholder}
          autoComplete="off"
        />
      </div>
      <div className="f">
        <label htmlFor={sortId}>Sort by</label>
        <select
          id={sortId}
          className="field filters-sort"
          value={sort}
          onChange={(e) => onSort(e.target.value as SortMode)}
        >
          <option value="date">Date</option>
          <option value="az">A to Z</option>
        </select>
      </div>
    </form>
  );
}

function ProfileRecipeThumb({
  href,
  coverPath,
  emoji,
}: {
  href?: string;
  coverPath: string | null | undefined;
  emoji?: string | null;
}) {
  const thumb = (
    <span className="row-thumb">
      {coverPath ? (
        <MediaView path={coverPath} alt="" sizes="140px" />
      ) : (
        <span aria-hidden="true">{emoji || "🍌"}</span>
      )}
    </span>
  );
  if (!href) return thumb;
  return (
    <Link href={href} className="row-thumb-link" tabIndex={-1} aria-hidden="true">
      {thumb}
    </Link>
  );
}

function NoMatches({ q }: { q: string }) {
  return (
    <div className="empty">
      <p>No matches for “{q.trim()}”.</p>
    </div>
  );
}

export interface SavedRecipeItem extends RecipeCardData {
  savedAt: string;
}

export function ProfileSavedCollection({
  recipes,
  categories,
  ratings,
  empty,
}: {
  recipes: SavedRecipeItem[];
  categories: Category[];
  ratings: Record<string, Rating>;
  empty: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortMode>("date");
  if (!recipes.length) return <>{empty}</>;

  const visible = sortByTitleThenDate(
    recipes.filter((r) => matchesQuery(r.title, q)),
    sort,
    (r) => r.title,
    (r) => r.savedAt || r.published_at || r.created_at,
  );

  return (
    <div className="profile-collection">
      <ProfileSearchSort
        q={q}
        sort={sort}
        onQ={setQ}
        onSort={setSort}
        searchPlaceholder="Search saved recipes…"
      />
      {visible.length ? (
        <div className="grid">
          {visible.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              categories={categories}
              rating={ratings[r.id]}
              saved
              signedIn
              showCategory
            />
          ))}
        </div>
      ) : (
        <NoMatches q={q} />
      )}
    </div>
  );
}

export interface MyRecipeItem {
  id: string;
  slug: string;
  title: string;
  status: RecipeStatus;
  review_note: string | null;
  updated_at: string;
  cover_path: string | null;
  emoji: string | null;
}

export function ProfileMyRecipesCollection({
  recipes,
  canEditPublished,
  empty,
}: {
  recipes: MyRecipeItem[];
  canEditPublished: boolean;
  empty: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortMode>("date");
  if (!recipes.length) return <>{empty}</>;

  const visible = sortByTitleThenDate(
    recipes.filter((r) => matchesQuery(r.title, q)),
    sort,
    (r) => r.title,
    (r) => r.updated_at,
  );

  return (
    <div className="profile-collection">
      <ProfileSearchSort
        q={q}
        sort={sort}
        onQ={setQ}
        onSort={setSort}
        searchPlaceholder="Search your recipes…"
      />
      {visible.length ? (
        <ul className="rows">
          {visible.map((m) => (
            <li key={m.id} className="row">
              <div className="row-main">
                <ProfileRecipeThumb href={`/recipes/${m.slug}`} coverPath={m.cover_path} emoji={m.emoji} />
                <div className="row-copy">
                  <h3>
                    <Link href={`/recipes/${m.slug}`}>{m.title}</Link>
                  </h3>
                  <p>
                    Updated {shortDate(m.updated_at)}
                    {m.status === "rejected" && m.review_note ? `. Editor's note: “${m.review_note}”` : ""}
                  </p>
                </div>
              </div>
              <div className="end">
                <span className={`status s-${m.status}`}>{STATUS_LABEL[m.status]}</span>
                {(m.status !== "published" || canEditPublished) && (
                  <>
                    <Link className="btn ghost small" href={`/recipes/${m.slug}/edit`}>
                      Edit
                    </Link>
                    <DeleteRecipeButton recipeId={m.id} afterDelete="refresh" />
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <NoMatches q={q} />
      )}
    </div>
  );
}

export interface CookingLogItem {
  id: string;
  rating: number;
  tip: string | null;
  created_at: string;
  recipe: { slug: string; title: string; cover_path: string | null; emoji: string | null } | null;
}

export function ProfileCookingHistoryCollection({
  logs,
  empty,
}: {
  logs: CookingLogItem[];
  empty: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortMode>("date");
  if (!logs.length) return <>{empty}</>;

  const titleOf = (l: CookingLogItem) => l.recipe?.title ?? "A removed recipe";
  const visible = sortByTitleThenDate(
    logs.filter((l) => matchesQuery(titleOf(l), q)),
    sort,
    titleOf,
    (l) => l.created_at,
  );

  return (
    <div className="profile-collection">
      <ProfileSearchSort
        q={q}
        sort={sort}
        onQ={setQ}
        onSort={setSort}
        searchPlaceholder="Search cooking history…"
      />
      {visible.length ? (
        <ul className="rows">
          {visible.map((l) => (
            <li key={l.id} className="row">
              <div className="row-main">
                <ProfileRecipeThumb
                  href={l.recipe ? `/recipes/${l.recipe.slug}` : undefined}
                  coverPath={l.recipe?.cover_path}
                  emoji={l.recipe?.emoji}
                />
                <div className="row-copy">
                  <h3>
                    {l.recipe ? <Link href={`/recipes/${l.recipe.slug}`}>{l.recipe.title}</Link> : "A removed recipe"}
                  </h3>
                  <p>
                    {shortDate(l.created_at)}:{" "}
                    <span role="img" aria-label={`${l.rating} out of 5`}>
                      {"🍌".repeat(l.rating)}
                    </span>
                    {l.tip ? ` “${l.tip}”` : ""}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <NoMatches q={q} />
      )}
    </div>
  );
}

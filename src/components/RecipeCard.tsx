"use client";

import Link from "next/link";
import type { RecipeCardData } from "@/lib/queries";
import type { Category, Rating } from "@/lib/types";
import { tintFor, titleCase } from "@/lib/format";
import { MediaView } from "@/components/MediaView";
import { SaveButton } from "@/components/SaveButton";

export function RecipeCard({ recipe, categories, rating, saved, signedIn, showCategory = true }: {
  recipe: RecipeCardData; categories: Category[]; rating?: Rating; saved: boolean; signedIn: boolean; showCategory?: boolean;
}) {
  const recipeCats = (recipe.categories ?? [])
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is Category => !!c);
  const primary = recipeCats[0];
  return (
    <article className="card">
      <div className="art" style={{ background: tintFor(primary?.id ?? null, categories) }}>
        {recipe.cover_path ? (
          <MediaView path={recipe.cover_path} alt="" sizes="(max-width: 560px) 100vw, 280px" />
        ) : (
          <span aria-hidden="true">{recipe.emoji || primary?.emoji || "🍌"}</span>
        )}
        {showCategory && primary && (
          <span className="tag-cat">
            {primary.name}
            {recipeCats.length > 1 ? ` +${recipeCats.length - 1}` : ""}
          </span>
        )}
      </div>
      <SaveButton recipeId={recipe.id} title={recipe.title} initialSaved={saved} signedIn={signedIn} className="heart-corner" />
      <div className="inner">
        <h3><Link href={`/recipes/${recipe.slug}`}>{titleCase(recipe.title)}</Link></h3>
        {recipe.description && <p>{recipe.description}</p>}
        <div className="meta">
          {rating && <span className="pill rate" aria-label={`Rated ${rating.avg_rating} out of 5 by ${rating.ratings_count} cooks`}>★ {rating.avg_rating} ({rating.ratings_count})</span>}
          {recipe.tags.slice(0, 2).map((t) => <span key={t} className="pill">{t}</span>)}
        </div>
      </div>
    </article>
  );
}

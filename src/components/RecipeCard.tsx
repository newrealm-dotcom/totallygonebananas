import Link from "next/link";
import type { RecipeCardData } from "@/lib/queries";
import type { Category, Rating } from "@/lib/types";
import { timeLabel, tintFor, titleCase } from "@/lib/format";
import { MediaView } from "@/components/MediaView";
import { SaveButton } from "@/components/SaveButton";
import { Difficulty } from "@/components/Difficulty";

export function RecipeCard({ recipe, categories, rating, saved, signedIn, showCategory = true }: {
  recipe: RecipeCardData; categories: Category[]; rating?: Rating; saved: boolean; signedIn: boolean; showCategory?: boolean;
}) {
  const cat = categories.find((c) => c.id === recipe.category_id);
  return (
    <article className="card">
      <div className="art" style={{ background: tintFor(recipe.category_id, categories) }}>
        {recipe.cover_path ? (
          <MediaView path={recipe.cover_path} alt="" sizes="(max-width: 560px) 100vw, 300px" />
        ) : (
          <span aria-hidden="true">{recipe.emoji || cat?.emoji || "🍌"}</span>
        )}
        {showCategory && cat && <span className="tag-cat">{cat.name}</span>}
      </div>
      <SaveButton recipeId={recipe.id} title={recipe.title} initialSaved={saved} signedIn={signedIn} className="heart-corner" />
      <div className="inner">
        <h3><Link href={`/recipes/${recipe.slug}`}>{titleCase(recipe.title)}</Link></h3>
        {recipe.description && <p>{recipe.description}</p>}
        <div className="meta">
          {timeLabel(recipe.total_minutes, recipe.time_note) && <span className="pill time">{timeLabel(recipe.total_minutes, recipe.time_note)}</span>}
          {recipe.difficulty ? <Difficulty value={recipe.difficulty} /> : null}
          {recipe.servings ? <span className="pill">Serves {recipe.servings}</span> : null}
          {rating && <span className="pill rate" aria-label={`Rated ${rating.avg_rating} out of 5 by ${rating.ratings_count} cooks`}>★ {rating.avg_rating} ({rating.ratings_count})</span>}
          {recipe.tags.slice(0, 2).map((t) => <span key={t} className="pill">{t}</span>)}
        </div>
      </div>
    </article>
  );
}

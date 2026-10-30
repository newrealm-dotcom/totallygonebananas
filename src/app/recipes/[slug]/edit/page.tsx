import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canEdit, getCategories, getRecipeBySlug, getRecipeCuisines, getRecipeTags, getViewer, isAdminRole, isEditorRole } from "@/lib/queries";
import { RecipeForm } from "@/components/RecipeForm";
import { valuesFromRecipe } from "@/lib/recipe-form-values";
import { sanitizeUserHtml } from "@/lib/sanitize-html";
import { titleCase } from "@/lib/format";

export const metadata: Metadata = { title: "Edit recipe" };

export default async function EditRecipePage({ params }: PageProps<"/recipes/[slug]/edit">) {
  const { slug } = await params;
  const [{ userId, profile, aal }, categories, recipe, recipeTags, cuisines] = await Promise.all([
    getViewer(),
    getCategories(),
    getRecipeBySlug(slug),
    getRecipeTags(),
    getRecipeCuisines(),
  ]);
  if (!userId) redirect(`/login?next=/recipes/${slug}/edit`);
  if (isAdminRole(profile) && aal !== "aal2") redirect(`/login/mfa?next=${encodeURIComponent(`/recipes/${slug}/edit`)}`);
  if (!recipe) notFound();
  if (!canEdit(recipe, userId, profile, aal)) redirect(`/recipes/${slug}`);
  const initial = valuesFromRecipe(recipe);
  initial.notes = sanitizeUserHtml(initial.notes);
  return (
    <div className="wrap narrow">
      <div className="page-head">
        <h1>Edit recipe</h1>
        <p className="lede">{titleCase(recipe.title)}</p>
      </div>
      <RecipeForm
        userId={userId}
        isEditor={isEditorRole(profile, aal)}
        categories={categories}
        cuisines={cuisines}
        activeTags={recipeTags.map((t) => t.name)}
        recipeId={recipe.id}
        initial={initial}
        initialStatus={recipe.status}
      />
    </div>
  );
}

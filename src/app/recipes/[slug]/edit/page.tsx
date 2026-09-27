import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canEdit, getCategories, getRecipeBySlug, getViewer, isEditorRole } from "@/lib/queries";
import { RecipeForm, valuesFromRecipe } from "@/components/RecipeForm";
import { titleCase } from "@/lib/format";

export const metadata: Metadata = { title: "Edit recipe" };

export default async function EditRecipePage({ params }: PageProps<"/recipes/[slug]/edit">) {
  const { slug } = await params;
  const [{ userId, profile }, categories, recipe] = await Promise.all([getViewer(), getCategories(), getRecipeBySlug(slug)]);
  if (!userId) redirect(`/login?next=/recipes/${slug}/edit`);
  if (!recipe) notFound();
  if (!canEdit(recipe, userId, profile)) redirect(`/recipes/${slug}`);
  return (
    <div className="wrap narrow">
      <div className="page-head">
        <h1>Edit recipe</h1>
        <p className="lede">{titleCase(recipe.title)}</p>
      </div>
      <RecipeForm userId={userId} isEditor={isEditorRole(profile)} categories={categories} recipeId={recipe.id} initial={valuesFromRecipe(recipe)} />
    </div>
  );
}

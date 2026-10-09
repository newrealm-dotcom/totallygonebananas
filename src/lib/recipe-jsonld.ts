import { siteUrl } from "@/lib/env";
import { publicUrl } from "@/lib/media";
import { titleCase } from "@/lib/format";
import type { IngredientGroup } from "@/lib/ingredients";
import type { StepGroup } from "@/lib/steps";
import type { RecipeWithExtras } from "@/lib/types";

function iso8601Duration(totalMinutes: number | null): string | undefined {
  if (totalMinutes == null || !Number.isFinite(totalMinutes) || totalMinutes <= 0) return undefined;
  const mins = Math.round(totalMinutes);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `PT${h}H${m}M`;
  if (h > 0) return `PT${h}H`;
  return `PT${m}M`;
}

function ingredientLines(groups: IngredientGroup[]): string[] {
  return groups.flatMap((g) => g.items.map((item) => item.text.trim()).filter(Boolean));
}

function instructionSteps(groups: StepGroup[]) {
  const steps: { "@type": "HowToStep"; name?: string; text: string; position: number }[] = [];
  let position = 1;
  for (const group of groups) {
    for (const step of group.steps) {
      const text = step.text.trim();
      if (!text) continue;
      steps.push({
        "@type": "HowToStep",
        ...(group.title ? { name: group.title } : {}),
        text,
        position: position++,
      });
    }
  }
  return steps;
}

/** Google Recipe rich-result JSON-LD from a published recipe row. */
export function buildRecipeJsonLd(recipe: RecipeWithExtras): Record<string, unknown> {
  const url = `${siteUrl()}/recipes/${recipe.slug}`;
  const image = publicUrl(recipe.cover_path);
  const ingredients = ingredientLines(recipe.ingredients);
  const instructions = instructionSteps(recipe.steps);
  const totalTime = iso8601Duration(recipe.total_minutes);
  const authorName = recipe.author?.display_name?.trim() || "Totally Gone Bananas";

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: titleCase(recipe.title),
    url,
    mainEntityOfPage: url,
    description: recipe.description?.trim() || undefined,
    datePublished: recipe.published_at || undefined,
    dateModified: recipe.updated_at || undefined,
    author: {
      "@type": "Person",
      name: authorName,
    },
    recipeIngredient: ingredients,
    recipeInstructions: instructions,
  };

  if (image) data.image = [image];
  if (totalTime) data.totalTime = totalTime;
  if (recipe.servings) data.recipeYield = String(recipe.servings);
  if (recipe.tags?.length) data.keywords = recipe.tags.join(", ");

  const per = recipe.nutrition?.perServing;
  if (per) {
    data.nutrition = {
      "@type": "NutritionInformation",
      calories: `${Math.round(per.calories)} calories`,
      fatContent: `${Math.round(per.fat)} g`,
      saturatedFatContent: `${Math.round(per.saturatedFat)} g`,
      carbohydrateContent: `${Math.round(per.carbs)} g`,
      fiberContent: `${Math.round(per.fiber)} g`,
      sugarContent: `${Math.round(per.sugar)} g`,
      proteinContent: `${Math.round(per.protein)} g`,
      sodiumContent: `${Math.round(per.sodium)} mg`,
    };
  }

  return data;
}

export function jsonLdScript(value: unknown): string | null {
  if (value === null || typeof value !== "object") return null;
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

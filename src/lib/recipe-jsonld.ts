import { siteUrl } from "@/lib/env";
import { publicUrl } from "@/lib/media";
import { titleCase } from "@/lib/format";
import type { IngredientGroup } from "@/lib/ingredients";
import type { StepGroup } from "@/lib/steps";
import type { Rating, RecipeWithExtras } from "@/lib/types";

export interface RecipeJsonLdOptions {
  /** Resolved category display names (not ids). */
  categoryNames?: string[];
  /** First-party rating from `recipe_ratings` when present. */
  rating?: Rating | null;
}

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

/** Short phrase for HowToStep.name — avoid "Step 1" style labels (Google guideline). */
function stepName(text: string): string {
  const sentence = text.split(/(?<=[.!?])\s+/)[0]?.trim() || text.trim();
  if (sentence.length <= 80) return sentence;
  const cut = sentence.slice(0, 80);
  const atWord = cut.lastIndexOf(" ");
  return `${(atWord > 40 ? cut.slice(0, atWord) : cut).trimEnd()}…`;
}

function recipeImageUrl(recipe: RecipeWithExtras): string | null {
  const fromCover = publicUrl(recipe.cover_path);
  if (fromCover) return fromCover;
  const imageMedia = recipe.recipe_media.find((m) => m.kind === "image");
  return imageMedia ? publicUrl(imageMedia.path) : null;
}

function recipeVideo(recipe: RecipeWithExtras, image: string | null, title: string) {
  const videoMedia = recipe.recipe_media.find((m) => m.kind === "video");
  if (!videoMedia) return null;
  const contentUrl = publicUrl(videoMedia.path);
  if (!contentUrl) return null;
  return {
    "@type": "VideoObject",
    name: title,
    description: recipe.description?.trim() || title,
    contentUrl,
    ...(image ? { thumbnailUrl: [image] } : {}),
    ...(recipe.published_at ? { uploadDate: recipe.published_at } : {}),
  };
}

function buildHowToStep(
  text: string,
  position: number,
  pageUrl: string,
  stepMedia: { kind: "image" | "video"; path: string } | null | undefined,
  fallbackImage: string | null,
): Record<string, unknown> {
  const name = stepName(text);
  const entry: Record<string, unknown> = {
    "@type": "HowToStep",
    name,
    text,
    url: `${pageUrl}#${recipeStepAnchor(position)}`,
    position,
  };

  const mediaUrl = stepMedia?.path ? publicUrl(stepMedia.path) : null;
  if (stepMedia?.kind === "video" && mediaUrl) {
    entry.video = {
      "@type": "VideoObject",
      name,
      contentUrl: mediaUrl,
      ...(fallbackImage ? { thumbnailUrl: [fallbackImage] } : {}),
    };
  } else if (mediaUrl) {
    entry.image = mediaUrl;
  } else if (fallbackImage) {
    // Google recommends image or video on each step; use the dish photo when a step has none.
    entry.image = fallbackImage;
  }

  return entry;
}

function instructionSteps(
  groups: StepGroup[],
  pageUrl: string,
  fallbackImage: string | null,
) {
  const instructions: Record<string, unknown>[] = [];
  let position = 1;
  for (const group of groups) {
    const sectionSteps: Record<string, unknown>[] = [];
    for (const step of group.steps) {
      const text = step.text.trim();
      if (!text) continue;
      sectionSteps.push(buildHowToStep(text, position, pageUrl, step.media, fallbackImage));
      position += 1;
    }
    if (!sectionSteps.length) continue;
    const sectionName = group.title.trim();
    if (sectionName) {
      instructions.push({
        "@type": "HowToSection",
        name: sectionName,
        itemListElement: sectionSteps,
      });
    } else {
      instructions.push(...sectionSteps);
    }
  }
  return instructions;
}

/** Stable step fragment used in JSON-LD and the recipe page markup. */
export function recipeStepAnchor(position: number): string {
  return `step-${position}`;
}

export interface NumberedStepBlock {
  title: string;
  steps: {
    text: string;
    media?: { kind: "image" | "video"; path: string } | null;
    position: number;
    anchor: string;
  }[];
}

/** Assign sequential step anchors for recipe page markup (matches JSON-LD urls). */
export function numberRecipeStepBlocks(groups: StepGroup[]): NumberedStepBlock[] {
  let position = 0;
  return groups.map((group) => ({
    title: group.title,
    steps: group.steps.map((s) => {
      position += 1;
      return { ...s, position, anchor: recipeStepAnchor(position) };
    }),
  }));
}

/** Google Recipe rich-result JSON-LD from a published recipe row. */
export function buildRecipeJsonLd(
  recipe: RecipeWithExtras,
  opts: RecipeJsonLdOptions = {},
): Record<string, unknown> {
  const url = `${siteUrl()}/recipes/${recipe.slug}`;
  const title = titleCase(recipe.title);
  const image = recipeImageUrl(recipe);
  const ingredients = ingredientLines(recipe.ingredients);
  const instructions = instructionSteps(recipe.steps, url, image);
  const totalTime = iso8601Duration(recipe.total_minutes);
  const authorName = recipe.author?.display_name?.trim() || "Totally Gone Bananas";
  const video = recipeVideo(recipe, image, title);

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: title,
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
  if (opts.categoryNames?.length) {
    data.recipeCategory = opts.categoryNames.length === 1
      ? opts.categoryNames[0]
      : opts.categoryNames;
  }
  if (video) data.video = video;

  const rating = opts.rating;
  if (rating && rating.ratings_count > 0 && rating.avg_rating > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(rating.avg_rating),
      ratingCount: rating.ratings_count,
      bestRating: 5,
      worstRating: 1,
    };
  }

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

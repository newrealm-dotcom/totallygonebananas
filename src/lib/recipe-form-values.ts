import { publicUrl } from "@/lib/media";
import type { MediaKind } from "@/lib/types";

export interface Upload {
  id: string;
  kind: MediaKind;
  path: string | null;
  preview: string;
  status: "uploading" | "done" | "error";
  error?: string;
  caption: string;
  /** Uploaded during this session (safe to delete from Storage if removed). */
  fresh: boolean;
}

export interface Row {
  id: string;
  text: string;
}

export interface StepRow {
  id: string;
  text: string;
  media: Upload | null;
}

export interface RecipeFormValues {
  title: string;
  description: string;
  categoryId: string;
  newCatName: string;
  newCatEmoji: string;
  emoji: string;
  totalMinutes: string;
  timeNote: string;
  servings: string;
  difficulty: number;
  tags: string[];
  equipment: Row[];
  ingredients: Row[];
  steps: StepRow[];
  gallery: Upload[];
}

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const emptyRow = (): Row => ({ id: uid(), text: "" });
const emptyStep = (): StepRow => ({ id: uid(), text: "", media: null });

export function blankValues(categoryId = ""): RecipeFormValues {
  return {
    title: "",
    description: "",
    categoryId,
    newCatName: "",
    newCatEmoji: "",
    emoji: "",
    totalMinutes: "",
    timeNote: "",
    servings: "",
    difficulty: 2,
    tags: [],
    equipment: [emptyRow()],
    ingredients: [emptyRow(), emptyRow(), emptyRow()],
    steps: [emptyStep(), emptyStep()],
    gallery: [],
  };
}

/** Builds form values for editing an existing recipe. Safe to call from Server Components. */
export function valuesFromRecipe(r: {
  title: string;
  description: string | null;
  category_id: string | null;
  emoji: string | null;
  total_minutes: number | null;
  time_note: string | null;
  servings: number | null;
  difficulty: number | null;
  tags: string[] | null;
  equipment?: string[] | null;
  ingredients: string[] | null;
  steps: { text: string; media?: { kind: MediaKind; path: string } | null }[] | null;
  recipe_media: { kind: MediaKind; path: string; caption: string | null }[] | null;
}): RecipeFormValues {
  const existing = (kind: MediaKind, path: string, caption = ""): Upload => ({
    id: uid(),
    kind,
    path,
    preview: publicUrl(path) ?? "",
    status: "done",
    caption,
    fresh: false,
  });
  const equipment = r.equipment ?? [];
  const ingredients = r.ingredients ?? [];
  const steps = r.steps ?? [];
  const media = r.recipe_media ?? [];
  return {
    title: r.title,
    description: r.description ?? "",
    categoryId: r.category_id ?? "",
    newCatName: "",
    newCatEmoji: "",
    emoji: r.emoji ?? "",
    totalMinutes: r.total_minutes ? String(r.total_minutes) : "",
    timeNote: r.time_note ?? "",
    servings: r.servings ? String(r.servings) : "",
    difficulty: r.difficulty ?? 2,
    tags: r.tags ?? [],
    equipment: equipment.length ? equipment.map((text) => ({ id: uid(), text })) : [emptyRow()],
    ingredients: ingredients.length ? ingredients.map((text) => ({ id: uid(), text })) : [emptyRow()],
    steps: steps.length
      ? steps.map((s) => ({ id: uid(), text: s.text, media: s.media ? existing(s.media.kind, s.media.path) : null }))
      : [emptyStep()],
    gallery: media.map((m) => existing(m.kind, m.path, m.caption ?? "")),
  };
}

/** Merge a local draft onto defaults so a partial/stale draft can't crash the form. */
export function mergeRecipeDraft(base: RecipeFormValues, draft: Partial<RecipeFormValues> | null | undefined): RecipeFormValues {
  if (!draft) return base;
  return {
    ...base,
    ...draft,
    description: draft.description ?? base.description,
    tags: Array.isArray(draft.tags) ? draft.tags : base.tags,
    equipment: Array.isArray(draft.equipment) && draft.equipment.length ? draft.equipment : base.equipment,
    ingredients: Array.isArray(draft.ingredients) && draft.ingredients.length ? draft.ingredients : base.ingredients,
    steps: Array.isArray(draft.steps) && draft.steps.length ? draft.steps : base.steps,
    gallery: Array.isArray(draft.gallery) ? draft.gallery : base.gallery,
  };
}

import { publicUrl } from "@/lib/media";
import { normalizeIngredientGroups, type IngredientGroup } from "@/lib/ingredients";
import { normalizeStepGroups, type StepGroup } from "@/lib/steps";
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

export interface IngredientRow {
  id: string;
  text: string;
  url: string;
}

export interface StepRow {
  id: string;
  text: string;
  media: Upload | null;
}

export interface IngredientGroupRow {
  id: string;
  title: string;
  items: IngredientRow[];
}

export interface StepGroupRow {
  id: string;
  title: string;
  steps: StepRow[];
}

export interface RecipeFormValues {
  title: string;
  description: string;
  categoryIds: string[];
  /** Editor-only categories created in this session (not yet in the catalog). */
  pendingCategories: { id: string; name: string; emoji: string }[];
  emoji: string;
  totalMinutes: string;
  notes: string;
  servings: string;
  difficulty: number | null;
  tags: string[];
  equipment: Row[];
  ingredientGroups: IngredientGroupRow[];
  stepGroups: StepGroupRow[];
  gallery: Upload[];
  adaptedFromName: string;
  adaptedFromUrl: string;
}

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const emptyRow = (): Row => ({ id: uid(), text: "" });
const emptyIngredientRow = (): IngredientRow => ({ id: uid(), text: "", url: "" });
const emptyStep = (): StepRow => ({ id: uid(), text: "", media: null });
const emptyIngredientGroup = (title = ""): IngredientGroupRow => ({
  id: uid(),
  title,
  items: [emptyIngredientRow(), emptyIngredientRow(), emptyIngredientRow()],
});
const emptyStepGroup = (title = ""): StepGroupRow => ({
  id: uid(),
  title,
  steps: [emptyStep(), emptyStep()],
});

/** Stable IDs for the blank form so SSR HTML matches client hydration. */
export function blankValues(categoryIds: string[] = []): RecipeFormValues {
  return {
    title: "",
    description: "",
    categoryIds,
    pendingCategories: [],
    emoji: "",
    totalMinutes: "",
    notes: "",
    servings: "",
    difficulty: null,
    tags: [],
    equipment: [{ id: "equip-0", text: "" }],
    ingredientGroups: [{
      id: "ing-group-0",
      title: "",
      items: [
        { id: "ing-0-0", text: "", url: "" },
        { id: "ing-0-1", text: "", url: "" },
        { id: "ing-0-2", text: "", url: "" },
      ],
    }],
    stepGroups: [{
      id: "step-group-0",
      title: "",
      steps: [
        { id: "step-0-0", text: "", media: null },
        { id: "step-0-1", text: "", media: null },
      ],
    }],
    gallery: [],
    adaptedFromName: "",
    adaptedFromUrl: "",
  };
}

function groupsToFormRows(groups: IngredientGroup[]): IngredientGroupRow[] {
  return groups.map((g) => ({
    id: uid(),
    title: g.title,
    items: g.items.length
      ? g.items.map((item) => ({ id: uid(), text: item.text, url: item.url }))
      : [emptyIngredientRow()],
  }));
}

function stepGroupsToFormRows(groups: StepGroup[], existing: (kind: MediaKind, path: string, caption?: string) => Upload): StepGroupRow[] {
  return groups.map((g) => ({
    id: uid(),
    title: g.title,
    steps: g.steps.length
      ? g.steps.map((s) => ({
          id: uid(),
          text: s.text,
          media: s.media ? existing(s.media.kind, s.media.path) : null,
        }))
      : [emptyStep()],
  }));
}

/** Builds form values for editing an existing recipe. Safe to call from Server Components. */
export function valuesFromRecipe(r: {
  title: string;
  description: string | null;
  categories?: string[] | null;
  category_id?: string | null;
  emoji: string | null;
  total_minutes: number | null;
  time_note?: string | null;
  notes?: string | null;
  servings: string | number | null;
  difficulty: number | null;
  tags: string[] | null;
  equipment?: string[] | null;
  ingredients: unknown;
  steps: unknown;
  recipe_media: { kind: MediaKind; path: string; caption: string | null }[] | null;
  adapted_from_name?: string | null;
  adapted_from_url?: string | null;
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
  const media = r.recipe_media ?? [];
  const ingredientGroups = normalizeIngredientGroups(r.ingredients);
  const stepGroups = normalizeStepGroups(r.steps);
  const notes =
    (r.notes && r.notes.trim()) ||
    (r.time_note && r.time_note.trim() ? `<p>${r.time_note.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>` : "");
  const categoryIds = Array.isArray(r.categories) && r.categories.length
    ? r.categories.map((id) => String(id).trim()).filter(Boolean)
    : r.category_id
      ? [r.category_id]
      : [];
  return {
    title: r.title,
    description: r.description ?? "",
    categoryIds,
    pendingCategories: [],
    emoji: r.emoji ?? "",
    totalMinutes: r.total_minutes ? String(r.total_minutes) : "",
    notes,
    servings: r.servings != null && String(r.servings).trim() ? String(r.servings) : "",
    difficulty: r.difficulty ?? null,
    tags: r.tags ?? [],
    equipment: equipment.length ? equipment.map((text) => ({ id: uid(), text })) : [emptyRow()],
    ingredientGroups: groupsToFormRows(ingredientGroups.length ? ingredientGroups : [{ title: "", items: [] }]),
    stepGroups: stepGroupsToFormRows(stepGroups.length ? stepGroups : [{ title: "", steps: [] }], existing),
    gallery: media.map((m) => existing(m.kind, m.path, m.caption ?? "")),
    adaptedFromName: r.adapted_from_name ?? "",
    adaptedFromUrl: r.adapted_from_url ?? "",
  };
}

/** Merge a local draft onto defaults so a partial/stale draft can't crash the form. */
export function mergeRecipeDraft(
  base: RecipeFormValues,
  draft: (Partial<RecipeFormValues> & { ingredients?: Row[]; steps?: StepRow[] }) | null | undefined,
): RecipeFormValues {
  if (!draft) return base;
  let ingredientGroups = base.ingredientGroups;
  if (Array.isArray(draft.ingredientGroups) && draft.ingredientGroups.length) {
    ingredientGroups = draft.ingredientGroups.map((g) => ({
      ...g,
      items: (g.items ?? []).map((r) => ({
        id: r.id,
        text: r.text ?? "",
        url: typeof r.url === "string" ? r.url : "",
      })),
    }));
  } else if (Array.isArray(draft.ingredients) && draft.ingredients.length) {
    ingredientGroups = [{
      id: uid(),
      title: "",
      items: draft.ingredients.map((r) => ({ id: r.id, text: r.text ?? "", url: "" })),
    }];
  }
  let stepGroups = base.stepGroups;
  if (Array.isArray(draft.stepGroups) && draft.stepGroups.length) {
    stepGroups = draft.stepGroups;
  } else if (Array.isArray(draft.steps) && draft.steps.length) {
    stepGroups = [{ id: uid(), title: "", steps: draft.steps }];
  }
  const legacy = draft as Partial<RecipeFormValues> & { categoryId?: string; timeNote?: string };
  const notes =
    typeof draft.notes === "string"
      ? draft.notes
      : typeof legacy.timeNote === "string" && legacy.timeNote.trim()
        ? `<p>${legacy.timeNote.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`
        : base.notes;
  const categoryIds = Array.isArray(draft.categoryIds)
    ? draft.categoryIds
    : typeof legacy.categoryId === "string" && legacy.categoryId && legacy.categoryId !== "__new"
      ? [legacy.categoryId]
      : base.categoryIds;
  return {
    ...base,
    ...draft,
    notes,
    description: draft.description ?? base.description,
    categoryIds,
    pendingCategories: Array.isArray(draft.pendingCategories) ? draft.pendingCategories : base.pendingCategories,
    tags: Array.isArray(draft.tags) ? draft.tags : base.tags,
    equipment: Array.isArray(draft.equipment) && draft.equipment.length ? draft.equipment : base.equipment,
    ingredientGroups,
    stepGroups,
    gallery: Array.isArray(draft.gallery) ? draft.gallery : base.gallery,
    adaptedFromName: typeof draft.adaptedFromName === "string" ? draft.adaptedFromName : base.adaptedFromName,
    adaptedFromUrl: typeof draft.adaptedFromUrl === "string" ? draft.adaptedFromUrl : base.adaptedFromUrl,
  };
}

export { emptyIngredientGroup, emptyIngredientRow, emptyRow, emptyStep, emptyStepGroup, uid };

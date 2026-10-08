"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { checkFile, kindOf, publicUrl, RECIPE_BUCKET } from "@/lib/media";
import { saveRecipe } from "@/actions/recipes";
import { TAGS, type Category, type MediaKind, type RecipeStatus } from "@/lib/types";
import { MAX_TAGS, normalizeTag, tagIssue } from "@/lib/tags";
import {
  blankValues,
  emptyIngredientGroup,
  emptyStepGroup,
  mergeRecipeDraft,
  type IngredientGroupRow,
  type IngredientRow,
  type RecipeFormValues,
  type StepGroupRow,
  type StepRow,
  type Upload,
} from "@/lib/recipe-form-values";
import { PostBodyEditor } from "@/components/PostBodyEditor";
import { ingredientUrlError } from "@/lib/ingredients";
import { slugify, titleCase } from "@/lib/format";

export type { RecipeFormValues, Upload };
export { blankValues, valuesFromRecipe } from "@/lib/recipe-form-values";

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const emptyEquipment = (): IngredientRow => ({ id: uid(), text: "", url: "" });
const emptyIngredient = (): IngredientRow => ({ id: uid(), text: "", url: "" });
const emptyStep = (): StepRow => ({ id: uid(), text: "", media: null });

/** Splits pasted text into clean lines, dropping bullets and numbering. */
function splitList(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•▪◦]|\d+[.)]|step\s*\d+[:.)]?)\s*/i, "").trim())
    .filter(Boolean);
}

const SECTIONS = [
  ["basics", "Basics"],
  ["details", "Details"],
  ["media", "Photos & video"],
  ["equipment", "Equipment"],
  ["ingredients", "Ingredients"],
  ["steps", "Steps"],
  ["adapted", "Adapted from"],
] as const;
const DIFFICULTY = ["Easy", "Simple", "Medium", "Tricky", "Showstopper"];

/* ------------------------------------------------------------------ component */

export function RecipeForm({ userId, isEditor, categories, activeTags = [...TAGS], recipeId, initial, initialStatus }: {
  userId: string; isEditor: boolean; categories: Category[]; activeTags?: string[]; recipeId?: string; initial?: RecipeFormValues; initialStatus?: RecipeStatus;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const formId = useId();
  const draftKey = `tgb-recipe-draft:${recipeId ?? "new"}`;

  const [v, setV] = useState<RecipeFormValues>(() => initial ?? blankValues());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const [pasteFor, setPasteFor] = useState<null | "equipment" | { ingredientGroupId: string } | { stepGroupId: string }>(null);
  const [pasteText, setPasteText] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, start] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [customTag, setCustomTag] = useState("");
  const [tagError, setTagError] = useState("");
  const [categoryDraft, setCategoryDraft] = useState("");
  const inputs = useRef(new Map<string, HTMLInputElement | HTMLTextAreaElement>());

  const isPublished = initialStatus === "published";
  const publishLabel = isPublished ? "Update recipe" : "Publish recipe";
  const publishHint = isPublished
    ? "Saves your changes and keeps the recipe live for everyone."
    : "Publishing makes it visible to everyone right away.";

  const set = useCallback(<K extends keyof RecipeFormValues>(key: K, value: RecipeFormValues[K]) => setV((s) => ({ ...s, [key]: value })), []);

  /* ---- draft autosave: restore once, then save after each pause in typing */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { at: number; values: Partial<RecipeFormValues> };
      const base = initial ?? blankValues();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from localStorage after mount
      setV(mergeRecipeDraft(base, draft.values));
      setRestoredAt(draft.at);
    } catch { /* ignore a corrupt draft */ }
  }, [draftKey, initial]);

  useEffect(() => {
    if (submitted) return;
    const t = setTimeout(() => {
      const keepDone = (u: Upload | null) => (u && u.status === "done" && u.path ? { ...u, preview: publicUrl(u.path) ?? u.preview } : null);
      const values: RecipeFormValues = {
        ...v,
        gallery: v.gallery.map(keepDone).filter((u): u is Upload => !!u),
        stepGroups: v.stepGroups.map((g) => ({
          ...g,
          steps: g.steps.map((s) => ({ ...s, media: keepDone(s.media) })),
        })),
      };
      try { localStorage.setItem(draftKey, JSON.stringify({ at: Date.now(), values })); } catch { /* storage full or blocked */ }
    }, 600);
    return () => clearTimeout(t);
  }, [v, draftKey, submitted]);

  useEffect(() => {
    if (!focusId) return;
    inputs.current.get(focusId)?.focus();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear the one-shot focus request
    setFocusId(null);
  }, [focusId, v]);

  function startOver() {
    try { localStorage.removeItem(draftKey); } catch {}
    setV(initial ?? blankValues());
    setRestoredAt(null);
    setErrors({});
    setCategoryDraft("");
  }

  function toggleCategory(id: string, on: boolean) {
    set("categoryIds", on ? [...v.categoryIds, id] : v.categoryIds.filter((x) => x !== id));
  }

  function addCategoryFromDraft() {
    if (!isEditor) return;
    const name = categoryDraft.trim().replace(/\s+/g, " ");
    if (name.length < 2) {
      setErrors((e) => ({ ...e, categories: "Category names need at least 2 characters." }));
      return;
    }
    if (name.length > 40) {
      setErrors((e) => ({ ...e, categories: "Keep category names under 40 characters." }));
      return;
    }
    const id = (slugify(name) || "category").slice(0, 40);
    const existing = categories.find((c) => c.id === id) || v.pendingCategories.find((c) => c.id === id);
    if (existing) {
      if (!v.categoryIds.includes(id)) set("categoryIds", [...v.categoryIds, id]);
      setCategoryDraft("");
      setErrors((e) => ({ ...e, categories: "" }));
      return;
    }
    if (v.categoryIds.length + (v.categoryIds.includes(id) ? 0 : 1) > 12) {
      setErrors((e) => ({ ...e, categories: "Up to 12 categories" }));
      return;
    }
    setV((s) => ({
      ...s,
      pendingCategories: [...s.pendingCategories, { id, name, emoji: "🍌" }],
      categoryIds: s.categoryIds.includes(id) ? s.categoryIds : [...s.categoryIds, id],
    }));
    setCategoryDraft("");
    setErrors((e) => ({ ...e, categories: "" }));
  }

  /* ---- uploads */
  const patchUpload = useCallback((id: string, patch: Partial<Upload>) => {
    setV((s) => ({
      ...s,
      gallery: s.gallery.map((u) => (u.id === id ? { ...u, ...patch } : u)),
      stepGroups: s.stepGroups.map((g) => ({
        ...g,
        steps: g.steps.map((st) => (st.media?.id === id ? { ...st, media: { ...st.media, ...patch } } : st)),
      })),
    }));
  }, []);

  function beginUpload(file: File): Upload | string {
    const problem = checkFile(file);
    if (problem) return problem;
    const kind = kindOf(file)!;
    const ext = (file.name.split(".").pop() || (kind === "image" ? "jpg" : "mp4")).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
    const path = `${userId}/${uid()}.${ext}`;
    const item: Upload = { id: uid(), kind, path: null, preview: URL.createObjectURL(file), status: "uploading", caption: "", fresh: true };
    supabase.storage
      .from(RECIPE_BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false })
      .then(({ error }) => {
        if (error) patchUpload(item.id, { status: "error", error: "Upload failed. Remove it and try again." });
        else patchUpload(item.id, { status: "done", path });
      });
    return item;
  }

  function addGalleryFiles(files: FileList | File[]) {
    const room = 12 - v.gallery.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    const problems: string[] = [];
    const added: Upload[] = [];
    for (const f of list) {
      const r = beginUpload(f);
      if (typeof r === "string") problems.push(r);
      else added.push(r);
    }
    if (files.length > room) problems.push("You can add up to 12 photos and videos.");
    setErrors((e) => ({ ...e, gallery: problems.join(" ") }));
    if (added.length) setV((s) => ({ ...s, gallery: [...s.gallery, ...added] }));
  }

  function discard(u: Upload | null) {
    if (!u) return;
    if (u.preview.startsWith("blob:")) URL.revokeObjectURL(u.preview);
    if (u.fresh && u.path) supabase.storage.from(RECIPE_BUCKET).remove([u.path]);
  }

  function moveItem<T>(list: T[], i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= list.length) return list;
    const copy = list.slice();
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  }

  /* ---- equipment rows */
  function addEquipmentAfter(index: number) {
    const row = emptyEquipment();
    setV((s) => {
      const list = s.equipment.slice();
      list.splice(index + 1, 0, row);
      return { ...s, equipment: list };
    });
    setFocusId(row.id);
  }

  function removeEquipment(id: string) {
    const list = v.equipment;
    const i = list.findIndex((r) => r.id === id);
    const next = list.filter((r) => r.id !== id);
    if (!next.length) next.push(emptyEquipment());
    setV((s) => ({ ...s, equipment: next }));
    setFocusId(next[Math.max(0, i - 1)].id);
  }

  function setEquipmentText(id: string, text: string) {
    setV((s) => ({ ...s, equipment: s.equipment.map((x) => (x.id === id ? { ...x, text } : x)) }));
  }

  function setEquipmentUrl(id: string, url: string) {
    setV((s) => ({ ...s, equipment: s.equipment.map((x) => (x.id === id ? { ...x, url } : x)) }));
  }

  function updateIngredientGroups(updater: (groups: IngredientGroupRow[]) => IngredientGroupRow[]) {
    setV((s) => ({ ...s, ingredientGroups: updater(s.ingredientGroups) }));
  }

  function updateStepGroups(updater: (groups: StepGroupRow[]) => StepGroupRow[]) {
    setV((s) => ({ ...s, stepGroups: updater(s.stepGroups) }));
  }

  function addIngredientAfter(groupId: string, index: number) {
    const row = emptyIngredient();
    updateIngredientGroups((groups) =>
      groups.map((g) => {
        if (g.id !== groupId) return g;
        const items = g.items.slice();
        items.splice(index + 1, 0, row);
        return { ...g, items };
      }),
    );
    setFocusId(row.id);
  }

  function removeIngredient(groupId: string, rowId: string) {
    let focus = rowId;
    updateIngredientGroups((groups) =>
      groups.map((g) => {
        if (g.id !== groupId) return g;
        const i = g.items.findIndex((r) => r.id === rowId);
        const items = g.items.filter((r) => r.id !== rowId);
        if (!items.length) items.push(emptyIngredient());
        focus = items[Math.max(0, i - 1)]?.id ?? items[0].id;
        return { ...g, items };
      }),
    );
    setFocusId(focus);
  }

  function setIngredientText(groupId: string, rowId: string, text: string) {
    updateIngredientGroups((groups) =>
      groups.map((g) =>
        g.id !== groupId
          ? g
          : { ...g, items: g.items.map((r) => (r.id === rowId ? { ...r, text } : r)) },
      ),
    );
  }

  function setIngredientUrl(groupId: string, rowId: string, url: string) {
    updateIngredientGroups((groups) =>
      groups.map((g) =>
        g.id !== groupId
          ? g
          : { ...g, items: g.items.map((r) => (r.id === rowId ? { ...r, url } : r)) },
      ),
    );
  }

  function setIngredientGroupTitle(groupId: string, title: string) {
    updateIngredientGroups((groups) => groups.map((g) => (g.id === groupId ? { ...g, title } : g)));
  }

  function addIngredientGroup() {
    const group = emptyIngredientGroup();
    group.items = [emptyIngredient()];
    updateIngredientGroups((groups) => [...groups, group]);
    setFocusId(group.items[0].id);
  }

  function removeIngredientGroup(groupId: string) {
    updateIngredientGroups((groups) => {
      if (groups.length <= 1) return groups;
      return groups.filter((g) => g.id !== groupId);
    });
  }

  function addStepAfter(groupId: string, index: number) {
    const row = emptyStep();
    updateStepGroups((groups) =>
      groups.map((g) => {
        if (g.id !== groupId) return g;
        const steps = g.steps.slice();
        steps.splice(index + 1, 0, row);
        return { ...g, steps };
      }),
    );
    setFocusId(row.id);
  }

  function removeStep(groupId: string, stepId: string) {
    let focus = stepId;
    updateStepGroups((groups) =>
      groups.map((g) => {
        if (g.id !== groupId) return g;
        const i = g.steps.findIndex((s) => s.id === stepId);
        const doomed = g.steps[i];
        if (doomed?.media) discard(doomed.media);
        const steps = g.steps.filter((s) => s.id !== stepId);
        if (!steps.length) steps.push(emptyStep());
        focus = steps[Math.max(0, i - 1)]?.id ?? steps[0].id;
        return { ...g, steps };
      }),
    );
    setFocusId(focus);
  }

  function setStepText(groupId: string, stepId: string, text: string) {
    updateStepGroups((groups) =>
      groups.map((g) =>
        g.id !== groupId
          ? g
          : { ...g, steps: g.steps.map((s) => (s.id === stepId ? { ...s, text } : s)) },
      ),
    );
  }

  function setStepMedia(groupId: string, stepId: string, media: Upload | null) {
    updateStepGroups((groups) =>
      groups.map((g) =>
        g.id !== groupId
          ? g
          : { ...g, steps: g.steps.map((s) => (s.id === stepId ? { ...s, media } : s)) },
      ),
    );
  }

  function setStepGroupTitle(groupId: string, title: string) {
    updateStepGroups((groups) => groups.map((g) => (g.id === groupId ? { ...g, title } : g)));
  }

  function moveStep(groupId: string, index: number, delta: number) {
    updateStepGroups((groups) =>
      groups.map((g) => (g.id !== groupId ? g : { ...g, steps: moveItem(g.steps, index, delta) })),
    );
  }

  function addStepGroup() {
    const group = emptyStepGroup();
    group.steps = [emptyStep()];
    updateStepGroups((groups) => [...groups, group]);
    setFocusId(group.steps[0].id);
  }

  function removeStepGroup(groupId: string) {
    updateStepGroups((groups) => {
      if (groups.length <= 1) return groups;
      const doomed = groups.find((g) => g.id === groupId);
      doomed?.steps.forEach((s) => discard(s.media));
      return groups.filter((g) => g.id !== groupId);
    });
  }

  function applyPaste() {
    if (!pasteFor) return;
    const lines = splitList(pasteText);
    if (lines.length) {
      if (typeof pasteFor === "object" && "ingredientGroupId" in pasteFor) {
        const groupId = pasteFor.ingredientGroupId;
        updateIngredientGroups((groups) =>
          groups.map((g) => {
            if (g.id !== groupId) return g;
            const existing = g.items.filter((r) => r.text.trim());
            const added = lines.map((text) => ({ id: uid(), text: titleCase(text), url: "" }));
            return { ...g, items: [...existing, ...added] };
          }),
        );
      } else if (typeof pasteFor === "object" && "stepGroupId" in pasteFor) {
        const groupId = pasteFor.stepGroupId;
        updateStepGroups((groups) =>
          groups.map((g) => {
            if (g.id !== groupId) return g;
            const existing = g.steps.filter((s) => s.text.trim() || s.media);
            const added = lines.map((text) => ({ id: uid(), text, media: null }));
            return { ...g, steps: [...existing, ...added] };
          }),
        );
      } else if (pasteFor === "equipment") {
        setV((s) => {
          const existing = s.equipment.filter((r) => r.text.trim());
          const added = lines.map((text) => ({ id: uid(), text, url: "" }));
          return { ...s, equipment: [...existing, ...added] };
        });
      }
    }
    setPasteText("");
    setPasteFor(null);
  }

  /* ---- tags */
  function addCustomTag() {
    const next = normalizeTag(customTag);
    const issue = tagIssue(next);
    if (issue) {
      setTagError(issue);
      return;
    }
    if (v.tags.includes(next)) {
      setTagError("That tag is already on this recipe");
      return;
    }
    if (v.tags.length >= MAX_TAGS) {
      setTagError(`Up to ${MAX_TAGS} tags`);
      return;
    }
    set("tags", [...v.tags, next]);
    setCustomTag("");
    setTagError("");
  }

  /* ---- submit */
  const uploading =
    v.gallery.some((u) => u.status === "uploading") ||
    v.stepGroups.some((g) => g.steps.some((s) => s.media?.status === "uploading"));

  function submit(intent: "draft" | "submit" | "publish") {
    const local: Record<string, string> = {};
    if (v.title.trim().length < 2) local.title = "Give your recipe a name";
    if (!v.categoryIds.length) local.categories = "Pick at least one category";
    else if (v.categoryIds.length > 12) local.categories = "Up to 12 categories";
    const hasIngredient = v.ingredientGroups.some((g) => g.items.some((r) => r.text.trim()));
    v.ingredientGroups.forEach((g, gi) => {
      g.items.forEach((r, i) => {
        const issue = ingredientUrlError(r.url);
        if (issue) local[`ingredients.${gi}.items.${i}.url`] = issue;
      });
    });
    v.equipment.forEach((r, i) => {
      const issue = ingredientUrlError(r.url, "equipment");
      if (issue) local[`equipment.${i}.url`] = issue;
    });
    const hasStep = v.stepGroups.some((g) => g.steps.some((s) => s.text.trim()));
    if (intent !== "draft") {
      if (!hasIngredient) local.ingredients = "Add at least one ingredient";
      if (!hasStep) local.steps = "Add at least one step";
    }
    if (
      v.gallery.some((u) => u.status === "error") ||
      v.stepGroups.some((g) => g.steps.some((s) => s.media?.status === "error"))
    ) {
      local.gallery = "Remove the files that failed to upload first.";
    }
    if (v.tags.length > MAX_TAGS) local.tags = `Up to ${MAX_TAGS} tags`;
    else {
      const bad = v.tags.map((t) => tagIssue(t)).find(Boolean);
      if (bad) local.tags = bad;
    }
    if (Object.keys(local).length) {
      setErrors({ ...local, form: "A few things need attention before saving." });
      document.getElementById(`${formId}-${Object.keys(local)[0].split(".")[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const num = (s: string) => (s.trim() ? Math.round(Number(s)) : null);
    const ingredientGroups = v.ingredientGroups
      .map((g) => ({
        title: titleCase(g.title.trim()),
        items: g.items
          .map((r) => ({ text: titleCase(r.text.trim()), url: r.url.trim() }))
          .filter((r) => r.text),
      }))
      .filter((g) => g.items.length > 0 || g.title);
    const stepGroups = v.stepGroups
      .map((g) => ({
        title: g.title.trim(),
        steps: g.steps
          .filter((s) => s.text.trim())
          .map((s) => ({
            text: s.text.trim(),
            media: s.media?.status === "done" && s.media.path ? { kind: s.media.kind, path: s.media.path } : null,
          })),
      }))
      .filter((g) => g.steps.length > 0 || g.title);
    const knownIds = new Set(categories.map((c) => c.id));
    const newCategories = v.pendingCategories
      .filter((c) => v.categoryIds.includes(c.id) && !knownIds.has(c.id))
      .map((c) => ({ name: c.name, emoji: c.emoji }));
    const payload = {
      title: v.title, description: v.description, categories: v.categoryIds,
      newCategories: isEditor ? newCategories : [],
      emoji: v.emoji, totalMinutes: num(v.totalMinutes), notes: v.notes, servings: v.servings.trim(), difficulty: v.difficulty, tags: v.tags,
      ingredients: ingredientGroups.length ? ingredientGroups : [{ title: "", items: [] as { text: string; url: string }[] }],
      equipment: v.equipment
        .map((r) => ({ text: titleCase(r.text.trim()), url: r.url.trim() }))
        .filter((r) => r.text),
      steps: stepGroups.length ? stepGroups : [{ title: "", steps: [] as { text: string; media: null }[] }],
      gallery: v.gallery.filter((u) => u.status === "done" && u.path).map((u) => ({ kind: u.kind, path: u.path!, caption: u.caption })),
      adaptedFromName: v.adaptedFromName.trim(),
      adaptedFromUrl: v.adaptedFromUrl.trim(),
      intent,
    };
    // Drafts may be incomplete; give the server something valid to hold on to.
    if (intent === "draft") {
      if (!payload.ingredients.some((g) => g.items.length)) {
        payload.ingredients = [{ title: "", items: [{ text: "(ingredients to come)", url: "" }] }];
      }
      if (!payload.steps.some((g) => g.steps.length)) {
        payload.steps = [{ title: "", steps: [{ text: "(steps to come)", media: null }] }];
      }
    }
    setErrors({});
    start(async () => {
      const res = await saveRecipe(payload, recipeId);
      if (!res.ok) {
        setErrors({ form: "Couldn't save yet. Check the highlighted fields.", ...res.errors });
        return;
      }
      setSubmitted(true);
      try { localStorage.removeItem(draftKey); } catch {}
      router.push(`/recipes/${res.slug}?saved=${res.status}`);
    });
  }

  const err = (key: string) => errors[key] ?? Object.entries(errors).find(([k]) => k.startsWith(key + "."))?.[1];
  const fid = (s: string) => `${formId}-${s}`;
  const coverId = v.gallery.find((u) => u.kind === "image")?.id;

  /* ------------------------------------------------------------------ render */
  return (
    <form className="rf" noValidate onSubmit={(e) => { e.preventDefault(); submit(isEditor ? "publish" : "submit"); }}>
      <nav className="rf-toc" aria-label="Form sections">
        {SECTIONS.map(([id, label], i) => (
          <a key={id} href={`#${fid(id)}`}><span aria-hidden="true">{i + 1}</span>{label}</a>
        ))}
      </nav>

      {restoredAt && (
        <div className="notice-inline" role="status">
          {/* eslint-disable-next-line @next/next/no-img-element -- small static mascot asset */}
          <img className="notice-inline-mascot" src="/upload-complete.png" alt="" width={52} height={52} />
          <span>We restored your unsaved work from {new Date(restoredAt).toLocaleString()}.</span>
          <button type="button" className="linkbtn" onClick={startOver}>Start fresh</button>
        </div>
      )}

      {/* 1. Basics */}
      <section className="rf-sec" id={fid("basics")} aria-labelledby={fid("basics-h")}>
        <h2 id={fid("basics-h")}><span className="num" aria-hidden="true">1</span>The basics</h2>
        <div className="f" id={fid("title")}>
          <label htmlFor={fid("title-in")}>Recipe name</label>
          <input id={fid("title-in")} className="field" value={v.title} maxLength={100} placeholder="Grandma Rose's banana pudding" onChange={(e) => set("title", e.target.value)} aria-invalid={!!err("title")} aria-describedby={err("title") ? fid("title-err") : undefined} />
          {err("title") && <p className="f-err" id={fid("title-err")}>{err("title")}</p>}
        </div>
        <fieldset className="f" id={fid("categories")}>
          <legend>Categories</legend>
          <p className="hint">Pick one or more. Tick every category that fits.</p>
          <div className="tagbox" role="group" aria-label="Recipe categories">
            {categories.map((c) => (
              <label key={c.id}>
                <input
                  type="checkbox"
                  checked={v.categoryIds.includes(c.id)}
                  onChange={(e) => toggleCategory(c.id, e.target.checked)}
                />{" "}
                {c.name}
              </label>
            ))}
            {v.pendingCategories.map((c) => (
              <label key={c.id} className="tag-custom">
                <input
                  type="checkbox"
                  checked={v.categoryIds.includes(c.id)}
                  onChange={(e) => toggleCategory(c.id, e.target.checked)}
                />{" "}
                {c.name}
              </label>
            ))}
          </div>
          {isEditor && (
            <div className="tag-add">
              <label className="sr" htmlFor={fid("cat-in")}>Add a new category</label>
              <input
                id={fid("cat-in")}
                className="field"
                maxLength={40}
                value={categoryDraft}
                placeholder="Add a new category…"
                aria-invalid={!!err("categories")}
                onChange={(e) => setCategoryDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategoryFromDraft();
                  }
                }}
              />
              <button type="button" className="btn ghost small" onClick={addCategoryFromDraft} disabled={!categoryDraft.trim()}>
                Add
              </button>
            </div>
          )}
          {err("categories") && <p className="f-err">{err("categories")}</p>}
        </fieldset>
        <div className="f">
          <label htmlFor={fid("desc")}>Short description <small>{v.description.length}/300</small></label>
          <textarea id={fid("desc")} className="field" rows={2} maxLength={300} value={v.description} placeholder="One or two sentences that make people hungry." onChange={(e) => set("description", e.target.value)} />
        </div>
      </section>

      {/* 2. Details */}
      <section className="rf-sec" id={fid("details")} aria-labelledby={fid("det-h")}>
        <h2 id={fid("det-h")}><span className="num" aria-hidden="true">2</span>Details <small>(optional)</small></h2>
        <div className="f-grid three">
          <div className="f"><label htmlFor={fid("time")}>Total time (minutes)</label><input id={fid("time")} className="field" type="number" inputMode="numeric" min={1} max={2880} value={v.totalMinutes} onChange={(e) => set("totalMinutes", e.target.value)} aria-invalid={!!err("totalMinutes")} />{err("totalMinutes") && <p className="f-err">{err("totalMinutes")}</p>}</div>
          <div className="f">
            <label htmlFor={fid("serv")}>Serving Size</label>
            <input
              id={fid("serv")}
              className="field"
              maxLength={80}
              value={v.servings}
              placeholder="1 loaf, 12 muffins, serves 4…"
              onChange={(e) => set("servings", e.target.value)}
              aria-invalid={!!err("servings")}
            />
            {err("servings") && <p className="f-err">{err("servings")}</p>}
          </div>
          <div className="f"><label htmlFor={fid("diff")}>Difficulty</label>
            <select
              id={fid("diff")}
              className="field"
              value={v.difficulty ?? ""}
              onChange={(e) => set("difficulty", e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Choose…</option>
              {DIFFICULTY.map((d, i) => <option key={d} value={i + 1}>{"🍌".repeat(i + 1)} {d}</option>)}
            </select>
          </div>
        </div>
        <div className="f">
          <label htmlFor={fid("notes")}>Notes</label>
          <PostBodyEditor
            id={fid("notes")}
            value={v.notes}
            onChange={(html) => set("notes", html)}
            invalid={!!err("notes")}
            placeholder="Tips, swaps, make-ahead notes…"
            ariaLabel="Recipe notes"
            compact
          />
          {err("notes") && <p className="f-err">{err("notes")}</p>}
        </div>
        <fieldset className="f" id={fid("tags")}>
          <legend>Tags</legend>
          <div className="tagbox">
            {activeTags.map((t) => (
              <label key={t}>
                <input
                  type="checkbox"
                  checked={v.tags.includes(t)}
                  onChange={(e) => {
                    setTagError("");
                    set("tags", e.target.checked ? [...v.tags, t] : v.tags.filter((x) => x !== t));
                  }}
                />{" "}
                {t}
              </label>
            ))}
            {v.tags.filter((t) => !activeTags.includes(t)).map((t) => (
              <label key={t} className="tag-custom">
                <input
                  type="checkbox"
                  checked
                  onChange={() => {
                    setTagError("");
                    set("tags", v.tags.filter((x) => x !== t));
                  }}
                />{" "}
                {t}
              </label>
            ))}
          </div>
          <div className="tag-add">
            <label className="sr" htmlFor={fid("tag-in")}>Add a custom tag</label>
            <input
              id={fid("tag-in")}
              className="field"
              maxLength={24}
              value={customTag}
              placeholder="Add your own tag…"
              aria-invalid={!!(tagError || err("tags"))}
              aria-describedby={tagError || err("tags") ? fid("tag-err") : undefined}
              onChange={(e) => {
                setCustomTag(e.target.value);
                if (tagError) setTagError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomTag();
                }
              }}
            />
            <button type="button" className="btn ghost small" onClick={addCustomTag} disabled={!customTag.trim()}>
              Add tag
            </button>
          </div>
          <p className="hint">Letters, numbers, spaces, or hyphens. No profanity or nonsense.</p>
          {(tagError || err("tags")) && <p className="f-err" id={fid("tag-err")} role="alert">{tagError || err("tags")}</p>}
        </fieldset>
      </section>

      {/* 3. Photos & video */}
      <section className="rf-sec" id={fid("media")} aria-labelledby={fid("media-h")}>
        <h2 id={fid("media-h")}><span className="num" aria-hidden="true">3</span>Photos &amp; video</h2>
        <p className="hint">Add up to 12. The first photo becomes the cover. Photos up to 10 MB, videos up to 50 MB (MP4, WebM, or MOV).</p>
        <div
          id={fid("gallery")}
          className={`dropzone${dragging ? " over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) addGalleryFiles(e.dataTransfer.files); }}
        >
          <span className="big" aria-hidden="true">📷🎬</span>
          <span>Drag photos or videos here, or</span>
          <label className="btn small">
            Choose files
            <input type="file" className="sr" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime" onChange={(e) => { if (e.target.files) addGalleryFiles(e.target.files); e.target.value = ""; }} />
          </label>
        </div>
        {err("gallery") && <p className="f-err" role="alert">{err("gallery")}</p>}
        {v.gallery.length > 0 && (
          <ul className="tiles">
            {v.gallery.map((u, i) => (
              <li key={u.id} className={`tile ${u.status}`}>
                <div className="tile-media">
                  <Preview kind={u.kind} src={u.preview} />
                  {u.id === coverId && <span className="badge-cover">Cover</span>}
                  {u.kind === "video" && <span className="badge-kind">Video</span>}
                  {u.status === "uploading" && <span className="tile-state">Uploading…</span>}
                  {u.status === "error" && <span className="tile-state err">{u.error}</span>}
                </div>
                <input className="field small" placeholder="Caption (optional)" maxLength={140} value={u.caption} aria-label={`Caption for item ${i + 1}`} onChange={(e) => patchUpload(u.id, { caption: e.target.value })} />
                <div className="tile-tools">
                  <button type="button" className="icon-btn" aria-label={`Move item ${i + 1} earlier`} disabled={i === 0} onClick={() => set("gallery", moveItem(v.gallery, i, -1))}>←</button>
                  <button type="button" className="icon-btn" aria-label={`Move item ${i + 1} later`} disabled={i === v.gallery.length - 1} onClick={() => set("gallery", moveItem(v.gallery, i, 1))}>→</button>
                  <button type="button" className="icon-btn danger" aria-label={`Remove item ${i + 1}`} onClick={() => { discard(u); set("gallery", v.gallery.filter((x) => x.id !== u.id)); }}>×</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 4. Equipment */}
      <section className="rf-sec" id={fid("equipment")} aria-labelledby={fid("equip-h")}>
        <h2 id={fid("equip-h")}><span className="num" aria-hidden="true">4</span>Equipment <small>(optional)</small></h2>
        <p className="hint">
          Tools and gear the cook will need. Leave blank to hide this section on the recipe page.
          Add a link and that item opens in a new window. Press Enter for a new line.
        </p>
        <ol className="rows-edit">
          {v.equipment.map((r, i) => {
            const urlError = errors[`equipment.${i}.url`];
            return (
            <li key={r.id} className="ing-row">
              <div className="ing-row-fields">
                <input
                  ref={(el) => { if (el) inputs.current.set(r.id, el); else inputs.current.delete(r.id); }}
                  className="field"
                  value={r.text}
                  maxLength={200}
                  placeholder={i === 0 ? "Mixing bowls" : i === 1 ? "Loaf pan" : "Another tool"}
                  aria-label={`Equipment ${i + 1}`}
                  aria-invalid={!!errors[`equipment.${i}`] || !!errors[`equipment.${i}.text`]}
                  onChange={(e) => setEquipmentText(r.id, e.target.value)}
                  onBlur={(e) => setEquipmentText(r.id, titleCase(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addEquipmentAfter(i); }
                    if (e.key === "Backspace" && !r.text && v.equipment.length > 1) { e.preventDefault(); removeEquipment(r.id); }
                  }}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    if (text.includes("\n")) { e.preventDefault(); setPasteFor("equipment"); setPasteText(text); }
                  }}
                />
                <input
                  className="field ing-url"
                  type="url"
                  inputMode="url"
                  value={r.url}
                  maxLength={500}
                  placeholder="Link (optional) — opens in a new window"
                  aria-label={`Link for equipment ${i + 1}`}
                  aria-invalid={!!urlError}
                  aria-describedby={urlError ? fid(`equip-url-err-${r.id}`) : undefined}
                  onChange={(e) => setEquipmentUrl(r.id, e.target.value)}
                />
                {urlError && <p className="f-err" id={fid(`equip-url-err-${r.id}`)} role="alert">{urlError}</p>}
              </div>
              <button type="button" className="icon-btn danger" aria-label={`Remove equipment ${i + 1}`} onClick={() => removeEquipment(r.id)}>×</button>
            </li>
            );
          })}
        </ol>
        {err("equipment") && <p className="f-err" role="alert">{err("equipment")}</p>}
        <div className="row-actions">
          <button type="button" className="btn ghost small" onClick={() => addEquipmentAfter(v.equipment.length - 1)}>Add equipment</button>
          <button type="button" className="btn ghost small" onClick={() => setPasteFor(pasteFor === "equipment" ? null : "equipment")}>Paste a whole list</button>
        </div>
        {pasteFor === "equipment" && <PasteBox label="Paste your equipment list, one per line" value={pasteText} onChange={setPasteText} onApply={applyPaste} onCancel={() => setPasteFor(null)} />}
      </section>

      {/* 5. Ingredients */}
      <section className="rf-sec" id={fid("ingredients")} aria-labelledby={fid("ing-h")}>
        <h2 id={fid("ing-h")}><span className="num" aria-hidden="true">5</span>Ingredients</h2>
        <p className="hint">
          One per line, amount first (&ldquo;1 1/2 cups flour&rdquo;) so the servings scaler can adjust it.
          Add a link and that ingredient opens in a new window. Add another titled list for frostings, sauces, or mix-ins.
        </p>
        {v.ingredientGroups.map((group, gi) => {
          const pasteOpen = !!pasteFor && typeof pasteFor === "object" && "ingredientGroupId" in pasteFor && pasteFor.ingredientGroupId === group.id;
          return (
            <div key={group.id} className="ing-edit-group">
              <div className="f" style={{ marginBottom: ".6rem" }}>
                <label htmlFor={fid(`ing-title-${group.id}`)}>
                  List title {gi === 0 ? <small>(optional)</small> : null}
                </label>
                <div className="ing-edit-title-row">
                  <input
                    id={fid(`ing-title-${group.id}`)}
                    className="field"
                    value={group.title}
                    maxLength={80}
                    placeholder={gi === 0 ? "Banana Bread Batter" : "Blueberry Cream Cheese Frosting"}
                    onChange={(e) => setIngredientGroupTitle(group.id, e.target.value)}
                    onBlur={(e) => setIngredientGroupTitle(group.id, titleCase(e.target.value))}
                  />
                  {v.ingredientGroups.length > 1 && (
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={() => removeIngredientGroup(group.id)}
                    >
                      Remove list
                    </button>
                  )}
                </div>
              </div>
              <ol className="rows-edit">
                {group.items.map((r, i) => {
                  const urlError = errors[`ingredients.${gi}.items.${i}.url`];
                  return (
                  <li key={r.id} className="ing-row">
                    <div className="ing-row-fields">
                      <input
                        ref={(el) => { if (el) inputs.current.set(r.id, el); else inputs.current.delete(r.id); }}
                        className="field"
                        value={r.text}
                        maxLength={200}
                        placeholder={i === 0 ? "3 Very Ripe Bananas" : i === 1 ? "1 1/2 Cups Flour" : "Another Ingredient"}
                        aria-label={`${group.title || "Ingredients"} item ${i + 1}`}
                        aria-invalid={!!errors[`ingredients.${gi}.items.${i}`] || !!errors[`ingredients.${gi}.items.${i}.text`]}
                        onChange={(e) => setIngredientText(group.id, r.id, e.target.value)}
                        onBlur={(e) => setIngredientText(group.id, r.id, titleCase(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); addIngredientAfter(group.id, i); }
                          if (e.key === "Backspace" && !r.text && group.items.length > 1) {
                            e.preventDefault();
                            removeIngredient(group.id, r.id);
                          }
                        }}
                        onPaste={(e) => {
                          const text = e.clipboardData.getData("text");
                          if (text.includes("\n")) {
                            e.preventDefault();
                            setPasteFor({ ingredientGroupId: group.id });
                            setPasteText(text);
                          }
                        }}
                      />
                      <input
                        className="field ing-url"
                        type="url"
                        inputMode="url"
                        value={r.url}
                        maxLength={500}
                        placeholder="Link (optional) — opens in a new window"
                        aria-label={`Link for ${group.title || "ingredient"} ${i + 1}`}
                        aria-invalid={!!urlError}
                        aria-describedby={urlError ? fid(`ing-url-err-${r.id}`) : undefined}
                        onChange={(e) => setIngredientUrl(group.id, r.id, e.target.value)}
                      />
                      {urlError && <p className="f-err" id={fid(`ing-url-err-${r.id}`)} role="alert">{urlError}</p>}
                    </div>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Remove ingredient ${i + 1}`}
                      onClick={() => removeIngredient(group.id, r.id)}
                    >
                      ×
                    </button>
                  </li>
                  );
                })}
              </ol>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => addIngredientAfter(group.id, group.items.length - 1)}
                >
                  Add ingredient
                </button>
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => setPasteFor(pasteOpen ? null : { ingredientGroupId: group.id })}
                >
                  Paste a whole list
                </button>
              </div>
              {pasteOpen && (
                <PasteBox
                  label="Paste your ingredient list, one per line"
                  value={pasteText}
                  onChange={setPasteText}
                  onApply={applyPaste}
                  onCancel={() => setPasteFor(null)}
                />
              )}
            </div>
          );
        })}
        {err("ingredients") && <p className="f-err" role="alert">{err("ingredients")}</p>}
        <div className="row-actions" style={{ marginTop: ".8rem" }}>
          <button type="button" className="btn ghost small" onClick={addIngredientGroup}>
            Add another ingredient list
          </button>
        </div>
      </section>

      {/* 6. Steps */}
      <section className="rf-sec" id={fid("steps")} aria-labelledby={fid("steps-h")}>
        <h2 id={fid("steps-h")}><span className="num" aria-hidden="true">6</span>Steps</h2>
        <p className="hint">
          One step per box, in order. Mention times like &ldquo;bake 25 minutes&rdquo; and they&apos;ll be highlighted for the cook.
          Add another titled list for frostings, sauces, or mix-ins.
        </p>
        {v.stepGroups.map((group, gi) => {
          const pasteOpen = !!pasteFor && typeof pasteFor === "object" && "stepGroupId" in pasteFor && pasteFor.stepGroupId === group.id;
          return (
            <div key={group.id} className="ing-edit-group">
              <div className="f" style={{ marginBottom: ".6rem" }}>
                <label htmlFor={fid(`step-title-${group.id}`)}>
                  List title {gi === 0 ? <small>(optional)</small> : null}
                </label>
                <div className="ing-edit-title-row">
                  <input
                    id={fid(`step-title-${group.id}`)}
                    className="field"
                    value={group.title}
                    maxLength={80}
                    placeholder={gi === 0 ? "Banana bread" : "Blueberry cream cheese frosting"}
                    onChange={(e) => setStepGroupTitle(group.id, e.target.value)}
                  />
                  {v.stepGroups.length > 1 && (
                    <button type="button" className="btn ghost small" onClick={() => removeStepGroup(group.id)}>
                      Remove list
                    </button>
                  )}
                </div>
              </div>
              <ol className="steps-edit">
                {group.steps.map((s, i) => (
                  <li key={s.id}>
                    <span className="step-num" aria-hidden="true">{i + 1}</span>
                    <div className="step-body">
                      <textarea
                        ref={(el) => { if (el) inputs.current.set(s.id, el); else inputs.current.delete(s.id); }}
                        className="field"
                        rows={2}
                        maxLength={1500}
                        value={s.text}
                        placeholder={i === 0 ? "Heat oven to 350°F (175°C) and grease a loaf pan." : "What happens next?"}
                        aria-label={`${group.title || "Steps"} step ${i + 1}`}
                        aria-invalid={!!errors[`steps.${gi}.steps.${i}.text`]}
                        onChange={(e) => setStepText(group.id, s.id, e.target.value)}
                        onPaste={(e) => {
                          const text = e.clipboardData.getData("text");
                          if (!s.text && text.split("\n").filter((l) => l.trim()).length > 1) {
                            e.preventDefault();
                            setPasteFor({ stepGroupId: group.id });
                            setPasteText(text);
                          }
                        }}
                      />
                      {s.media ? (
                        <div className={`step-media ${s.media.status}`}>
                          <Preview kind={s.media.kind} src={s.media.preview} />
                          <span>
                            {s.media.status === "uploading"
                              ? "Uploading…"
                              : s.media.status === "error"
                                ? s.media.error
                                : s.media.kind === "video"
                                  ? "Video attached"
                                  : "Photo attached"}
                          </span>
                          <button
                            type="button"
                            className="linkbtn"
                            onClick={() => { discard(s.media); setStepMedia(group.id, s.id, null); }}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="linkbtn attach">
                          + Add a photo or video to this step
                          <input
                            type="file"
                            className="sr"
                            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (!f) return;
                              const r = beginUpload(f);
                              if (typeof r === "string") setErrors((x) => ({ ...x, steps: r }));
                              else setStepMedia(group.id, s.id, r);
                            }}
                          />
                        </label>
                      )}
                    </div>
                    <div className="step-tools">
                      <button type="button" className="icon-btn" aria-label={`Move step ${i + 1} up`} disabled={i === 0} onClick={() => moveStep(group.id, i, -1)}>↑</button>
                      <button type="button" className="icon-btn" aria-label={`Move step ${i + 1} down`} disabled={i === group.steps.length - 1} onClick={() => moveStep(group.id, i, 1)}>↓</button>
                      <button type="button" className="icon-btn danger" aria-label={`Remove step ${i + 1}`} onClick={() => removeStep(group.id, s.id)}>×</button>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="row-actions">
                <button type="button" className="btn ghost small" onClick={() => addStepAfter(group.id, group.steps.length - 1)}>Add step</button>
                <button type="button" className="btn ghost small" onClick={() => setPasteFor(pasteOpen ? null : { stepGroupId: group.id })}>Paste all steps</button>
              </div>
              {pasteOpen && (
                <PasteBox
                  label="Paste your steps, one per line (numbers are removed for you)"
                  value={pasteText}
                  onChange={setPasteText}
                  onApply={applyPaste}
                  onCancel={() => setPasteFor(null)}
                />
              )}
            </div>
          );
        })}
        {err("steps") && <p className="f-err" role="alert">{err("steps")}</p>}
        <div className="row-actions" style={{ marginTop: ".8rem" }}>
          <button type="button" className="btn ghost small" onClick={addStepGroup}>
            Add another step list
          </button>
        </div>
      </section>

      {/* 7. Adapted from */}
      <section className="rf-sec" id={fid("adapted")} aria-labelledby={fid("adapted-h")}>
        <h2 id={fid("adapted-h")}><span className="num" aria-hidden="true">7</span>Adapted this recipe from <small>(optional)</small></h2>
        <p className="hint">Credit the original source if you adapted this. Leave blank to hide this on the recipe page. Links open in a new tab.</p>
        <div className="f-grid two">
          <div className="f" id={fid("adaptedFromName")}>
            <label htmlFor={fid("adapted-name")}>Source name</label>
            <input
              id={fid("adapted-name")}
              className="field"
              maxLength={120}
              value={v.adaptedFromName}
              placeholder="Serious Eats banana bread"
              onChange={(e) => set("adaptedFromName", e.target.value)}
              aria-invalid={!!err("adaptedFromName")}
            />
            {err("adaptedFromName") && <p className="f-err">{err("adaptedFromName")}</p>}
          </div>
          <div className="f" id={fid("adaptedFromUrl")}>
            <label htmlFor={fid("adapted-url")}>Source URL</label>
            <input
              id={fid("adapted-url")}
              className="field"
              type="url"
              inputMode="url"
              maxLength={500}
              value={v.adaptedFromUrl}
              placeholder="https://…"
              onChange={(e) => set("adaptedFromUrl", e.target.value)}
              aria-invalid={!!err("adaptedFromUrl")}
            />
            {err("adaptedFromUrl") && <p className="f-err">{err("adaptedFromUrl")}</p>}
          </div>
        </div>
      </section>

      {/* Submit */}
      <div className="rf-submit">
        {errors.form && <p className="f-err" role="alert">{errors.form}</p>}
        {uploading && <p className="hint" role="status">Waiting for uploads to finish…</p>}
        <div className="row-actions">
          <button type="submit" className="btn" disabled={pending || uploading}>
            {pending ? "Saving…" : isEditor ? publishLabel : "Submit for review"}
          </button>
          <button type="button" className="btn ghost" disabled={pending || uploading} onClick={() => submit("draft")}>Save as draft</button>
        </div>
        <p className="hint">
          {isEditor ? publishHint : "An editor will take a look, then it goes live. Drafts stay private to you."}
          {" "}Your work is saved on this device as you type.
        </p>
      </div>
    </form>
  );
}

/** Thumbnail for a local (blob:) or uploaded file while editing. */
function Preview({ kind, src }: { kind: MediaKind; src: string }) {
  if (kind === "video") return <video src={src} muted playsInline preload="metadata" />;
  // eslint-disable-next-line @next/next/no-img-element -- blob: previews can't go through next/image
  return <img src={src} alt="" />;
}

function PasteBox({ label, value, onChange, onApply, onCancel }: { label: string; value: string; onChange: (v: string) => void; onApply: () => void; onCancel: () => void }) {
  const id = useId();
  const count = splitList(value).length;
  return (
    <div className="pastebox">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} className="field" rows={6} value={value} autoFocus onChange={(e) => onChange(e.target.value)} />
      <div className="row-actions">
        <button type="button" className="btn small" disabled={!count} onClick={onApply}>Add {count || ""} {count === 1 ? "line" : "lines"}</button>
        <button type="button" className="btn ghost small" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

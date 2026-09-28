"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { checkFile, kindOf, publicUrl, RECIPE_BUCKET } from "@/lib/media";
import { saveRecipe } from "@/actions/recipes";
import { TAGS, type Category, type MediaKind } from "@/lib/types";
import { MAX_TAGS, normalizeTag, tagIssue } from "@/lib/tags";
import {
  blankValues,
  mergeRecipeDraft,
  type RecipeFormValues,
  type Row,
  type StepRow,
  type Upload,
} from "@/lib/recipe-form-values";

export type { RecipeFormValues, Upload };
export { blankValues, valuesFromRecipe } from "@/lib/recipe-form-values";

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const emptyRow = (): Row => ({ id: uid(), text: "" });
const emptyStep = (): StepRow => ({ id: uid(), text: "", media: null });

/** Splits pasted text into clean lines, dropping bullets and numbering. */
function splitList(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•▪◦]|\d+[.)]|step\s*\d+[:.)]?)\s*/i, "").trim())
    .filter(Boolean);
}

const SECTIONS = [["basics", "Basics"], ["media", "Photos & video"], ["ingredients", "Ingredients"], ["steps", "Steps"], ["details", "Details"]] as const;
const DIFFICULTY = ["Easy", "Simple", "Medium", "Tricky", "Showstopper"];

/* ------------------------------------------------------------------ component */

export function RecipeForm({ userId, isEditor, categories, recipeId, initial }: {
  userId: string; isEditor: boolean; categories: Category[]; recipeId?: string; initial?: RecipeFormValues;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const formId = useId();
  const draftKey = `tgb-recipe-draft:${recipeId ?? "new"}`;

  const [v, setV] = useState<RecipeFormValues>(() => initial ?? blankValues(categories[0]?.id ?? ""));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const [pasteFor, setPasteFor] = useState<null | "ingredients" | "steps">(null);
  const [pasteText, setPasteText] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, start] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [customTag, setCustomTag] = useState("");
  const [tagError, setTagError] = useState("");
  const inputs = useRef(new Map<string, HTMLInputElement | HTMLTextAreaElement>());

  const set = useCallback(<K extends keyof RecipeFormValues>(key: K, value: RecipeFormValues[K]) => setV((s) => ({ ...s, [key]: value })), []);

  /* ---- draft autosave: restore once, then save after each pause in typing */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { at: number; values: Partial<RecipeFormValues> };
      const base = initial ?? blankValues(categories[0]?.id ?? "");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from localStorage after mount
      setV(mergeRecipeDraft(base, draft.values));
      setRestoredAt(draft.at);
    } catch { /* ignore a corrupt draft */ }
  }, [draftKey, initial, categories]);

  useEffect(() => {
    if (submitted) return;
    const t = setTimeout(() => {
      const keepDone = (u: Upload | null) => (u && u.status === "done" && u.path ? { ...u, preview: publicUrl(u.path) ?? u.preview } : null);
      const values: RecipeFormValues = {
        ...v,
        gallery: v.gallery.map(keepDone).filter((u): u is Upload => !!u),
        steps: v.steps.map((s) => ({ ...s, media: keepDone(s.media) })),
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
    setV(initial ?? blankValues(categories[0]?.id ?? ""));
    setRestoredAt(null);
    setErrors({});
  }

  /* ---- uploads */
  const patchUpload = useCallback((id: string, patch: Partial<Upload>) => {
    setV((s) => ({
      ...s,
      gallery: s.gallery.map((u) => (u.id === id ? { ...u, ...patch } : u)),
      steps: s.steps.map((st) => (st.media?.id === id ? { ...st, media: { ...st.media, ...patch } } : st)),
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

  /* ---- ingredient and step rows */
  function addRowAfter(kind: "ingredients" | "steps", index: number) {
    const row = kind === "ingredients" ? emptyRow() : emptyStep();
    setV((s) => {
      const list = (s[kind] as (Row | StepRow)[]).slice();
      list.splice(index + 1, 0, row);
      return { ...s, [kind]: list };
    });
    setFocusId(row.id);
  }

  function removeRow(kind: "ingredients" | "steps", id: string) {
    const list = v[kind] as (Row | StepRow)[];
    const i = list.findIndex((r) => r.id === id);
    if (kind === "steps") discard((list[i] as StepRow).media);
    const next = list.filter((r) => r.id !== id);
    if (!next.length) next.push(kind === "ingredients" ? emptyRow() : emptyStep());
    setV((s) => ({ ...s, [kind]: next }));
    setFocusId(next[Math.max(0, i - 1)].id);
  }

  function applyPaste() {
    if (!pasteFor) return;
    const lines = splitList(pasteText);
    if (lines.length) {
      setV((s) => {
        const existing = (s[pasteFor] as (Row | StepRow)[]).filter((r) => r.text.trim() || (r as StepRow).media);
        const added = lines.map((text) => (pasteFor === "ingredients" ? { id: uid(), text } : { id: uid(), text, media: null }));
        return { ...s, [pasteFor]: [...existing, ...added] };
      });
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
  const uploading = v.gallery.some((u) => u.status === "uploading") || v.steps.some((s) => s.media?.status === "uploading");

  function submit(intent: "draft" | "submit" | "publish") {
    const local: Record<string, string> = {};
    if (v.title.trim().length < 2) local.title = "Give your recipe a name";
    if (!v.categoryId) local.categoryId = "Pick a category";
    if (v.categoryId === "__new" && v.newCatName.trim().length < 2) local.categoryId = "Name the new category";
    if (intent !== "draft") {
      if (!v.ingredients.some((r) => r.text.trim())) local.ingredients = "Add at least one ingredient";
      if (!v.steps.some((r) => r.text.trim())) local.steps = "Add at least one step";
    }
    if (v.gallery.some((u) => u.status === "error") || v.steps.some((s) => s.media?.status === "error")) local.gallery = "Remove the files that failed to upload first.";
    if (v.tags.length > MAX_TAGS) local.tags = `Up to ${MAX_TAGS} tags`;
    else {
      const bad = v.tags.map(tagIssue).find(Boolean);
      if (bad) local.tags = bad;
    }
    if (Object.keys(local).length) {
      setErrors({ ...local, form: "A few things need attention before saving." });
      document.getElementById(`${formId}-${Object.keys(local)[0].split(".")[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const num = (s: string) => (s.trim() ? Math.round(Number(s)) : null);
    const payload = {
      title: v.title, description: v.description, categoryId: v.categoryId,
      newCategory: v.categoryId === "__new" ? { name: v.newCatName, emoji: "" } : null,
      emoji: v.emoji, totalMinutes: num(v.totalMinutes), timeNote: v.timeNote, servings: num(v.servings), difficulty: v.difficulty, tags: v.tags,
      ingredients: v.ingredients.map((r) => r.text.trim()).filter(Boolean),
      steps: v.steps.filter((s) => s.text.trim()).map((s) => ({ text: s.text.trim(), media: s.media?.status === "done" && s.media.path ? { kind: s.media.kind, path: s.media.path } : null })),
      gallery: v.gallery.filter((u) => u.status === "done" && u.path).map((u) => ({ kind: u.kind, path: u.path!, caption: u.caption })),
      intent,
    };
    // Drafts may be incomplete; give the server something valid to hold on to.
    if (intent === "draft") {
      if (!payload.ingredients.length) payload.ingredients = ["(ingredients to come)"];
      if (!payload.steps.length) payload.steps = [{ text: "(steps to come)", media: null }];
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
        <div className="f" id={fid("categoryId")}>
          <label htmlFor={fid("cat")}>Category</label>
          <select id={fid("cat")} className="field" value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)} aria-invalid={!!err("categoryId")}>
            <option value="" disabled>Pick one…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            {isEditor && <option value="__new">New category…</option>}
          </select>
          {err("categoryId") && <p className="f-err">{err("categoryId")}</p>}
        </div>
        {v.categoryId === "__new" && (
          <div className="f">
            <label htmlFor={fid("nc")}>New category name</label>
            <input id={fid("nc")} className="field" value={v.newCatName} maxLength={40} placeholder="Lunchbox" onChange={(e) => set("newCatName", e.target.value)} />
          </div>
        )}
        <div className="f">
          <label htmlFor={fid("desc")}>Short description <small>{v.description.length}/300</small></label>
          <textarea id={fid("desc")} className="field" rows={2} maxLength={300} value={v.description} placeholder="One or two sentences that make people hungry." onChange={(e) => set("description", e.target.value)} />
        </div>
      </section>

      {/* 2. Photos & video */}
      <section className="rf-sec" id={fid("media")} aria-labelledby={fid("media-h")}>
        <h2 id={fid("media-h")}><span className="num" aria-hidden="true">2</span>Photos &amp; video</h2>
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

      {/* 3. Ingredients */}
      <section className="rf-sec" id={fid("ingredients")} aria-labelledby={fid("ing-h")}>
        <h2 id={fid("ing-h")}><span className="num" aria-hidden="true">3</span>Ingredients</h2>
        <p className="hint">One per line, amount first (&ldquo;1 1/2 cups flour&rdquo;) so the servings scaler can adjust it. Press Enter for a new line.</p>
        <ol className="rows-edit">
          {v.ingredients.map((r, i) => (
            <li key={r.id}>
              <input
                ref={(el) => { if (el) inputs.current.set(r.id, el); else inputs.current.delete(r.id); }}
                className="field" value={r.text} maxLength={200} placeholder={i === 0 ? "3 very ripe bananas" : i === 1 ? "1 1/2 cups flour" : "Another ingredient"}
                aria-label={`Ingredient ${i + 1}`} aria-invalid={!!errors[`ingredients.${i}`]}
                onChange={(e) => set("ingredients", v.ingredients.map((x) => (x.id === r.id ? { ...x, text: e.target.value } : x)))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addRowAfter("ingredients", i); }
                  if (e.key === "Backspace" && !r.text && v.ingredients.length > 1) { e.preventDefault(); removeRow("ingredients", r.id); }
                }}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text");
                  if (text.includes("\n")) { e.preventDefault(); setPasteFor("ingredients"); setPasteText(text); }
                }}
              />
              <button type="button" className="icon-btn danger" aria-label={`Remove ingredient ${i + 1}`} onClick={() => removeRow("ingredients", r.id)}>×</button>
            </li>
          ))}
        </ol>
        {err("ingredients") && <p className="f-err" role="alert">{err("ingredients")}</p>}
        <div className="row-actions">
          <button type="button" className="btn ghost small" onClick={() => addRowAfter("ingredients", v.ingredients.length - 1)}>Add ingredient</button>
          <button type="button" className="btn ghost small" onClick={() => setPasteFor(pasteFor === "ingredients" ? null : "ingredients")}>Paste a whole list</button>
        </div>
        {pasteFor === "ingredients" && <PasteBox label="Paste your ingredient list, one per line" value={pasteText} onChange={setPasteText} onApply={applyPaste} onCancel={() => setPasteFor(null)} />}
      </section>

      {/* 4. Steps */}
      <section className="rf-sec" id={fid("steps")} aria-labelledby={fid("steps-h")}>
        <h2 id={fid("steps-h")}><span className="num" aria-hidden="true">4</span>Steps</h2>
        <p className="hint">One step per box, in order. Mention times like &ldquo;bake 25 minutes&rdquo; and they&apos;ll be highlighted for the cook. Add a photo or short clip to any step that&apos;s easier to show than tell.</p>
        <ol className="steps-edit">
          {v.steps.map((s, i) => (
            <li key={s.id}>
              <span className="step-num" aria-hidden="true">{i + 1}</span>
              <div className="step-body">
                <textarea
                  ref={(el) => { if (el) inputs.current.set(s.id, el); else inputs.current.delete(s.id); }}
                  className="field" rows={2} maxLength={1500} value={s.text} placeholder={i === 0 ? "Heat oven to 350°F (175°C) and grease a loaf pan." : "What happens next?"}
                  aria-label={`Step ${i + 1}`} aria-invalid={!!errors[`steps.${i}.text`]}
                  onChange={(e) => set("steps", v.steps.map((x) => (x.id === s.id ? { ...x, text: e.target.value } : x)))}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    if (!s.text && text.split("\n").filter((l) => l.trim()).length > 1) { e.preventDefault(); setPasteFor("steps"); setPasteText(text); }
                  }}
                />
                {s.media ? (
                  <div className={`step-media ${s.media.status}`}>
                    <Preview kind={s.media.kind} src={s.media.preview} />
                    <span>{s.media.status === "uploading" ? "Uploading…" : s.media.status === "error" ? s.media.error : s.media.kind === "video" ? "Video attached" : "Photo attached"}</span>
                    <button type="button" className="linkbtn" onClick={() => { discard(s.media); set("steps", v.steps.map((x) => (x.id === s.id ? { ...x, media: null } : x))); }}>Remove</button>
                  </div>
                ) : (
                  <label className="linkbtn attach">
                    + Add a photo or video to this step
                    <input type="file" className="sr" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={(e) => {
                      const f = e.target.files?.[0]; e.target.value = "";
                      if (!f) return;
                      const r = beginUpload(f);
                      if (typeof r === "string") setErrors((x) => ({ ...x, steps: r }));
                      else set("steps", v.steps.map((x) => (x.id === s.id ? { ...x, media: r } : x)));
                    }} />
                  </label>
                )}
              </div>
              <div className="step-tools">
                <button type="button" className="icon-btn" aria-label={`Move step ${i + 1} up`} disabled={i === 0} onClick={() => set("steps", moveItem(v.steps, i, -1))}>↑</button>
                <button type="button" className="icon-btn" aria-label={`Move step ${i + 1} down`} disabled={i === v.steps.length - 1} onClick={() => set("steps", moveItem(v.steps, i, 1))}>↓</button>
                <button type="button" className="icon-btn danger" aria-label={`Remove step ${i + 1}`} onClick={() => removeRow("steps", s.id)}>×</button>
              </div>
            </li>
          ))}
        </ol>
        {err("steps") && <p className="f-err" role="alert">{err("steps")}</p>}
        <div className="row-actions">
          <button type="button" className="btn ghost small" onClick={() => addRowAfter("steps", v.steps.length - 1)}>Add step</button>
          <button type="button" className="btn ghost small" onClick={() => setPasteFor(pasteFor === "steps" ? null : "steps")}>Paste all steps</button>
        </div>
        {pasteFor === "steps" && <PasteBox label="Paste your steps, one per line (numbers are removed for you)" value={pasteText} onChange={setPasteText} onApply={applyPaste} onCancel={() => setPasteFor(null)} />}
      </section>

      {/* 5. Details */}
      <section className="rf-sec" id={fid("details")} aria-labelledby={fid("det-h")}>
        <h2 id={fid("det-h")}><span className="num" aria-hidden="true">5</span>Details <small>(optional)</small></h2>
        <div className="f-grid three">
          <div className="f"><label htmlFor={fid("time")}>Total time (minutes)</label><input id={fid("time")} className="field" type="number" inputMode="numeric" min={1} max={2880} value={v.totalMinutes} onChange={(e) => set("totalMinutes", e.target.value)} aria-invalid={!!err("totalMinutes")} />{err("totalMinutes") && <p className="f-err">{err("totalMinutes")}</p>}</div>
          <div className="f"><label htmlFor={fid("serv")}>Serves</label><input id={fid("serv")} className="field" type="number" inputMode="numeric" min={1} max={200} value={v.servings} onChange={(e) => set("servings", e.target.value)} aria-invalid={!!err("servings")} />{err("servings") && <p className="f-err">{err("servings")}</p>}</div>
          <div className="f"><label htmlFor={fid("diff")}>Difficulty</label>
            <select id={fid("diff")} className="field" value={v.difficulty} onChange={(e) => set("difficulty", Number(e.target.value))}>
              {DIFFICULTY.map((d, i) => <option key={d} value={i + 1}>{"🍌".repeat(i + 1)} {d}</option>)}
            </select>
          </div>
        </div>
        <div className="f"><label htmlFor={fid("tn")}>Time note <small>(replaces the time label, e.g. &ldquo;10 min + freezing&rdquo;)</small></label><input id={fid("tn")} className="field" maxLength={40} value={v.timeNote} onChange={(e) => set("timeNote", e.target.value)} /></div>
        <fieldset className="f" id={fid("tags")}>
          <legend>Tags</legend>
          <div className="tagbox">
            {TAGS.map((t) => (
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
            {v.tags.filter((t) => !(TAGS as readonly string[]).includes(t)).map((t) => (
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

      {/* Submit */}
      <div className="rf-submit">
        {errors.form && <p className="f-err" role="alert">{errors.form}</p>}
        {uploading && <p className="hint" role="status">Waiting for uploads to finish…</p>}
        <div className="row-actions">
          <button type="submit" className="btn" disabled={pending || uploading}>
            {pending ? "Saving…" : isEditor ? "Publish recipe" : "Submit for review"}
          </button>
          <button type="button" className="btn ghost" disabled={pending || uploading} onClick={() => submit("draft")}>Save as draft</button>
        </div>
        <p className="hint">
          {isEditor ? "Publishing makes it visible to everyone right away." : "An editor will take a look, then it goes live. Drafts stay private to you."}
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

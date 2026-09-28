import type { MediaKind } from "@/lib/types";

export interface StepMedia {
  kind: MediaKind;
  path: string;
}

export interface StepItem {
  text: string;
  media?: StepMedia | null;
}

/** A titled (or untitled) list of steps on a recipe. */
export interface StepGroup {
  title: string;
  steps: StepItem[];
}

function isStepItem(value: unknown): value is StepItem {
  return !!value && typeof value === "object" && typeof (value as StepItem).text === "string";
}

function isStepGroup(value: unknown): value is { title?: unknown; steps?: unknown } {
  return !!value && typeof value === "object" && Array.isArray((value as { steps?: unknown }).steps);
}

/** Normalize DB/API values: legacy flat steps or group objects → StepGroup[]. */
export function normalizeStepGroups(raw: unknown): StepGroup[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ title: "", steps: [] }];
  }
  // Already grouped: first entry has a steps array.
  if (isStepGroup(raw[0])) {
    const groups: StepGroup[] = [];
    for (const entry of raw) {
      if (!isStepGroup(entry)) continue;
      const title = typeof entry.title === "string" ? entry.title.trim() : "";
      const steps = (entry.steps as unknown[])
        .filter(isStepItem)
        .map((s) => ({
          text: String(s.text).trim(),
          media: s.media && typeof s.media === "object" && "path" in s.media && "kind" in s.media
            ? { kind: s.media.kind as MediaKind, path: String(s.media.path) }
            : null,
        }))
        .filter((s) => s.text);
      groups.push({ title, steps });
    }
    return groups.length ? groups : [{ title: "", steps: [] }];
  }
  // Legacy flat list of { text, media }.
  if (isStepItem(raw[0])) {
    return [{
      title: "",
      steps: (raw as unknown[])
        .filter(isStepItem)
        .map((s) => ({
          text: String(s.text).trim(),
          media: s.media && typeof s.media === "object" && "path" in s.media && "kind" in s.media
            ? { kind: s.media.kind as MediaKind, path: String(s.media.path) }
            : null,
        }))
        .filter((s) => s.text),
    }];
  }
  return [{ title: "", steps: [] }];
}

export function flattenSteps(groups: StepGroup[]): StepItem[] {
  return groups.flatMap((g) => g.steps);
}

export function countSteps(groups: StepGroup[]): number {
  return flattenSteps(groups).length;
}

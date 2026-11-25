const MAX_HEAD_JSON_CHARS = 100_000;

export type HeadJson = Record<string, unknown> | unknown[];

export function isHeadJson(value: unknown): value is HeadJson {
  return value !== null && typeof value === "object";
}

/** Read a JSON file, including UTF-16 files saved by Windows Notepad. */
export async function readJsonFile(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes);
  }
  return new TextDecoder("utf-8").decode(bytes);
}

function normalizeJsonText(text: string): string {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]/g, " ")
    .trim();
}

function parseJsonLoose(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(text.replace(/,\s*([}\]])/g, "$1"));
  }
}

/** A file that was stored as `{ "<raw json>": null }` instead of the object inside it. */
function unwrapSingletonNullKey(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const keys = Object.keys(value);
  if (keys.length !== 1) return value;
  const key = normalizeJsonText(keys[0] ?? "");
  if (!key || (value as Record<string, unknown>)[keys[0]] !== null) return value;
  if (!key.startsWith("{") && !key.startsWith("[")) return value;
  try {
    return parseJsonLoose(key);
  } catch {
    return value;
  }
}

export function parseHeadJsonText(raw: string): { ok: true; value: HeadJson } | { ok: false; error: string } {
  let text = normalizeJsonText(raw);
  if (!text) return { ok: false, error: "That file is empty." };

  const wrapped = text.match(/^<script\b[^>]*>([\s\S]*?)<\/script>\s*$/i);
  if (wrapped?.[1]) text = normalizeJsonText(wrapped[1]);

  let parsed: unknown;
  try {
    parsed = parseJsonLoose(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  if (typeof parsed === "string") {
    try {
      parsed = parseJsonLoose(normalizeJsonText(parsed));
    } catch {
      return { ok: false, error: "JSON must be an object or an array." };
    }
  }

  parsed = unwrapSingletonNullKey(parsed);
  if (!isHeadJson(parsed)) return { ok: false, error: "JSON must be an object or an array." };

  let encoded: string;
  try {
    encoded = JSON.stringify(parsed);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  if (encoded.length > MAX_HEAD_JSON_CHARS) return { ok: false, error: "Keep the JSON under 100 KB." };
  return { ok: true, value: parsed };
}

/** Accept a parsed object, a JSON string from the editor, or null. */
export function coerceHeadJson(value: unknown): { ok: true; value: HeadJson | null } | { ok: false; error: string } {
  if (value == null || value === "") return { ok: true, value: null };
  if (typeof value === "string") return parseHeadJsonText(value);
  const unwrapped = unwrapSingletonNullKey(value);
  if (!isHeadJson(unwrapped)) return { ok: false, error: "JSON must be an object or an array." };
  try {
    if (JSON.stringify(unwrapped).length > MAX_HEAD_JSON_CHARS) {
      return { ok: false, error: "Keep the JSON under 100 KB." };
    }
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  return { ok: true, value: unwrapped };
}

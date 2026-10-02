import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true,
});

/** Strip common inline markdown markers from titles/excerpts. */
export function stripInlineMarkdown(value: string): string {
  return value
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function normalizeMarkdown(source: string): string {
  return source
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    // Trailing spaces on heading lines break some parsers / look messy
    .replace(/^(#{1,6}[^\n]*?)[ \t]+$/gm, "$1")
    // Normalize NBSP that sometimes sneaks in from docs
    .replace(/\u00a0/g, " ");
}

/** True when the string already looks like an HTML document fragment. */
export function looksLikeHtml(source: string): boolean {
  return /^\s*</.test(source);
}

/**
 * Convert markdown (or pass through existing HTML) into HTML for blog/recipe notes.
 * CSS and JS from the editor are preserved.
 */
export function renderPostMarkdown(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) return "";

  if (looksLikeHtml(trimmed)) {
    return trimmed;
  }

  const md = normalizeMarkdown(trimmed);
  return marked.parse(md, { async: false }) as string;
}

/** Convert a markdown body into stored HTML at upload time. */
export function markdownToPostHtml(source: string): string {
  return renderPostMarkdown(source);
}

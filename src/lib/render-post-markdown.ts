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

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "");
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
 * Convert markdown (or pass through existing HTML) into safe HTML for the blog.
 */
export function renderPostMarkdown(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) return "";

  if (looksLikeHtml(trimmed)) {
    return sanitizeHtml(trimmed);
  }

  const md = normalizeMarkdown(trimmed);
  const html = marked.parse(md, { async: false }) as string;
  return sanitizeHtml(html);
}

/** Convert a markdown body into stored HTML at upload time. */
export function markdownToPostHtml(source: string): string {
  return renderPostMarkdown(source);
}

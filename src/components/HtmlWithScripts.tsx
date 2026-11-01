/**
 * Retired. Blog HTML is sanitized at render time and must not reinsert scripts.
 * This file remains so older imports fail loudly instead of executing markup.
 */
export function HtmlWithScripts(): never {
  throw new Error("HtmlWithScripts has been removed. Sanitize HTML before rendering it.");
}

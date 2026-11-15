import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "blockquote",
  "h2",
  "h3",
  "h4",
  "code",
  "pre",
  "hr",
  "span",
  "img",
  "figure",
  "figcaption",
];

const ALLOWED_ATTR = ["href", "src", "alt", "title", "width", "height", "rel", "target", "loading"];

/** Editorial markup stored inside blog posts (scorecards, comparison tables). */
const POST_TAGS = [
  ...ALLOWED_TAGS,
  "div",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "colgroup",
  "col",
  "style",
];

const POST_ATTR = [
  ...ALLOWED_ATTR,
  "class",
  "id",
  "style",
  "scope",
  "colspan",
  "rowspan",
  "headers",
  "span",
  "data-label",
  "data-curd-label",
];

const SHARED_OPTIONS = {
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https"],
  },
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
  },
} satisfies sanitizeHtml.IOptions;

/** Drop CSS that can execute or pull in outside resources. Layout rules stay. */
function scrubCss(css: string): string {
  return css
    .replace(/<\/style/gi, "")
    .replace(/(?:expression\s*\(|javascript\s*:|@import\b|-moz-binding|behavior\s*:|url\s*\()/gi, "");
}

function scrubEmbeddedCss(html: string): string {
  return html
    .replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_match, attrs: string, css: string) => {
      return `<style${attrs}>${scrubCss(css)}</style>`;
    })
    .replace(/\sstyle="([^"]*)"/gi, (_match, css: string) => {
      const safe = scrubCss(css).trim();
      return safe ? ` style="${safe}"` : "";
    });
}

/** Strip scripts, handlers, and other active markup from member-written HTML. */
export function sanitizeUserHtml(html: string): string {
  return sanitizeHtml(html, {
    ...SHARED_OPTIONS,
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      "*": ALLOWED_ATTR,
    },
  });
}

/**
 * Sanitize a blog post body. Keeps the per-post `<style>` blocks and table
 * markup those posts were written with, and still drops scripts and handlers.
 */
export function sanitizePostHtml(html: string): string {
  const clean = sanitizeHtml(html, {
    ...SHARED_OPTIONS,
    allowedTags: POST_TAGS,
    allowedAttributes: {
      "*": POST_ATTR,
    },
    allowVulnerableTags: true,
  });
  return scrubEmbeddedCss(clean);
}

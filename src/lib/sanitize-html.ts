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

/** Strip scripts, handlers, and other active markup from member-written HTML. */
export function sanitizeUserHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      "*": ALLOWED_ATTR,
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    },
  });
}

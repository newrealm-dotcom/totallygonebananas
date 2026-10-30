import DOMPurify from "isomorphic-dompurify";

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

let hooked = false;

function ensureHooks(): void {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.nodeName === "A") {
      node.setAttribute("rel", "noopener noreferrer");
      const href = node.getAttribute("href") ?? "";
      if (href && !/^(https?:|mailto:|\/(?!\/)|#)/i.test(href)) node.removeAttribute("href");
    }
    if (node.nodeName === "IMG") {
      const src = node.getAttribute("src") ?? "";
      if (src && !/^(https?:|\/(?!\/))/i.test(src)) node.removeAttribute("src");
    }
  });
}

/** Strip scripts, handlers, and other active markup from member-written HTML. */
export function sanitizeUserHtml(html: string): string {
  ensureHooks();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

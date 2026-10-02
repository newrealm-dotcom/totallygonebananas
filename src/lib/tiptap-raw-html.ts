import Image from "@tiptap/extension-image";
import { Extension, Node, mergeAttributes } from "@tiptap/react";

const ATTR_TYPES = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "link",
  "image",
  "divBlock",
  "figure",
  "figcaption",
] as const;

function stringAttr(name: string) {
  return {
    default: null as string | null,
    parseHTML: (el: HTMLElement) => el.getAttribute(name),
    renderHTML: (attrs: Record<string, unknown>) =>
      attrs[name] != null && attrs[name] !== "" ? { [name]: attrs[name] as string } : {},
  };
}

function boolAttr(name: string) {
  return {
    default: null as string | null,
    parseHTML: (el: HTMLElement) => (el.hasAttribute(name) ? "" : null),
    renderHTML: (attrs: Record<string, unknown>) =>
      attrs[name] != null ? { [name]: attrs[name] as string } : {},
  };
}

/** Keep style / class / id on common nodes so CSS hooks survive round-trips. */
export const PreserveHtmlAttrs = Extension.create({
  name: "preserveHtmlAttrs",
  addGlobalAttributes() {
    return [
      {
        types: [...ATTR_TYPES],
        attributes: {
          style: stringAttr("style"),
          class: stringAttr("class"),
          id: stringAttr("id"),
        },
      },
    ];
  },
});

/** Block images between paragraphs (and inline styles / classes on them). */
export const BlogImage = Image.extend({
  name: "image",
  addAttributes() {
    return {
      ...this.parent?.(),
      width: stringAttr("width"),
      height: stringAttr("height"),
      style: stringAttr("style"),
      class: stringAttr("class"),
      id: stringAttr("id"),
      loading: stringAttr("loading"),
      decoding: stringAttr("decoding"),
    };
  },
}).configure({
  inline: false,
  allowBase64: true,
});

/** Wrapper divs so layout/CSS classes survive Code ↔ Visual. */
export const DivBlock = Node.create({
  name: "divBlock",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML() {
    return [{ tag: "div" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes), 0];
  },
  addAttributes() {
    return {
      style: stringAttr("style"),
      class: stringAttr("class"),
      id: stringAttr("id"),
    };
  },
});

export const FigureBlock = Node.create({
  name: "figure",
  group: "block",
  content: "block+",
  defining: true,
  parseHTML() {
    return [{ tag: "figure" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes(HTMLAttributes), 0];
  },
  addAttributes() {
    return {
      style: stringAttr("style"),
      class: stringAttr("class"),
      id: stringAttr("id"),
    };
  },
});

export const FigcaptionBlock = Node.create({
  name: "figcaption",
  group: "block",
  content: "inline*",
  defining: true,
  parseHTML() {
    return [{ tag: "figcaption" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["figcaption", mergeAttributes(HTMLAttributes), 0];
  },
  addAttributes() {
    return {
      style: stringAttr("style"),
      class: stringAttr("class"),
      id: stringAttr("id"),
    };
  },
});

/**
 * Preserve `<style>` blocks. CSS text is stored as an attribute so TipTap
 * doesn't escape braces/selectors when round-tripping through the document.
 */
export const StyleBlock = Node.create({
  name: "styleBlock",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML() {
    return [
      {
        tag: "style",
        getAttrs: (el) => ({
          css: (el as HTMLElement).textContent ?? "",
          type: (el as HTMLElement).getAttribute("type"),
          media: (el as HTMLElement).getAttribute("media"),
          id: (el as HTMLElement).getAttribute("id"),
        }),
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    const { css, ...rest } = node.attrs as { css?: string; [key: string]: unknown };
    const attrs = mergeAttributes(HTMLAttributes, {
      type: rest.type || undefined,
      media: rest.media || undefined,
      id: rest.id || undefined,
    });
    return ["style", attrs, css || ""];
  },
  addAttributes() {
    return {
      css: { default: "", rendered: false },
      type: stringAttr("type"),
      media: stringAttr("media"),
      id: stringAttr("id"),
    };
  },
});

/** Preserve `<script>` blocks with source text intact. */
export const ScriptBlock = Node.create({
  name: "scriptBlock",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML() {
    return [
      {
        tag: "script",
        getAttrs: (el) => {
          const node = el as HTMLElement;
          return {
            js: node.textContent ?? "",
            src: node.getAttribute("src"),
            type: node.getAttribute("type"),
            id: node.getAttribute("id"),
            async: node.hasAttribute("async") ? "" : null,
            defer: node.hasAttribute("defer") ? "" : null,
            crossorigin: node.getAttribute("crossorigin"),
            integrity: node.getAttribute("integrity"),
            nomodule: node.hasAttribute("nomodule") ? "" : null,
            referrerpolicy: node.getAttribute("referrerpolicy"),
            charset: node.getAttribute("charset"),
          };
        },
      },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    const { js, ...rest } = node.attrs as { js?: string; [key: string]: unknown };
    const attrs: Record<string, unknown> = {};
    for (const key of [
      "src",
      "type",
      "id",
      "async",
      "defer",
      "crossorigin",
      "integrity",
      "nomodule",
      "referrerpolicy",
      "charset",
    ] as const) {
      if (rest[key] != null) attrs[key] = rest[key];
    }
    return ["script", mergeAttributes(HTMLAttributes, attrs), js || ""];
  },
  addAttributes() {
    return {
      js: { default: "", rendered: false },
      src: stringAttr("src"),
      type: stringAttr("type"),
      id: stringAttr("id"),
      async: boolAttr("async"),
      defer: boolAttr("defer"),
      crossorigin: stringAttr("crossorigin"),
      integrity: stringAttr("integrity"),
      nomodule: boolAttr("nomodule"),
      referrerpolicy: stringAttr("referrerpolicy"),
      charset: stringAttr("charset"),
    };
  },
});

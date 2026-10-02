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

/** Preserve `<style>` blocks written in Code mode. */
export const StyleBlock = Node.create({
  name: "styleBlock",
  group: "block",
  content: "text*",
  marks: "",
  code: true,
  defining: true,
  isolating: true,
  parseHTML() {
    return [{ tag: "style" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["style", mergeAttributes(HTMLAttributes), 0];
  },
  addAttributes() {
    return {
      type: stringAttr("type"),
      media: stringAttr("media"),
      id: stringAttr("id"),
    };
  },
});

/** Preserve `<script>` blocks written in Code mode. */
export const ScriptBlock = Node.create({
  name: "scriptBlock",
  group: "block",
  content: "text*",
  marks: "",
  code: true,
  defining: true,
  isolating: true,
  parseHTML() {
    return [{ tag: "script" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["script", mergeAttributes(HTMLAttributes), 0];
  },
  addAttributes() {
    return {
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

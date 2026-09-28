"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { useState, type ReactNode } from "react";
import { looksLikeHtml, renderPostMarkdown } from "@/lib/render-post-markdown";

type EditorMode = "visual" | "code";

function initialHtml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return looksLikeHtml(trimmed) ? trimmed : renderPostMarkdown(trimmed);
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`wysiwyg-btn${active ? " is-active" : ""}`}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const next = window.prompt("Link URL", previous ?? "https://");
    if (next === null) return;
    const href = next.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  return (
    <div className="wysiwyg-toolbar" role="toolbar" aria-label="Formatting">
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span style={{ textDecoration: "underline" }}>U</span>
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <span style={{ textDecoration: "line-through" }}>S</span>
      </ToolbarButton>
      <span className="wysiwyg-sep" aria-hidden="true" />
      <ToolbarButton
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>
      <span className="wysiwyg-sep" aria-hidden="true" />
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. List
      </ToolbarButton>
      <ToolbarButton
        label="Block quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        “ ”
      </ToolbarButton>
      <span className="wysiwyg-sep" aria-hidden="true" />
      <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink}>
        Link
      </ToolbarButton>
      <ToolbarButton
        label="Remove link"
        disabled={!editor.isActive("link")}
        onClick={() => editor.chain().focus().unsetLink().run()}
      >
        Unlink
      </ToolbarButton>
      <ToolbarButton
        label="Clear formatting"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      >
        Clear
      </ToolbarButton>
    </div>
  );
}

export function PostBodyEditor({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (html: string) => void;
  invalid?: boolean;
}) {
  const [mode, setMode] = useState<EditorMode>("visual");
  const [code, setCode] = useState(() => initialHtml(value));

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Placeholder.configure({
        placeholder: "Write the post…",
      }),
    ],
    content: initialHtml(value),
    editorProps: {
      attributes: {
        class: "wysiwyg-content",
        "aria-invalid": invalid ? "true" : "false",
        "aria-label": "Post body",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.isEmpty ? "" : ed.getHTML();
      setCode(html);
      onChange(html);
    },
  });

  function switchMode(next: EditorMode) {
    if (next === mode) return;
    if (next === "code") {
      const html = editor ? (editor.isEmpty ? "" : editor.getHTML()) : code;
      setCode(html);
      onChange(html);
    } else {
      const html = code.trim();
      editor?.commands.setContent(html || "", { emitUpdate: false });
      onChange(html);
    }
    setMode(next);
  }

  function onCodeChange(next: string) {
    setCode(next);
    onChange(next);
  }

  return (
    <div id="post-body" className={`wysiwyg${invalid ? " is-invalid" : ""}`}>
      <div className="wysiwyg-mode" role="group" aria-label="Editor mode">
        <button
          type="button"
          className={`btn small${mode === "visual" ? "" : " ghost"}`}
          aria-pressed={mode === "visual"}
          onClick={() => switchMode("visual")}
        >
          Visual
        </button>
        <button
          type="button"
          className={`btn small${mode === "code" ? "" : " ghost"}`}
          aria-pressed={mode === "code"}
          onClick={() => switchMode("code")}
        >
          Code
        </button>
      </div>
      {mode === "visual" ? (
        <>
          {editor ? <Toolbar editor={editor} /> : null}
          <EditorContent editor={editor} />
        </>
      ) : (
        <textarea
          className="wysiwyg-code"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          spellCheck={false}
          aria-label="Post body HTML"
          aria-invalid={invalid || undefined}
        />
      )}
    </div>
  );
}

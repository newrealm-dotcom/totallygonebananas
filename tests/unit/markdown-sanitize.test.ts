import { describe, expect, it } from "vitest";
import { renderPostMarkdown, stripInlineMarkdown } from "@/lib/render-post-markdown";
import { sanitizeUserHtml } from "@/lib/sanitize-html";

describe("renderPostMarkdown", () => {
  it("renders markdown and normalizes inline copy", () => {
    expect(renderPostMarkdown("# Banana tips")).toContain("<h1>Banana tips</h1>");
    expect(stripInlineMarkdown("Try **ripe** [bananas](https://example.com)")).toBe("Try ripe bananas");
  });

  it("passes through existing HTML fragments", () => {
    expect(renderPostMarkdown("<p>Already HTML</p>")).toBe("<p>Already HTML</p>");
  });
});

describe("sanitizeUserHtml", () => {
  it("removes scripts, event handlers, and unsafe URLs from member HTML", () => {
    const sanitized = sanitizeUserHtml(
      '<p onclick="alert(1)">Hi<script>alert(1)</script><a href="javascript:alert(1)" target="_blank">bad</a><img src="data:text/html,bad" alt="bad"></p>',
    );

    expect(sanitized).toContain("<p>");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).not.toContain("data:text/html");
    expect(sanitized).toContain('rel="noopener noreferrer"');
  });

  it("keeps safe links and images", () => {
    const sanitized = sanitizeUserHtml(
      '<p><a href="https://example.com">safe</a><img src="/banana.webp" alt="banana"></p>',
    );

    expect(sanitized).toContain('href="https://example.com"');
    expect(sanitized).toContain('src="/banana.webp"');
  });
});

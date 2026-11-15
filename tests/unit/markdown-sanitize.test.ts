import { describe, expect, it } from "vitest";
import { renderPostMarkdown, stripInlineMarkdown } from "@/lib/render-post-markdown";
import { sanitizePostHtml, sanitizeUserHtml } from "@/lib/sanitize-html";

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

  it("drops blog tables from member HTML", () => {
    const sanitized = sanitizeUserHtml(
      '<style>.x{color:red}</style><table class="tgb-scorecard"><tr><td>7</td></tr></table>',
    );

    expect(sanitized).not.toContain("<style");
    expect(sanitized).not.toContain("<table");
    expect(sanitized).toContain("7");
  });
});

describe("sanitizePostHtml", () => {
  it("keeps scorecard styles and table markup", () => {
    const sanitized = sanitizePostHtml(
      '<style>.tgb-scorecard td { font-weight: 700; }</style><div class="tgb-scorecard-wrap"><table class="tgb-scorecard"><thead><tr><th scope="col">Banana</th></tr></thead><tbody><tr><td data-label="Price" style="text-align: left">7</td></tr></tbody></table></div>',
    );

    expect(sanitized).toContain("<style>");
    expect(sanitized).toContain(".tgb-scorecard");
    expect(sanitized).toContain('class="tgb-scorecard"');
    expect(sanitized).toContain('scope="col"');
    expect(sanitized).toContain('data-label="Price"');
    expect(sanitized).toContain("text-align:left");
    expect(sanitized).not.toContain("<script");
  });

  it("strips scripts and active CSS from post HTML", () => {
    const sanitized = sanitizePostHtml(
      '<style>.x{background:url(javascript:alert(1));behavior:url(x)}</style><p onclick="alert(1)">Hi<script>alert(1)</script></p><table><tr><td style="background:url(https://evil.test/x)">1</td></tr></table>',
    );

    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).not.toContain("url(");
    expect(sanitized).not.toContain("behavior:");
    expect(sanitized).toContain("<table>");
    expect(sanitized).toContain(">1<");
  });
});

import { describe, expect, it } from "vitest";
import { coerceHeadJson, parseHeadJsonText } from "@/lib/head-json";
import { postInput } from "@/lib/validation";

const faq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [{ "@type": "Question", name: "Ripe?", acceptedAnswer: { "@type": "Answer", text: "When it spots." } }],
};

describe("parseHeadJsonText", () => {
  it("accepts an object, an array, a BOM, and a script wrapper", () => {
    const object = parseHeadJsonText(JSON.stringify(faq));
    const list = parseHeadJsonText(JSON.stringify([faq]));
    const bom = parseHeadJsonText(`\uFEFF${JSON.stringify(faq)}`);
    const wrapped = parseHeadJsonText(`<script type="application/ld+json">${JSON.stringify(faq)}</script>`);
    expect(object.ok && object.value).toMatchObject({ "@type": "FAQPage" });
    expect(list.ok && list.value).toEqual([faq]);
    expect(bom.ok && bom.value).toMatchObject({ "@type": "FAQPage" });
    expect(wrapped.ok && wrapped.value).toMatchObject({ "@type": "FAQPage" });
  });

  it("unwraps a file that was saved as a single null key", () => {
    const wrapped = { [`\uFEFF${JSON.stringify(faq, null, 2)}`]: null };
    const parsed = parseHeadJsonText(JSON.stringify(wrapped));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value).toMatchObject({ "@type": "FAQPage" });
  });

  it("parses a double-encoded JSON string and rejects scalars", () => {
    const parsed = parseHeadJsonText(JSON.stringify(JSON.stringify(faq)));
    expect(parsed.ok && parsed.value).toMatchObject({ "@type": "FAQPage" });
    expect(parseHeadJsonText("42").ok).toBe(false);
    expect(parseHeadJsonText("{").ok).toBe(false);
  });

  it("allows a trailing comma and unicode space indentation", () => {
    const comma = parseHeadJsonText('{"@type":"FAQPage",}');
    const spaced = parseHeadJsonText('{\u2006"@type":\u2006"FAQPage"\u2006}');
    expect(comma.ok && comma.value).toEqual({ "@type": "FAQPage" });
    expect(spaced.ok && spaced.value).toEqual({ "@type": "FAQPage" });
  });
});

describe("save payload", () => {
  it("accepts head JSON after it is coerced from text", () => {
    const head = coerceHeadJson(JSON.stringify(faq));
    expect(head.ok).toBe(true);
    if (!head.ok) return;
    const parsed = postInput.safeParse({
      title: "A fave",
      excerpt: "",
      slug: "a-fave",
      categories: ["Favorites"],
      tags: [],
      body: "Hello",
      coverPath: null,
      headJson: head.value,
      publishedAt: "2026-11-25T18:00:00.000Z",
      intent: "publish",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.headJson).toMatchObject({ "@type": "FAQPage" });
  });
});

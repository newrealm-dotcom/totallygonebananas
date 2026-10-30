import { describe, expect, it } from "vitest";
import {
  cleanSocialText,
  facebookMessage,
  instagramCaption,
  pageUrl,
  pinterestDescription,
  socialImageUrl,
  tiktokCaption,
  twitterText,
} from "@/lib/social/messages";

const baseUrl = "https://totallygonebananas.com";
const input = {
  kind: "recipe" as const,
  slug: "banana-bread",
  title: "**Best** banana bread",
  summary: "A tender loaf with [ripe bananas](https://example.com) and cinnamon.",
};

describe("social message helpers", () => {
  it("strips markdown and builds public URLs", () => {
    expect(cleanSocialText(input.title)).toBe("Best banana bread");
    expect(pageUrl(input, baseUrl)).toBe("https://totallygonebananas.com/recipes/banana-bread");
    expect(socialImageUrl(input, baseUrl)).toBe("https://totallygonebananas.com/api/social-image/recipe/banana-bread.jpg");
  });

  it("formats Facebook, Instagram, Pinterest, and TikTok copy", () => {
    expect(facebookMessage(input)).toContain("Best banana bread");
    expect(instagramCaption(input)).toContain("Get the full recipe at totallygonebananas.com");
    expect(pinterestDescription(input)).toContain("#TotallyGoneBananas");

    const tiktok = tiktokCaption(input, baseUrl);
    expect(tiktok.title).toBe("Best banana bread");
    expect(tiktok.description).toContain(pageUrl(input, baseUrl));
  });

  it("keeps Twitter text inside the standard limit for normal share copy", () => {
    const url = pageUrl(input, baseUrl);
    const text = twitterText(
      {
        ...input,
        summary: "A ".repeat(240),
      },
      baseUrl,
    );

    expect(text).toContain(url);
    expect(text).toContain("#TotallyGoneBananas");
    expect(text.replace(url, "x".repeat(23)).length).toBeLessThanOrEqual(280);
  });
});

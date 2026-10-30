import { describe, expect, it } from "vitest";
import { postInput, recipeInput } from "@/lib/validation";

const USER_ID = "123e4567-e89b-12d3-a456-426614174000";

function validRecipe(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    title: " Banana bread ",
    description: "A reliable loaf.",
    categories: ["breakfast", "breakfast"],
    newCategories: [],
    emoji: "🍌",
    totalMinutes: 45,
    notes: "",
    servings: "8 slices",
    difficulty: 2,
    tags: ["Vegan", "vegan", "quick"],
    equipment: [{ text: "Loaf pan", url: "https://example.com/pan" }],
    ingredients: [{ title: "", items: [{ text: "2 ripe bananas", url: "https://example.com/bananas" }] }],
    steps: [{ title: "", steps: [{ text: "Mash the bananas.", media: null }] }],
    gallery: [{ kind: "image", path: `${USER_ID}/cover.webp`, caption: "Finished loaf" }],
    cuisine: "american",
    adaptedFromName: "",
    adaptedFromUrl: "",
    intent: "submit",
    turnstileToken: "token",
    ...overrides,
  };
}

describe("recipeInput", () => {
  it("normalizes repeated categories, tags, and cuisine", () => {
    const parsed = recipeInput.parse(validRecipe());

    expect(parsed.title).toBe("Banana bread");
    expect(parsed.categories).toEqual(["breakfast"]);
    expect(parsed.tags).toEqual(["vegan", "quick"]);
    expect(parsed.cuisine).toBe("American");
  });

  it("rejects unsafe adapted-from and ingredient links", () => {
    const result = recipeInput.safeParse(validRecipe({
      adaptedFromUrl: "javascript:alert(1)",
      ingredients: [{ title: "", items: [{ text: "2 bananas", url: "bananas.example" }] }],
    }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Use a full http:// or https:// link");
    }
  });

  it("requires at least one ingredient and one step", () => {
    const result = recipeInput.safeParse(validRecipe({
      ingredients: [{ title: "", items: [] }],
      steps: [{ title: "", steps: [] }],
    }));

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toContain("Add at least one ingredient");
      expect(messages).toContain("Add at least one step");
    }
  });
});

describe("postInput", () => {
  it("normalizes slugs and tags", () => {
    const parsed = postInput.parse({
      title: "Bananas in Space",
      excerpt: "A post.",
      slug: "Bananas-In-Space",
      categories: ["history"],
      tags: ["Science", "science"],
      body: "Hello **banana**.",
      coverPath: "/og-image.jpg",
      headJson: null,
      publishedAt: null,
      intent: "publish",
    });

    expect(parsed.slug).toBe("bananas-in-space");
    expect(parsed.tags).toEqual(["science"]);
  });
});

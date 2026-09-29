import { z } from "zod";
import { MEDIA_PATH_RE } from "@/lib/media";
import { MAX_TAGS, normalizeTag, tagIssue } from "@/lib/tags";

const mediaRef = z.object({
  kind: z.enum(["image", "video"]),
  path: z.string().regex(MEDIA_PATH_RE, "Invalid media path"),
});

const optionalInt = (min: number, max: number, label: string) =>
  z
    .number()
    .int()
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be ${max} or less`)
    .nullable();

export const recipeInput = z.object({
  title: z.string().trim().min(2, "Give your recipe a name").max(100, "Keep the name under 100 characters"),
  description: z.string().trim().max(300, "Keep the description under 300 characters").default(""),
  categoryId: z.string().min(1, "Pick a category"),
  newCategory: z
    .object({ name: z.string().trim().min(2, "Name the new category").max(40), emoji: z.string().trim().max(8).default("") })
    .nullable()
    .default(null),
  emoji: z.string().trim().max(8).default(""),
  totalMinutes: optionalInt(1, 2880, "Time"),
  notes: z.string().trim().max(20000, "Keep the notes under 20,000 characters").default(""),
  servings: z.string().trim().max(80, "Keep the serving size under 80 characters").default(""),
  difficulty: z.number().int().min(1).max(5).default(2),
  tags: z
    .array(
      z
        .string()
        .trim()
        .transform(normalizeTag)
        .superRefine((val, ctx) => {
          const issue = tagIssue(val);
          if (issue) ctx.addIssue({ code: "custom", message: issue });
        }),
    )
    .max(MAX_TAGS, `Up to ${MAX_TAGS} tags`)
    .default([])
    .transform((tags) => [...new Set(tags)]),
  equipment: z
    .array(z.string().trim().min(1).max(200, "Each equipment item must be under 200 characters"))
    .max(40, "That's a lot of equipment! Keep it to 40")
    .default([]),
  ingredients: z
    .array(
      z.object({
        title: z.string().trim().max(80, "Keep the list title under 80 characters").default(""),
        items: z
          .array(z.string().trim().min(1).max(200, "Each ingredient must be under 200 characters"))
          .max(80, "That's a lot of ingredients in one list! Keep it to 80"),
      }),
    )
    .min(1, "Add at least one ingredient list")
    .max(12, "Up to 12 ingredient lists")
    .superRefine((groups, ctx) => {
      const total = groups.reduce((n, g) => n + g.items.length, 0);
      if (total < 1) {
        ctx.addIssue({ code: "custom", message: "Add at least one ingredient", path: [] });
      }
      if (total > 120) {
        ctx.addIssue({ code: "custom", message: "That's a lot of ingredients! Keep it to 120 total", path: [] });
      }
    }),
  steps: z
    .array(
      z.object({
        title: z.string().trim().max(80, "Keep the list title under 80 characters").default(""),
        steps: z
          .array(
            z.object({
              text: z.string().trim().min(1, "Steps can't be empty").max(1500),
              media: mediaRef.nullable().default(null),
            }),
          )
          .max(60, "That's a lot of steps in one list! Keep it to 60"),
      }),
    )
    .min(1, "Add at least one step list")
    .max(12, "Up to 12 step lists")
    .superRefine((groups, ctx) => {
      const total = groups.reduce((n, g) => n + g.steps.length, 0);
      if (total < 1) {
        ctx.addIssue({ code: "custom", message: "Add at least one step", path: [] });
      }
      if (total > 120) {
        ctx.addIssue({ code: "custom", message: "That's a lot of steps! Keep it to 120 total", path: [] });
      }
    }),
  gallery: z.array(mediaRef.extend({ caption: z.string().trim().max(140).default("") })).max(12, "Up to 12 photos and videos"),
  intent: z.enum(["draft", "submit", "publish"]),
});

export type RecipeInput = z.input<typeof recipeInput>;

export const profileInput = z.object({
  displayName: z.string().trim().min(1, "Add a display name").max(60),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,24}$/, "Usernames are 3 to 24 letters, numbers, or underscores")
    .or(z.literal("")),
  bio: z.string().trim().max(280, "Keep your bio under 280 characters").default(""),
  avatarPath: z.string().regex(MEDIA_PATH_RE).nullable(),
});

export type ProfileInput = z.input<typeof profileInput>;

export const postInput = z.object({
  seoTitle: z.string().trim().max(70, "Keep the SEO title under 70 characters").default(""),
  metaDescription: z.string().trim().max(160, "Keep the meta description under 160 characters").default(""),
  slug: z
    .string()
    .trim()
    .max(80, "Keep the slug under 80 characters")
    .default("")
    .transform((v) => v.toLowerCase())
    .refine((v) => !v || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v), "Use lowercase letters, numbers, and hyphens only"),
  title: z.string().trim().min(2, "Give your post a title").max(120, "Keep the title under 120 characters"),
  excerpt: z.string().trim().max(300, "Keep the excerpt under 300 characters").default(""),
  /** Blog category names (resolved to blog_categories ids on save). Not recipe categories. */
  categories: z
    .array(z.string().trim().min(1).max(40, "Keep category names under 40 characters"))
    .max(12, "Up to 12 blog categories")
    .default([]),
  body: z.string().trim().min(1, "Write something").max(50000, "That's a bit long — keep it under 50,000 characters"),
  coverPath: z
    .string()
    .trim()
    .nullable()
    .default(null)
    .transform((v) => (v === "" ? null : v))
    .refine(
      (v) =>
        v === null ||
        MEDIA_PATH_RE.test(v) ||
        v.startsWith("/") ||
        v.startsWith("http://") ||
        v.startsWith("https://"),
      "Use an image URL or upload a file",
    ),
  headJson: z
    .union([z.record(z.string(), z.unknown()), z.array(z.unknown())])
    .nullable()
    .default(null)
    .refine((v) => v === null || JSON.stringify(v).length <= 100_000, "Keep the JSON under 100 KB"),
  publishedAt: z
    .string()
    .trim()
    .datetime({ offset: true, message: "Pick a valid publish date" })
    .nullable()
    .optional()
    .default(null),
  intent: z.enum(["draft", "publish"]),
});

export type PostInput = z.input<typeof postInput>;

export const categoryInput = z.object({
  id: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,40}$/, "IDs are 2–40 lowercase letters, numbers, or hyphens")
    .optional(),
  name: z.string().trim().min(2, "Name the category").max(40),
  emoji: z.string().trim().max(8).default("🍌"),
  tagline: z.string().trim().max(120).default(""),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

export type CategoryInput = z.input<typeof categoryInput>;

export const blogCategoryInput = z.object({
  id: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,40}$/, "IDs are 2–40 lowercase letters, numbers, or hyphens")
    .optional(),
  name: z.string().trim().min(2, "Name the category").max(40),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

export type BlogCategoryInput = z.input<typeof blogCategoryInput>;

export const roleInput = z.object({
  userId: z.string().uuid(),
  role: z.enum(["member", "editor", "admin"]),
});

const publicOrMediaPath = z
  .string()
  .trim()
  .min(1, "Add an image")
  .refine(
    (v) => v.startsWith("/") || v.startsWith("http://") || v.startsWith("https://") || MEDIA_PATH_RE.test(v),
    "Use a public path like /featured-home.webp or upload an image",
  );

export const homepagePromoInput = z.object({
  heading: z.string().trim().min(2, "Add a heading").max(120, "Keep the heading under 120 characters"),
  body: z.string().trim().min(1, "Add body text").max(500, "Keep the body under 500 characters"),
  buttonLabel: z.string().trim().min(1, "Add button text").max(40, "Keep the button under 40 characters"),
  buttonHref: z
    .string()
    .trim()
    .min(1, "Add a button link")
    .refine((v) => v.startsWith("/") || /^https?:\/\//.test(v), "Link must start with / or http(s)"),
  imagePath: publicOrMediaPath,
});

export type HomepagePromoInput = z.input<typeof homepagePromoInput>;

/** Turns zod issues into { "steps.2.text": "message" } for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

import { stripInlineMarkdown } from "@/lib/render-post-markdown";

export type SocialMessageKind = "recipe" | "post";

export interface SocialMessageInput {
  kind: SocialMessageKind;
  slug: string;
  title: string;
  summary?: string | null;
}

export const SOCIAL_HASHTAGS = "#TotallyGoneBananas #banana #bananarecipes";

const MAX_SUMMARY = 300;
const TCO_URL_LENGTH = 23;
const TWEET_MAX = 280;

export function cleanSocialText(value: string | null | undefined): string {
  return stripInlineMarkdown(value ?? "").replace(/\s+/g, " ").trim();
}

export function truncateSocialText(value: string, max = MAX_SUMMARY): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

export function pageUrl(input: Pick<SocialMessageInput, "kind" | "slug">, baseUrl: string): string {
  return `${baseUrl}${input.kind === "recipe" ? "/recipes" : "/blog"}/${input.slug}`;
}

export function socialImageUrl(input: Pick<SocialMessageInput, "kind" | "slug">, baseUrl: string): string {
  return `${baseUrl}/api/social-image/${input.kind}/${input.slug}.jpg`;
}

export function facebookMessage(input: SocialMessageInput): string {
  const summary = truncateSocialText(cleanSocialText(input.summary));
  return [cleanSocialText(input.title), summary, SOCIAL_HASHTAGS].filter(Boolean).join("\n\n");
}

/** Instagram captions can't hold clickable links, so point people to the site by name. */
export function instagramCaption(input: SocialMessageInput): string {
  const summary = truncateSocialText(cleanSocialText(input.summary));
  const cta = input.kind === "recipe" ? "Get the full recipe at totallygonebananas.com" : "Read the full post at totallygonebananas.com";
  return [cleanSocialText(input.title), summary, cta, SOCIAL_HASHTAGS].filter(Boolean).join("\n\n").slice(0, 2200);
}

/** X counts every http(s) URL as 23 characters. Stay inside the 280-character standard limit. */
export function twitterText(input: SocialMessageInput, baseUrl: string): string {
  const url = pageUrl(input, baseUrl);
  const title = cleanSocialText(input.title);
  const tags = SOCIAL_HASHTAGS;
  const sep = "\n\n";
  const summary = cleanSocialText(input.summary);
  const used = title.length + TCO_URL_LENGTH + tags.length + sep.length * 2;
  const summaryRoom = TWEET_MAX - used - sep.length;
  if (summary && summaryRoom > 12) {
    return [title, truncateSocialText(summary, summaryRoom), url, tags].join(sep);
  }
  if (used <= TWEET_MAX) return [title, url, tags].join(sep);
  const titleRoom = TWEET_MAX - TCO_URL_LENGTH - tags.length - sep.length * 2;
  return [truncateSocialText(title, Math.max(1, titleRoom)), url, tags].join(sep);
}

export function pinterestDescription(input: SocialMessageInput): string {
  const summary = truncateSocialText(cleanSocialText(input.summary), 500);
  return [summary, SOCIAL_HASHTAGS].filter(Boolean).join("\n\n");
}

/** TikTok photo posts take a short title plus a caption. The image URL is sent separately. */
export function tiktokCaption(input: SocialMessageInput, baseUrl: string): { title: string; description: string } {
  const summary = truncateSocialText(cleanSocialText(input.summary), 500);
  const cta = input.kind === "recipe" ? "Get the full recipe at totallygonebananas.com" : "Read the full post at totallygonebananas.com";
  return {
    title: cleanSocialText(input.title).slice(0, 90),
    description: [summary, cta, pageUrl(input, baseUrl), SOCIAL_HASHTAGS].filter(Boolean).join("\n\n").slice(0, 4000),
  };
}

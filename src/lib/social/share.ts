import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
import { stripInlineMarkdown } from "@/lib/render-post-markdown";
import { metaConfig, postToFacebook, postToInstagram, type MetaConfig } from "@/lib/social/meta";
import { postToTwitter, twitterConfig, type TwitterConfig } from "@/lib/social/twitter";

export type SocialKind = "recipe" | "post";
type SocialNetwork = "facebook" | "instagram" | "twitter";

export interface SocialShareInput {
  kind: SocialKind;
  targetId: string;
  slug: string;
  title: string;
  summary?: string | null;
  hasCover: boolean;
}

const HASHTAGS = "#TotallyGoneBananas #banana #bananarecipes";
const MAX_SUMMARY = 300;

function cleanText(value: string | null | undefined): string {
  return stripInlineMarkdown(value ?? "").replace(/\s+/g, " ").trim();
}

function truncate(value: string, max = MAX_SUMMARY): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

function pageUrl({ kind, slug }: Pick<SocialShareInput, "kind" | "slug">): string {
  return `${siteUrl()}${kind === "recipe" ? "/recipes" : "/blog"}/${slug}`;
}

function socialImageUrl({ kind, slug }: Pick<SocialShareInput, "kind" | "slug">): string {
  return `${siteUrl()}/api/social-image/${kind}/${slug}.jpg`;
}

function facebookMessage(input: SocialShareInput): string {
  const summary = truncate(cleanText(input.summary));
  return [cleanText(input.title), summary, HASHTAGS].filter(Boolean).join("\n\n");
}

/** Instagram captions can't hold clickable links, so point people to the site by name. */
function instagramCaption(input: SocialShareInput): string {
  const summary = truncate(cleanText(input.summary));
  const cta = input.kind === "recipe" ? "Get the full recipe at totallygonebananas.com" : "Read the full post at totallygonebananas.com";
  return [cleanText(input.title), summary, cta, HASHTAGS].filter(Boolean).join("\n\n").slice(0, 2200);
}

/** X counts every http(s) URL as 23 characters. Stay inside the 280-character standard limit. */
const TCO_URL_LENGTH = 23;
const TWEET_MAX = 280;

function twitterText(input: SocialShareInput): string {
  const url = pageUrl(input);
  const title = cleanText(input.title);
  const tags = HASHTAGS;
  const sep = "\n\n";
  const summary = cleanText(input.summary);
  const used = title.length + TCO_URL_LENGTH + tags.length + sep.length * 2;
  const summaryRoom = TWEET_MAX - used - sep.length;
  if (summary && summaryRoom > 12) {
    return [title, truncate(summary, summaryRoom), url, tags].join(sep);
  }
  if (used <= TWEET_MAX) return [title, url, tags].join(sep);
  const titleRoom = TWEET_MAX - TCO_URL_LENGTH - tags.length - sep.length * 2;
  return [truncate(title, Math.max(1, titleRoom)), url, tags].join(sep);
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Inserts the log row first; a unique-key conflict means this network already has it. */
async function claim(supabase: Supabase, input: SocialShareInput, network: SocialNetwork): Promise<string | null> {
  const { data, error } = await supabase
    .from("social_posts")
    .insert({ kind: input.kind, target_id: input.targetId, network })
    .select("id")
    .single();
  return error || !data ? null : data.id;
}

async function record(supabase: Supabase, logId: string, result: { externalId: string } | { error: unknown }) {
  const update =
    "externalId" in result
      ? { status: "posted", external_id: result.externalId, error: null }
      : { status: "failed", error: (result.error instanceof Error ? result.error.message : String(result.error)).slice(0, 1000) };
  await supabase.from("social_posts").update({ ...update, updated_at: new Date().toISOString() }).eq("id", logId);
}

async function shareTo(
  supabase: Supabase,
  input: SocialShareInput,
  network: SocialNetwork,
  publish: () => Promise<{ id: string }>,
) {
  const logId = await claim(supabase, input, network);
  if (!logId) return;
  try {
    const { id } = await publish();
    await record(supabase, logId, { externalId: id });
  } catch (error) {
    console.error(`[social] ${network} share failed for ${input.kind} ${input.slug}:`, error);
    await record(supabase, logId, { error });
  }
}

async function shareNow(meta: MetaConfig | null, twitter: TwitterConfig | null, input: SocialShareInput) {
  const supabase = await createClient();
  const jobs: Promise<void>[] = [];
  if (meta) {
    jobs.push(shareTo(supabase, input, "facebook", () => postToFacebook({ config: meta, message: facebookMessage(input), link: pageUrl(input) })));
    if (meta.igUserId) {
      jobs.push(
        shareTo(supabase, input, "instagram", () => {
          if (!input.hasCover) throw new Error("Instagram needs a cover image");
          return postToInstagram({ config: meta, imageUrl: socialImageUrl(input), caption: instagramCaption(input) });
        }),
      );
    }
  }
  if (twitter && input.kind === "post") {
    jobs.push(shareTo(supabase, input, "twitter", () => postToTwitter({ config: twitter, text: twitterText(input) })));
  }
  await Promise.all(jobs);
}

/** Shares a newly published recipe or post after the response is sent. No-op without network settings. */
export function scheduleSocialShare(input: SocialShareInput): void {
  // Networks fetch links and images from the public site, so local URLs can't work.
  if (/localhost|127\.0\.0\.1/.test(siteUrl())) return;
  const meta = metaConfig();
  const twitter = twitterConfig();
  if (!meta && !twitter) return;
  after(() => shareNow(meta, twitter, input));
}

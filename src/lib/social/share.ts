import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
import { stripInlineMarkdown } from "@/lib/render-post-markdown";
import { metaConfig, postToFacebook, postToInstagram, type MetaConfig } from "@/lib/social/meta";

export type SocialKind = "recipe" | "post";
type SocialNetwork = "facebook" | "instagram";

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

async function shareNow(config: MetaConfig, input: SocialShareInput) {
  const supabase = await createClient();
  await Promise.all([
    shareTo(supabase, input, "facebook", () => postToFacebook({ config, message: facebookMessage(input), link: pageUrl(input) })),
    config.igUserId
      ? shareTo(supabase, input, "instagram", () => {
          if (!input.hasCover) throw new Error("Instagram needs a cover image");
          return postToInstagram({ config, imageUrl: socialImageUrl(input), caption: instagramCaption(input) });
        })
      : Promise.resolve(),
  ]);
}

/** Shares a newly published recipe or post after the response is sent. No-op without Meta settings. */
export function scheduleSocialShare(input: SocialShareInput): void {
  const config = metaConfig();
  // Meta fetches links and images from the public site, so local URLs can't work.
  if (!config || /localhost|127\.0\.0\.1/.test(siteUrl())) return;
  after(() => shareNow(config, input));
}

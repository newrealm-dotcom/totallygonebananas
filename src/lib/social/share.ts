import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
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
import { metaConfig, postToFacebook, postToInstagram, type MetaConfig } from "@/lib/social/meta";
import { pinterestConfig, postToPinterest, type PinterestConfig } from "@/lib/social/pinterest";
import { postToTikTok, tiktokConfig, type TikTokConfig } from "@/lib/social/tiktok";
import { postToTwitter, twitterConfig, type TwitterConfig } from "@/lib/social/twitter";

export type SocialKind = "recipe" | "post";
type SocialNetwork = "facebook" | "instagram" | "twitter" | "pinterest" | "tiktok";

export interface SocialShareInput {
  kind: SocialKind;
  targetId: string;
  slug: string;
  title: string;
  summary?: string | null;
  hasCover: boolean;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Inserts the log row first. A posted row is left alone; a failed row is claimed again so a later publish can retry. */
async function claim(supabase: Supabase, input: SocialShareInput, network: SocialNetwork): Promise<string | null> {
  const { data, error } = await supabase
    .from("social_posts")
    .insert({ kind: input.kind, target_id: input.targetId, network })
    .select("id")
    .single();
  if (!error && data) return data.id;
  if (error?.code !== "23505") return null;

  const { data: retry } = await supabase
    .from("social_posts")
    .update({ status: "sending", error: null, updated_at: new Date().toISOString() })
    .eq("kind", input.kind)
    .eq("target_id", input.targetId)
    .eq("network", network)
    .eq("status", "failed")
    .select("id")
    .maybeSingle();
  return retry?.id ?? null;
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

function coverUrl(input: SocialShareInput, network: string, baseUrl: string): string {
  if (!input.hasCover) throw new Error(`${network} needs a cover image`);
  return socialImageUrl(input, baseUrl);
}

async function shareNow(
  meta: MetaConfig | null,
  twitter: TwitterConfig | null,
  pinterest: PinterestConfig | null,
  tiktok: TikTokConfig | null,
  input: SocialShareInput,
) {
  const supabase = await createClient();
  const baseUrl = siteUrl();
  const imageUrl = input.hasCover ? socialImageUrl(input, baseUrl) : null;
  const jobs: Promise<void>[] = [];
  if (meta) {
    jobs.push(
      shareTo(supabase, input, "facebook", () =>
        postToFacebook({ config: meta, message: facebookMessage(input), link: pageUrl(input, baseUrl), imageUrl }),
      ),
    );
    if (meta.igUserId) {
      jobs.push(
        shareTo(supabase, input, "instagram", () =>
          postToInstagram({ config: meta, imageUrl: coverUrl(input, "Instagram", baseUrl), caption: instagramCaption(input) }),
        ),
      );
    }
  }
  if (twitter) {
    jobs.push(
      shareTo(supabase, input, "twitter", () => postToTwitter({ config: twitter, text: twitterText(input, baseUrl), imageUrl })),
    );
  }
  if (pinterest) {
    jobs.push(
      shareTo(supabase, input, "pinterest", () =>
        postToPinterest({
          config: pinterest,
          title: cleanSocialText(input.title),
          description: pinterestDescription(input),
          link: pageUrl(input, baseUrl),
          imageUrl: coverUrl(input, "Pinterest", baseUrl),
        }),
      ),
    );
  }
  if (tiktok) {
    const caption = tiktokCaption(input, baseUrl);
    jobs.push(
      shareTo(supabase, input, "tiktok", () =>
        postToTikTok({
          config: tiktok,
          title: caption.title,
          description: caption.description,
          imageUrl: coverUrl(input, "TikTok", baseUrl),
        }),
      ),
    );
  }
  await Promise.all(jobs);
}

/** Shares a newly published recipe or post after the response is sent. No-op without network settings. */
export function scheduleSocialShare(input: SocialShareInput): void {
  // Networks fetch links and images from the public site, so local URLs can't work.
  if (/localhost|127\.0\.0\.1/.test(siteUrl())) return;
  after(async () => {
    const [meta, twitter, pinterest, tiktok] = await Promise.all([
      Promise.resolve(metaConfig()),
      Promise.resolve(twitterConfig()),
      pinterestConfig(),
      tiktokConfig(),
    ]);
    if (!meta && !twitter && !pinterest && !tiktok) return;
    await shareNow(meta, twitter, pinterest, tiktok, input);
  });
}

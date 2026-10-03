import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/env";
import { stripInlineMarkdown } from "@/lib/render-post-markdown";

type SocialKind = "recipe" | "post";

interface EnqueueSocialShareInput {
  kind: SocialKind;
  targetId: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  coverPath?: string | null;
}

const HASHTAG = "#TotallyGoneBananas";
const MAX_EXCERPT = 180;

function cleanText(value: string | null | undefined): string {
  return stripInlineMarkdown(value ?? "").replace(/\s+/g, " ").trim();
}

function truncate(value: string, max = MAX_EXCERPT): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}...`;
}

function publicUrl(kind: SocialKind, slug: string): string {
  const path = kind === "recipe" ? `/recipes/${slug}` : `/blog/${slug}`;
  return `${siteUrl()}${path}`;
}

export function buildSocialCaption({
  kind,
  slug,
  title,
  excerpt,
}: Pick<EnqueueSocialShareInput, "kind" | "slug" | "title" | "excerpt">): string {
  const lines = [cleanText(title)];
  const summary = truncate(cleanText(excerpt));
  if (summary) lines.push("", summary);
  lines.push("", publicUrl(kind, slug), "", HASHTAG);
  return lines.join("\n").slice(0, 2200);
}

export async function enqueueSocialShare(input: EnqueueSocialShareInput): Promise<void> {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("social_queue")
    .select("id")
    .eq("kind", input.kind)
    .eq("target_id", input.targetId)
    .maybeSingle();

  if (existing) return;

  await supabase.from("social_queue").insert({
    kind: input.kind,
    target_id: input.targetId,
    slug: input.slug,
    title: cleanText(input.title),
    caption: buildSocialCaption(input),
    url: publicUrl(input.kind, input.slug),
    cover_path: input.coverPath ?? null,
  });
}

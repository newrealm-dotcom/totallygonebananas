"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isEditorRole } from "@/lib/queries";
import { fieldErrors, postInput } from "@/lib/validation";
import { slugify } from "@/lib/format";
import type { PostStatus } from "@/lib/types";

export type SavePostResult = { ok: true; id: string; slug: string; status: PostStatus } | { ok: false; errors: Record<string, string> };

async function uniquePostSlug(
  preferred: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
  excludeId?: string,
) {
  const base = slugify(preferred) || "post";
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    let query = supabase.from("posts").select("id").eq("slug", candidate);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function savePost(raw: unknown, postId?: string): Promise<SavePostResult> {
  const parsed = postInput.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const input = parsed.data;

  const { userId, profile } = await getViewer();
  if (!userId || !isEditorRole(profile)) return { ok: false, errors: { form: "Only editors can manage blog posts." } };

  const supabase = await createClient();
  let existing: { id: string; slug: string; cover_path: string | null } | null = null;
  if (postId) {
    const { data } = await supabase.from("posts").select("id, slug, cover_path").eq("id", postId).maybeSingle();
    if (!data) return { ok: false, errors: { form: "That post no longer exists." } };
    existing = data;
  }

  if (
    input.coverPath &&
    input.coverPath !== existing?.cover_path &&
    !input.coverPath.startsWith(`${userId}/`) &&
    !input.coverPath.startsWith("/") &&
    !input.coverPath.startsWith("http://") &&
    !input.coverPath.startsWith("https://")
  ) {
    return { ok: false, errors: { coverPath: "Cover image couldn't be verified. Upload it again or paste a URL." } };
  }

  const status: PostStatus = input.intent === "publish" ? "published" : "draft";
  const slug =
    existing && !input.slug
      ? existing.slug
      : existing && input.slug === existing.slug
        ? existing.slug
        : await uniquePostSlug(input.slug || input.title, supabase, existing?.id);

  const publishedAt =
    status === "published" ? input.publishedAt || new Date().toISOString() : null;

  const row = {
    title: input.title,
    excerpt: input.excerpt || null,
    body: input.body,
    cover_path: input.coverPath,
    head_json: input.headJson,
    seo_title: input.seoTitle || null,
    meta_description: input.metaDescription || null,
    slug,
    status,
    published_at: publishedAt,
  };

  if (existing) {
    const { error } = await supabase.from("posts").update(row).eq("id", existing.id);
    if (error) {
      if (error.code === "23505") return { ok: false, errors: { slug: "That URL slug is already taken." } };
      return { ok: false, errors: { form: error.message } };
    }
    revalidatePath("/admin");
    revalidatePath("/admin/posts");
    revalidatePath("/blog");
    revalidatePath(`/blog/${existing.slug}`);
    if (slug !== existing.slug) revalidatePath(`/blog/${slug}`);
    return { ok: true, id: existing.id, slug, status };
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({ ...row, author_id: userId })
    .select("id, slug")
    .single();
  if (error || !data) {
    if (error?.code === "23505") return { ok: false, errors: { slug: "That URL slug is already taken." } };
    return { ok: false, errors: { form: error?.message || "Couldn't save the post." } };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  return { ok: true, id: data.id, slug: data.slug, status };
}

export async function deletePost(postId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { profile } = await getViewer();
  if (!isEditorRole(profile)) return { ok: false, error: "Only editors can delete posts." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").delete().eq("id", postId).select("slug").maybeSingle();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  if (data?.slug) revalidatePath(`/blog/${data.slug}`);
  return { ok: true };
}

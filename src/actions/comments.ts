"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, postCommentInput } from "@/lib/validation";
import { getViewer, isEditorRole } from "@/lib/queries";

type Ok = { ok: true };
type Fail = { ok: false; errors?: Record<string, string>; error?: string };

export async function submitPostComment(raw: unknown): Promise<Fail | Ok> {
  const parsed = postCommentInput.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const { userId } = await getViewer();
  const supabase = await createClient();
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, slug, status")
    .eq("id", parsed.data.postId)
    .maybeSingle();
  if (postError || !post || post.status !== "published") {
    return { ok: false, errors: { form: "Comments are only open on published posts." } };
  }

  const { error } = await supabase.from("post_comments").insert({
    post_id: parsed.data.postId,
    author_id: userId ?? null,
    display_name: parsed.data.displayName,
    body: parsed.data.body,
    status: "pending" as const,
  });
  if (error) {
    return { ok: false, errors: { form: "Couldn't send that comment. Please try again in a minute." } };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/comments");
  revalidatePath(`/blog/${post.slug}`);
  return { ok: true };
}

export async function reviewPostComment(
  commentId: string,
  decision: "approve" | "deny",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { profile } = await getViewer();
  if (!isEditorRole(profile)) return { ok: false, error: "Only editors can review comments." };
  if (decision !== "approve" && decision !== "deny") return { ok: false, error: "Invalid decision." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("post_comments")
    .update({
      status: decision === "approve" ? "approved" : "denied",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", commentId)
    .eq("status", "pending")
    .select("id, post_id")
    .maybeSingle();
  if (error) return { ok: false, error: "Couldn't update that comment." };
  if (!data) return { ok: false, error: "That comment is no longer waiting." };

  const { data: post } = await supabase.from("posts").select("slug").eq("id", data.post_id).maybeSingle();
  revalidatePath("/admin");
  revalidatePath("/admin/comments");
  if (post?.slug) revalidatePath(`/blog/${post.slug}`);
  return { ok: true };
}

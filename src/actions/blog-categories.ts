"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer, isEditorRole } from "@/lib/queries";
import { blogCategoryInput, fieldErrors } from "@/lib/validation";
import { slugify } from "@/lib/format";

export type SaveBlogCategoryResult = { ok: true; id: string } | { ok: false; errors: Record<string, string> };

function revalidateBlogCategoryPaths() {
  revalidatePath("/blog");
  revalidatePath("/our-faves");
  revalidatePath("/admin/posts");
  revalidatePath("/admin/our-faves");
  revalidatePath("/admin/blog-categories");
}

export async function saveBlogCategory(raw: unknown, existingId?: string): Promise<SaveBlogCategoryResult> {
  const parsed = blogCategoryInput.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const input = parsed.data;

  const { profile } = await getViewer();
  if (!isEditorRole(profile)) return { ok: false, errors: { form: "Only editors can manage blog categories." } };

  const supabase = await createClient();
  const id = existingId || input.id || slugify(input.name).slice(0, 40);
  if (!/^[a-z0-9-]{2,40}$/.test(id)) return { ok: false, errors: { id: "IDs are 2–40 lowercase letters, numbers, or hyphens" } };

  const row = { id, name: input.name, sort_order: input.sortOrder };
  const { error } = existingId
    ? await supabase.from("blog_categories").update({ name: row.name, sort_order: row.sort_order }).eq("id", existingId)
    : await supabase.from("blog_categories").insert(row);

  if (error) {
    if (error.code === "23505") return { ok: false, errors: { form: "That blog category already exists." } };
    return { ok: false, errors: { form: error.message } };
  }

  revalidateBlogCategoryPaths();
  return { ok: true, id };
}

export async function deleteBlogCategory(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { profile } = await getViewer();
  if (!isEditorRole(profile)) return { ok: false, error: "Only editors can delete blog categories." };
  const supabase = await createClient();

  // Drop the id from any posts that reference it.
  const { data: posts } = await supabase.from("posts").select("id, categories").contains("categories", [id]);
  for (const post of posts ?? []) {
    const next = (post.categories ?? []).filter((c: string) => c !== id);
    await supabase.from("posts").update({ categories: next }).eq("id", post.id);
  }

  const { error } = await supabase.from("blog_categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateBlogCategoryPaths();
  return { ok: true };
}

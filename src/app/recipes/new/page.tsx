import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCategories, getRecipeTags, getViewer, isEditorRole } from "@/lib/queries";
import { RecipeForm } from "@/components/RecipeForm";

export const metadata: Metadata = { title: "Share a recipe" };

export default async function NewRecipePage({ searchParams }: PageProps<"/recipes/new">) {
  const sp = await searchParams;
  const [{ userId, profile }, categories, recipeTags] = await Promise.all([getViewer(), getCategories(), getRecipeTags()]);
  if (!userId) {
    const next = new URLSearchParams();
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const) {
      const v = sp[key];
      if (typeof v === "string") next.set(key, v);
    }
    const q = next.toString();
    redirect(`/login?next=${encodeURIComponent(`/recipes/new${q ? `?${q}` : ""}`)}`);
  }
  const editor = isEditorRole(profile);
  return (
    <div className="wrap narrow">
      <div className="page-head">
        <h1>Share a recipe</h1>
        <p className="lede">
          Add photos or a video, list the ingredients, and walk us through the steps.
          {editor ? " As an editor, you can publish it straight away." : " An editor gives it a quick look before it goes live."}
        </p>
      </div>
      <RecipeForm userId={userId} isEditor={editor} categories={categories} activeTags={recipeTags.map((t) => t.name)} />
    </div>
  );
}

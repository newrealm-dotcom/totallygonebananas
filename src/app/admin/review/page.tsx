import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReviewButtons } from "@/components/OwnerTools";
import { shortDate } from "@/lib/format";
import { countIngredients, normalizeIngredientGroups } from "@/lib/ingredients";
import { countSteps, normalizeStepGroups } from "@/lib/steps";

export const metadata: Metadata = { title: "Admin · Review queue" };

export default async function ReviewPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recipes")
    .select("id, slug, title, description, created_at, ingredients, steps, author:profiles!recipes_author_id_fkey(display_name)")
    .eq("status", "pending")
    .order("created_at");
  const pending = (data ?? []) as unknown as {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    created_at: string;
    ingredients: unknown;
    steps: unknown[];
    author: { display_name: string | null } | null;
  }[];

  return (
    <>
      <div className="sec-head">
        <div>
          <h2>Review queue</h2>
          <p>
            {pending.length
              ? `${pending.length} recipe${pending.length === 1 ? "" : "s"} waiting. Open one to see it exactly as it will appear.`
              : "All caught up. Nothing is waiting for review."}
          </p>
        </div>
      </div>
      <ul className="rows">
        {pending.map((r) => (
          <li key={r.id} className="row review-row">
            <div>
              <h3><Link href={`/recipes/${r.slug}`}>{r.title}</Link></h3>
              <p>From {r.author?.display_name || "a member"} on {shortDate(r.created_at)}. {countIngredients(normalizeIngredientGroups(r.ingredients))} ingredients, {countSteps(normalizeStepGroups(r.steps))} steps.</p>
              {r.description && <p>{r.description}</p>}
            </div>
            <ReviewButtons recipeId={r.id} />
          </li>
        ))}
      </ul>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canEdit, getCategories, getRatings, getRecipeBySlug, getSavedIds, getViewer, isEditorRole } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { publicUrl } from "@/lib/media";
import { shortDate, tintFor, titleCase } from "@/lib/format";
import { renderPostMarkdown } from "@/lib/render-post-markdown";
import { MediaView } from "@/components/MediaView";
import { SaveButton } from "@/components/SaveButton";
import { IngredientPanel } from "@/components/IngredientPanel";
import { MadeItForm } from "@/components/MadeItForm";
import { KitchenConverter } from "@/components/KitchenConverter";
import { PrintRecipeButton } from "@/components/PrintRecipeButton";
import { RecipeFacts } from "@/components/RecipeFacts";
import { DeleteRecipeButton, RemoveLogButton, ReviewButtons } from "@/components/OwnerTools";
import type { CookLog } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/recipes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const r = await getRecipeBySlug(slug);
  if (!r) return { title: "Recipe not found" };
  const img = publicUrl(r.cover_path);
  const title = titleCase(r.title);
  return { title, description: r.description ?? undefined, openGraph: { title, description: r.description ?? undefined, images: img ? [img] : undefined } };
}

const SAVED_MSG: Record<string, string> = {
  published: "Your recipe is live! That's a-peeling.",
  pending: "Thanks! Your recipe is in the review queue. You'll see it here in your Banana Stand while you wait.",
  draft: "Draft saved. Only you can see it until you submit it.",
};

export default async function RecipePage({ params, searchParams }: PageProps<"/recipes/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const r = await getRecipeBySlug(slug);
  if (!r) notFound();

  const [{ userId, profile }, categories, ratings] = await Promise.all([getViewer(), getCategories(), getRatings([r.id])]);
  const saved = (await getSavedIds(userId)).has(r.id);
  const supabase = await createClient();
  const { data: logsData } = await supabase.from("cook_logs").select("*").eq("recipe_id", r.id).order("created_at", { ascending: false }).limit(30);
  const logs = (logsData as CookLog[] | null) ?? [];
  const { data: names } = logs.length
    ? await supabase.from("profiles").select("id, display_name").in("id", [...new Set(logs.map((l) => l.user_id))])
    : { data: [] as { id: string; display_name: string | null }[] };
  const nameOf = new Map((names ?? []).map((n) => [n.id, n.display_name]));

  const cat = categories.find((c) => c.id === r.category_id);
  const rating = ratings.get(r.id);
  const editable = canEdit(r, userId, profile);
  const savedMsg = typeof sp.saved === "string" ? SAVED_MSG[sp.saved] : undefined;
  const gallery = r.recipe_media;
  const hero = gallery[0];

  return (
    <div className="wrap">
      {savedMsg && <p className="notice-inline" role="status">{savedMsg}</p>}
      {r.status !== "published" && (
        <p className="notice-inline warn" role="status">
          {r.status === "pending" && "This recipe is waiting for review. Only you and the editors can see it."}
          {r.status === "draft" && "This is a draft. Only you can see it."}
          {r.status === "rejected" && `An editor sent this back${r.review_note ? `: “${r.review_note}”` : "."} Edit it and resubmit when you're ready.`}
        </p>
      )}

      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/recipes">Recipes</Link>
        {cat && <><span aria-hidden="true">&gt;&gt;</span><Link href={`/recipes?category=${cat.id}`}>{cat.name}</Link></>}
      </nav>

      <section className="d-hero">
        <div className="d-media">
          <div className="d-art" style={{ background: tintFor(r.category_id, categories) }}>
            {hero ? <MediaView path={hero.path} kind={hero.kind} alt={hero.caption || r.title} priority sizes="(max-width: 900px) 100vw, 520px" /> : <span aria-hidden="true">{r.emoji || cat?.emoji || "🍌"}</span>}
          </div>
          <div className="d-actions">
            <a className="btn" href="#made">I made it!</a>
            <SaveButton recipeId={r.id} title={r.title} initialSaved={saved} signedIn={!!userId} className="inline" />
            <PrintRecipeButton
              recipe={{
                title: titleCase(r.title),
                description: r.description,
                imageUrl: hero && hero.kind !== "video" ? publicUrl(hero.path) : null,
                imageAlt: hero?.caption || r.title,
                ingredients: r.ingredients,
                steps: r.steps.map((group) => ({
                  title: group.title || "",
                  steps: group.steps.map((s) => s.text),
                })),
              }}
            />
            {editable && (
              <div className="d-actions-owner">
                <Link className="btn ghost small" href={`/recipes/${r.slug}/edit`}>Edit recipe</Link>
                <DeleteRecipeButton recipeId={r.id} />
              </div>
            )}
          </div>
          {(rating || r.tags.length > 0) && (
            <div className="meta">
              {rating && <span className="pill rate">★ {rating.avg_rating} ({rating.ratings_count})</span>}
              {r.tags.map((t) => <Link key={t} className="pill" href={`/recipes?tag=${encodeURIComponent(t)}`}>{t}</Link>)}
            </div>
          )}
          {(r.author || r.adapted_from_name || r.adapted_from_url) && (
            <div className="d-credit">
              {r.author && (
                <p className="byline">
                  Shared by {r.author.display_name || "a banana fan"}
                  {r.published_at ? ` on ${shortDate(r.published_at)}` : ""}
                </p>
              )}
              {(r.adapted_from_name || r.adapted_from_url) && (
                <p className="adapted-from">
                  <span className="adapted-from-label">Adapted from a recipe by:</span>{" "}
                  <span className="adapted-from-source">
                    {r.adapted_from_url ? (
                      <a href={r.adapted_from_url} target="_blank" rel="noopener noreferrer">
                        {r.adapted_from_name || r.adapted_from_url}
                      </a>
                    ) : (
                      r.adapted_from_name
                    )}
                  </span>
                </p>
              )}
            </div>
          )}
          <KitchenConverter />
          <div className="d-engage" aria-label="Ratings and tips">
            <div id="made">
              <MadeItForm recipeId={r.id} signedIn={!!userId} slug={r.slug} />
            </div>
            <div className="d-cooks">
              <h2>From Other Cooks</h2>
              {logs.length ? (
                <ul className="reviews">
                  {logs.map((l) => (
                    <li key={l.id} className="review">
                      <div className="who">
                        <span>{l.user_id === userId ? "You" : nameOf.get(l.user_id) || "A banana fan"}</span>
                        <span role="img" aria-label={`${l.rating} out of 5`}>{"🍌".repeat(l.rating)}</span>
                        <span className="muted">{shortDate(l.created_at)}</span>
                        {(l.user_id === userId || isEditorRole(profile)) && <RemoveLogButton id={l.id} />}
                      </div>
                      {l.tip && <p>{l.tip}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No ratings yet. Be the first to share how it went!</p>
              )}
            </div>
          </div>
          {gallery.length > 1 && (
            <ul className="thumbs" aria-label="More photos and videos">
              {gallery.slice(1).map((m) => (
                <li key={m.id}>
                  <div className="thumb-media"><MediaView path={m.path} kind={m.kind} alt={m.caption || `${r.title} photo`} sizes="160px" /></div>
                  {m.caption && <span>{m.caption}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="d-right">
          <div className="d-heading">
            <h1 className="h1">{titleCase(r.title)}</h1>
            <RecipeFacts
              difficulty={r.difficulty}
              servings={r.servings}
              totalMinutes={r.total_minutes}
            />
            {r.description && <p className="lede">{r.description}</p>}
          </div>
          <div className="d-intro">
            {r.equipment?.length ? (
              <div className="equip-panel" aria-labelledby="equip-title">
                <h2 id="equip-title">Equipment</h2>
                <ol className="equip-list">
                  {r.equipment.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ol>
              </div>
            ) : null}
            <IngredientPanel ingredients={r.ingredients} servings={r.servings} />
            {r.notes?.trim() ? (
              <div className="recipe-notes" aria-labelledby="notes-title">
                <h2 id="notes-title">Notes</h2>
                <div className="recipe-notes-body" dangerouslySetInnerHTML={{ __html: renderPostMarkdown(r.notes) }} />
              </div>
            ) : null}
            <div className="d-steps" aria-labelledby="steps-h">
              <h2 id="steps-h">Steps</h2>
              {r.steps.map((group, gi) => (
                <div key={gi} className="step-group">
                  {group.title ? <h3 className="step-group-title">{group.title}</h3> : null}
                  <ol className="steps">
                    {group.steps.map((s, i) => (
                      <li key={i}>
                        <div>
                          <p>{s.text}</p>
                          {s.media && (
                            <div className="step-media-view">
                              <MediaView
                                path={s.media.path}
                                kind={s.media.kind}
                                alt={`${group.title || "Step"} ${i + 1}`}
                                sizes="(max-width: 900px) 100vw, 560px"
                              />
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
            {r.status === "pending" && isEditorRole(profile) && (
              <div className="panel" style={{ marginTop: "1.2rem" }}>
                <h2>Review</h2>
                <ReviewButtons recipeId={r.id} />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

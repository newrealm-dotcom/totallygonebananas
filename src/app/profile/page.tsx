import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, isEditorRole, type RecipeCardData } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET, isLocalUrl, publicUrl } from "@/lib/media";
import { RecipeGrid } from "@/components/RecipeGrid";
import { HeroSlide } from "@/components/HeroSlide";
import { MediaView } from "@/components/MediaView";
import { CopyLinkButton, DeleteRecipeButton } from "@/components/OwnerTools";
import { plural, shortDate, siteUrlSafe } from "@/app/profile/helpers";
import { getDarkMainSliderImages, getMainSliderImages, pickRandomSlide } from "@/lib/main-slider";
import { referralHandle } from "@/lib/referral";
import { LEVELS, meterTone, pointsFromCounts, standingsFor } from "@/lib/standings";
import type { RecipeStatus } from "@/lib/types";

export const metadata: Metadata = { title: "My Banana Stand" };

const STATUS_LABEL: Record<RecipeStatus, string> = { draft: "Draft", pending: "In review", published: "Published", rejected: "Sent back" };

function ProfileRecipeThumb({
  href,
  coverPath,
  emoji,
}: {
  href?: string;
  coverPath: string | null | undefined;
  emoji?: string | null;
}) {
  const thumb = (
    <span className="row-thumb">
      {coverPath ? (
        <MediaView path={coverPath} alt="" sizes="140px" />
      ) : (
        <span aria-hidden="true">{emoji || "🍌"}</span>
      )}
    </span>
  );
  if (!href) return thumb;
  return (
    <Link href={href} className="row-thumb-link" tabIndex={-1} aria-hidden="true">
      {thumb}
    </Link>
  );
}

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const { userId, profile } = await getViewer();
  if (!userId || !profile) redirect("/login?next=/profile");
  const sp = await searchParams;
  const tab = (["saved", "recipes", "made"] as const).find((t) => t === sp.tab) ?? "saved";
  const supabase = await createClient();

  const [savesRes, mineRes, logsRes, lightSlides, darkSlides] = await Promise.all([
    supabase.from("saves").select("created_at, recipe:recipes(id, slug, title, description, category_id, emoji, total_minutes, time_note, servings, difficulty, tags, cover_path, status, published_at, created_at)").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("recipes").select("id, slug, title, status, review_note, updated_at, cover_path, emoji").eq("author_id", userId).order("updated_at", { ascending: false }),
    supabase.from("cook_logs").select("id, rating, tip, created_at, recipe:recipes(slug, title, cover_path, emoji)").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    getMainSliderImages(),
    getDarkMainSliderImages(),
  ]);
  const saved = (savesRes.data ?? []).map((s) => s.recipe as unknown as RecipeCardData | null).filter((r): r is RecipeCardData => !!r);
  const mine = mineRes.data ?? [];
  const logs = (logsRes.data ?? []) as unknown as {
    id: string;
    rating: number;
    tip: string | null;
    created_at: string;
    recipe: { slug: string; title: string; cover_path: string | null; emoji: string | null } | null;
  }[];

  const { points, level, name: rankName, next } = standingsFor(
    pointsFromCounts({
      saved: saved.length,
      made: logs.length,
      published: mine.filter((m) => m.status === "published").length,
    }),
  );
  const pct = next ? Math.round(((points - LEVELS[level].min) / (next.min - LEVELS[level].min)) * 100) : 100;
  const tone = meterTone(points, LEVELS[level].min, next?.min);
  const avatar = publicUrl(profile.avatar_path, AVATAR_BUCKET);
  const heroLight = pickRandomSlide(lightSlides);
  const heroDark = pickRandomSlide(darkSlides);
  const inviteHandle = referralHandle(profile, userId);
  const inviteUrl = new URL("/recipes/new", await siteUrlSafe());
  inviteUrl.searchParams.set("utm_source", "invite");
  inviteUrl.searchParams.set("utm_medium", "share");
  inviteUrl.searchParams.set("utm_campaign", "recipe_submission");
  inviteUrl.searchParams.set("utm_content", inviteHandle);

  return (
    <div className="wrap">
      <section className="stand-hero">
        <HeroSlide lightSrc={heroLight} darkSrc={heroDark} />
        <div>
          <div className="who-row">
            <div className="avatar-lg">{avatar ? <Image src={avatar} alt="" fill sizes="96px" unoptimized={isLocalUrl(avatar)} /> : <span aria-hidden="true">{(profile.display_name || "?").slice(0, 1).toUpperCase()}</span>}</div>
            <div>
              <h1 className="h1">{profile.display_name || "Banana fan"}</h1>
              <p className="muted">
                {profile.username ? `@${profile.username} · ` : ""}{rankName}{profile.role !== "member" ? ` · ${profile.role === "admin" ? "Admin" : "Editor"}` : ""}
              </p>
            </div>
          </div>
          {profile.bio && <p>{profile.bio}</p>}
          <div className={`bar tone-${tone}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progress to next level"><i style={{ width: `${Math.max(3, pct)}%` }} /></div>
          <p className="hint">{next ? `${points} points. ${next.min - points} more to become a ${next.name}.` : `${points} points. Top Banana. Crown secured.`}</p>
          <div className="stats">
            <div className="stat"><b>{saved.length}</b><span>saved</span></div>
            <div className="stat"><b>{logs.length}</b><span>made</span></div>
            <div className="stat"><b>{mine.length}</b><span>shared</span></div>
          </div>
          <div className="row-actions" style={{ marginTop: "1.2rem" }}>
            <Link className="btn" href="/recipes/new">Share a recipe</Link>
            <Link className="btn ghost" href="/profile/settings">Edit profile</Link>
            <form action="/auth/signout" method="post"><button className="btn ghost" type="submit">Sign out</button></form>
          </div>
          {isEditorRole(profile) && (
            <div className="panel invite">
              <p><b>Invite contributors.</b> Anyone with this link can sign in and submit a recipe for your review. Submissions are attributed to <code>@{inviteHandle}</code> in Admin → Referrals.</p>
              {!profile.username && (
                <p className="hint">Tip: <Link href="/profile/settings">set a username</Link> so your invite link is easier to recognize.</p>
              )}
              <CopyLinkButton url={inviteUrl.toString()} label="Copy the submission link" />
            </div>
          )}
        </div>
      </section>

      <nav className="tabs" aria-label="Your stuff">
        <Link href="/profile?tab=saved" aria-current={tab === "saved" ? "page" : undefined}>Saved ({saved.length})</Link>
        <Link href="/profile?tab=recipes" aria-current={tab === "recipes" ? "page" : undefined}>My recipes ({mine.length})</Link>
        <Link href="/profile?tab=made" aria-current={tab === "made" ? "page" : undefined}>Cooking history ({logs.length})</Link>
      </nav>

      <section className="block" style={{ paddingTop: "1.2rem" }}>
        {tab === "saved" && (
          <RecipeGrid recipes={saved} empty={<div className="empty"><span className="big">💛</span><p>Nothing saved yet. Tap the heart on any recipe to keep it here.</p><Link className="btn" href="/recipes">Browse recipes</Link></div>} />
        )}
        {tab === "recipes" && (mine.length ? (
          <ul className="rows">
            {mine.map((m) => (
              <li key={m.id} className="row">
                <div className="row-main">
                  <ProfileRecipeThumb href={`/recipes/${m.slug}`} coverPath={m.cover_path} emoji={m.emoji} />
                  <div className="row-copy">
                    <h3><Link href={`/recipes/${m.slug}`}>{m.title}</Link></h3>
                    <p>Updated {shortDate(m.updated_at)}{m.status === "rejected" && m.review_note ? `. Editor's note: “${m.review_note}”` : ""}</p>
                  </div>
                </div>
                <div className="end">
                  <span className={`status s-${m.status}`}>{STATUS_LABEL[m.status as RecipeStatus]}</span>
                  {(m.status !== "published" || isEditorRole(profile)) && (
                    <>
                      <Link className="btn ghost small" href={`/recipes/${m.slug}/edit`}>Edit</Link>
                      <DeleteRecipeButton recipeId={m.id} afterDelete="refresh" />
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty"><span className="big">📝</span><p>You haven&apos;t shared a recipe yet.</p><Link className="btn" href="/recipes/new">Share your first recipe</Link></div>
        ))}
        {tab === "made" && (logs.length ? (
          <ul className="rows">
            {logs.map((l) => (
              <li key={l.id} className="row">
                <div className="row-main">
                  <ProfileRecipeThumb
                    href={l.recipe ? `/recipes/${l.recipe.slug}` : undefined}
                    coverPath={l.recipe?.cover_path}
                    emoji={l.recipe?.emoji}
                  />
                  <div className="row-copy">
                    <h3>{l.recipe ? <Link href={`/recipes/${l.recipe.slug}`}>{l.recipe.title}</Link> : "A removed recipe"}</h3>
                    <p>{shortDate(l.created_at)}: <span role="img" aria-label={`${l.rating} out of 5`}>{"🍌".repeat(l.rating)}</span>{l.tip ? ` “${l.tip}”` : ""}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty"><span className="big">👩‍🍳</span><p>Tap &ldquo;I made it!&rdquo; on a recipe after you cook it and it&apos;ll show up here.</p></div>
        ))}
        <p className="hint" style={{ marginTop: "1rem" }}>{plural(points, "point")} so far: saves are worth 3, each dish you make 8, and each published recipe 15. All points will have real value in the future so start collecting all you can now. Stay tuned!</p>
      </section>
    </div>
  );
}

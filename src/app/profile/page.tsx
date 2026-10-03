import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCategories, getRatings, getViewer, isEditorRole, type RecipeCardData } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET, isLocalUrl, publicUrl } from "@/lib/media";
import { HeroSlide } from "@/components/HeroSlide";
import { CopyLinkButton } from "@/components/OwnerTools";
import {
  ProfileCookingHistoryCollection,
  ProfileMyRecipesCollection,
  ProfileSavedCollection,
  type CookingLogItem,
  type MyRecipeItem,
  type SavedRecipeItem,
} from "@/components/ProfileCollection";
import { plural, siteUrlSafe } from "@/app/profile/helpers";
import { getDarkMainSliderImages, getMainSliderImages, pickRandomSlide } from "@/lib/main-slider";
import { referralHandle } from "@/lib/referral";
import { LEVELS, meterTone, pointsFromCounts, standingsFor } from "@/lib/standings";
import type { Rating } from "@/lib/types";

export const metadata: Metadata = { title: "My Banana Stand" };

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const { userId, profile } = await getViewer();
  if (!userId || !profile) redirect("/login?next=/profile");
  const sp = await searchParams;
  const tab = (["saved", "recipes", "made"] as const).find((t) => t === sp.tab) ?? "saved";
  const supabase = await createClient();

  const [savesRes, mineRes, logsRes, lightSlides, darkSlides] = await Promise.all([
    supabase
      .from("saves")
      .select(
        "created_at, recipe:recipes(id, slug, title, description, categories, emoji, total_minutes, time_note, servings, difficulty, tags, cover_path, status, published_at, created_at)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("recipes")
      .select("id, slug, title, status, review_note, updated_at, cover_path, emoji")
      .eq("author_id", userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("cook_logs")
      .select("id, rating, tip, created_at, recipe:recipes(slug, title, cover_path, emoji)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    getMainSliderImages(),
    getDarkMainSliderImages(),
  ]);

  const saved: SavedRecipeItem[] = (savesRes.data ?? [])
    .map((s) => {
      const recipe = s.recipe as unknown as RecipeCardData | null;
      if (!recipe) return null;
      return {
        ...recipe,
        categories: Array.isArray(recipe.categories) ? recipe.categories : [],
        savedAt: s.created_at as string,
      };
    })
    .filter((r): r is SavedRecipeItem => !!r);

  const mine = (mineRes.data ?? []) as MyRecipeItem[];
  const logs = (logsRes.data ?? []) as unknown as CookingLogItem[];

  const [categories, ratingsMap] = await Promise.all([
    getCategories(),
    getRatings(saved.map((r) => r.id)),
  ]);
  const ratings: Record<string, Rating> = Object.fromEntries(ratingsMap);

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
            <div className="avatar-lg">
              {avatar ? (
                <Image src={avatar} alt="" fill sizes="96px" unoptimized={isLocalUrl(avatar)} />
              ) : (
                <span aria-hidden="true">{(profile.display_name || "?").slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div>
              <h1 className="h1">{profile.display_name || "Banana fan"}</h1>
              <p className="muted">
                {profile.username ? `@${profile.username} · ` : ""}
                {rankName}
                {profile.role !== "member" ? ` · ${profile.role === "admin" ? "Admin" : "Editor"}` : ""}
              </p>
            </div>
          </div>
          {profile.bio && <p>{profile.bio}</p>}
          <div
            className={`bar tone-${tone}`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label="Progress to next level"
          >
            <i style={{ width: `${Math.max(3, pct)}%` }} />
          </div>
          <p className="hint">
            {next
              ? `${points} points. ${next.min - points} more to become a ${next.name}.`
              : `${points} points. Top Banana. Crown secured.`}
          </p>
          <div className="stats">
            <div className="stat">
              <b>{saved.length}</b>
              <span>saved</span>
            </div>
            <div className="stat">
              <b>{logs.length}</b>
              <span>made</span>
            </div>
            <div className="stat">
              <b>{mine.length}</b>
              <span>shared</span>
            </div>
          </div>
          <div className="row-actions" style={{ marginTop: "1.2rem" }}>
            <Link className="btn" href="/recipes/new">
              Share a recipe
            </Link>
            <Link className="btn ghost" href="/profile/settings">
              Edit profile
            </Link>
            <form action="/auth/signout" method="post">
              <button className="btn ghost" type="submit">
                Sign out
              </button>
            </form>
          </div>
          {isEditorRole(profile) && (
            <div className="panel invite">
              <p>
                <b>Invite contributors.</b> Anyone with this link can sign in and submit a recipe for your review.
                Submissions are attributed to <code>@{inviteHandle}</code> in Admin → Referrals.
              </p>
              {!profile.username && (
                <p className="hint">
                  Tip: <Link href="/profile/settings">set a username</Link> so your invite link is easier to recognize.
                </p>
              )}
              <CopyLinkButton url={inviteUrl.toString()} label="Copy the submission link" />
            </div>
          )}
        </div>
      </section>

      <nav className="tabs" aria-label="Your stuff">
        <Link href="/profile?tab=saved" aria-current={tab === "saved" ? "page" : undefined}>
          Saved ({saved.length})
        </Link>
        <Link href="/profile?tab=recipes" aria-current={tab === "recipes" ? "page" : undefined}>
          My recipes ({mine.length})
        </Link>
        <Link href="/profile?tab=made" aria-current={tab === "made" ? "page" : undefined}>
          Cooking history ({logs.length})
        </Link>
      </nav>

      <section className="block" style={{ paddingTop: "1.2rem" }}>
        {tab === "saved" && (
          <ProfileSavedCollection
            recipes={saved}
            categories={categories}
            ratings={ratings}
            empty={
              <div className="empty">
                <span className="big">💛</span>
                <p>Nothing saved yet. Tap the heart on any recipe to keep it here.</p>
                <Link className="btn" href="/recipes">
                  Browse recipes
                </Link>
              </div>
            }
          />
        )}
        {tab === "recipes" && (
          <ProfileMyRecipesCollection
            recipes={mine}
            canEditPublished={isEditorRole(profile)}
            empty={
              <div className="empty">
                <span className="big">📝</span>
                <p>You haven&apos;t shared a recipe yet.</p>
                <Link className="btn" href="/recipes/new">
                  Share your first recipe
                </Link>
              </div>
            }
          />
        )}
        {tab === "made" && (
          <ProfileCookingHistoryCollection
            logs={logs}
            empty={
              <div className="empty">
                <span className="big">👩‍🍳</span>
                <p>Tap &ldquo;I made it!&rdquo; on a recipe after you cook it and it&apos;ll show up here.</p>
              </div>
            }
          />
        )}
        <p className="hint" style={{ marginTop: "1rem" }}>
          {plural(points, "point")} so far: saves are worth 3, each dish you make 8, and each published recipe 15. All
          points will have real value in the future so start collecting all you can now. Stay tuned!
        </p>
      </section>
    </div>
  );
}

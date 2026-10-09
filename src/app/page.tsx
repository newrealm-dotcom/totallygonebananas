import Image from "next/image";
import Link from "next/link";
import { countRecipes, getBlogCategories, getCategories, getHomepagePromo, getViewer, listPosts, listRecipes } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { CategoryStickers } from "@/components/CategoryStickers";
import { FilterPillsScroller } from "@/components/FilterPillsScroller";
import { RecipeGrid } from "@/components/RecipeGrid";
import { HeroSlide } from "@/components/HeroSlide";
import { MediaView } from "@/components/MediaView";
import { titleCase } from "@/lib/format";
import { promoImageSrc } from "@/lib/media";
import { BlogCoverCard } from "@/components/BlogCoverCard";
import { getDarkMainSliderImages, getMainSliderImages, FIRST_DARK_SLIDE, FIRST_LIGHT_SLIDE, pickPreferredSlide } from "@/lib/main-slider";

/** Recipe of the day: the same pick for everyone for 24 hours (UTC). */
function recipeOfTheDay<T>(list: T[]): T | null {
  if (!list.length) return null;
  const day = Math.floor(new Date().getTime() / 864e5);
  return list[(day * 7 + 3) % list.length];
}

async function categoryCounts() {
  const supabase = await createClient();
  const { data } = await supabase.from("recipes").select("categories").eq("status", "published");
  const m = new Map<string, number>();
  data?.forEach((r) => {
    const ids = Array.isArray(r.categories) ? r.categories : [];
    ids.forEach((id) => {
      if (id) m.set(id, (m.get(id) ?? 0) + 1);
    });
  });
  return m;
}

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const active = typeof sp.category === "string" ? sp.category : undefined;
  const [categories, counts, latest, recipeTotal, rotdPool, lightSlides, darkSlides, promo, homePosts, blogCategories, viewer] = await Promise.all([
    getCategories(),
    categoryCounts(),
    listRecipes({ category: active, limit: 8 }),
    countRecipes(),
    listRecipes({ limit: 40, sort: "new" }),
    getMainSliderImages(),
    getDarkMainSliderImages(),
    getHomepagePromo(),
    listPosts({ publishedOnly: true, limit: 3, offset: 0, excludeCategory: "favorites" }),
    getBlogCategories(),
    getViewer(),
  ]);
  const blogCategoryNames = Object.fromEntries(blogCategories.map((c) => [c.id, c.name]));
  const promoSrc = promoImageSrc(promo.image_path);
  const cat = categories.find((c) => c.id === active);
  const heroLight = pickPreferredSlide(lightSlides, FIRST_LIGHT_SLIDE);
  const heroDark = pickPreferredSlide(darkSlides, FIRST_DARK_SLIDE);
  const moreHref = cat ? `/recipes?category=${cat.id}` : "/recipes";

  const rotd = recipeOfTheDay(rotdPool);

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <h1>What are we going bananas for today?</h1>
            <p className="lede">Pick a craving and dig in. Whether you&apos;re after something chocolatey, something fruity, or an easy bake for a slow Sunday morning, there&apos;s a recipe here for it. New ones go up all the time, so check back often to see what just came out of the oven.</p>
            <div className="hero-cats">
              <span className="hero-cats-label">Categories:</span>
              <FilterPillsScroller label="categories" moreText="more">
                <CategoryStickers
                  small
                  categories={categories.filter((c) => counts.get(c.id))}
                  active={active}
                  hrefFor={(id) => (id ? `/?category=${id}#latest` : "/#latest")}
                />
              </FilterPillsScroller>
            </div>
          </div>
          <div className="mascot-wrap hero-art">
            <div className="bubble">
              <strong>{cat ? cat.name : "All recipes"}</strong>
              <span>{cat?.tagline ?? `${recipeTotal} ways to go bananas.`}</span>
            </div>
            <HeroSlide
              lightSrc={heroLight}
              darkSrc={heroDark}
              sizes="(max-width: 900px) 320px, min(38rem, 54vw)"
            />
          </div>
        </div>
      </section>

      <section className="home-join" aria-labelledby="home-join-h">
        <div className="wrap home-join-inner">
          <div className="home-join-copy">
            <p className="home-join-kicker">Join the bunch</p>
            <h2 id="home-join-h">Share your favorite banana recipes</h2>
            <p>
              Sign up, submit the recipes you love, and be first in line for future contests, giveaways, and more from Totally Gone Bananas.
            </p>
            <div className="home-join-actions">
              {!viewer.userId ? (
                <Link className="btn" href="/login?next=/recipes/new">Sign Up Now</Link>
              ) : null}
              <Link className={viewer.userId ? "btn" : "btn ghost"} href="/recipes/new">
                Share a recipe
              </Link>
            </div>
          </div>
          <div className="home-join-art" aria-hidden="true">
            <Image
              className="home-join-img"
              src="/images/finish.webp"
              alt=""
              width={1200}
              height={638}
              sizes="(max-width: 900px) 92vw, 65vw"
              quality={75}
            />
          </div>
        </div>
      </section>

      <section className="block" id="latest" aria-labelledby="latest-h">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="latest-h">{cat ? cat.name : "Fresh from the kitchen"}</h2>
              <p className="home-latest-lede">{cat ? cat.tagline : "The newest recipes on the site, tested in my own kitchen and ready for yours. Start here to see what I've been baking lately, from quick weeknight treats to weekend projects that are worth the extra time."}</p>
            </div>
          </div>
          <div className="home-latest">
            <RecipeGrid recipes={latest} showCategory={!cat} empty={<div className="empty"><span className="big">🍌</span><p>No recipes here yet.</p><Link className="btn" href="/recipes/new">Share the first one</Link></div>} />
            {latest.length > 0 && (
              <p className="home-more-wrap">
                <Link className="home-more" href={moreHref}>View More Recipes</Link>
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="home-band-section" aria-labelledby="home-band-kicker">
        <div className="wrap">
          <h2 id="home-band-kicker" className="home-band-kicker">
            <span className="home-band-kicker-accent">Check Out</span> Our Current{" "}
            <span className="home-band-kicker-accent">Obsession</span>
          </h2>
        </div>
        <div className="home-band" aria-labelledby="home-band-h">
          <div className="home-band-bg" aria-hidden="true">
            <Image
              className="home-band-img"
              src={promoSrc}
              alt=""
              fill
              sizes="100vw"
              priority={false}
              unoptimized={promoSrc.startsWith("http")}
            />
          </div>
          <div className="wrap home-band-inner">
            <h3 id="home-band-h" className="home-band-title">{promo.heading}</h3>
            <p>{promo.body}</p>
            <Link className="btn" href={promo.button_href} target="_blank" rel="noopener noreferrer">
              {promo.button_label}
            </Link>
          </div>
        </div>
      </section>

      {rotd && (
        <section className="block rotd-section" aria-labelledby="rotd-h">
          <div className="wrap">
            <article className="rotd">
              <div className="emo" aria-hidden="true">
                {rotd.cover_path ? <MediaView path={rotd.cover_path} alt="" sizes="160px" /> : rotd.emoji || "🍌"}
              </div>
              <div>
                <p className="kicker">Recipe Of The Day</p>
                <h2 id="rotd-h">{titleCase(rotd.title)}</h2>
                {rotd.description && <p>{rotd.description}</p>}
                <div className="actions">
                  <Link className="btn dark" href={`/recipes/${rotd.slug}`}>See The Recipe</Link>
                </div>
              </div>
            </article>
          </div>
        </section>
      )}

      <section className="block home-blog" aria-labelledby="home-blog-h">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="home-blog-h">Bananas in the Wild</h2>
              <p>
                Welcome to the archive, where every post we&apos;ve ever written about bananas lives in one place.
              </p>
            </div>
            <Link className="btn ghost small" href="/blog">View all posts</Link>
          </div>
          {homePosts.length === 0 ? (
            <div className="empty"><p>No posts yet. Check back soon.</p></div>
          ) : (
            <ul className="blog-cover-grid">
              {homePosts.map((p) => (
                <BlogCoverCard key={p.id} post={p} categoryNames={blogCategoryNames} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

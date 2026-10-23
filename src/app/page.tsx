import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getBlogCategories, getCategories, getHomepagePromo, getViewer, listPosts, listRecipes } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { CategoryStickers } from "@/components/CategoryStickers";
import { FilterPillsScroller } from "@/components/FilterPillsScroller";
import { RecipeGrid } from "@/components/RecipeGrid";
import { HeroSlide } from "@/components/HeroSlide";
import { MediaView } from "@/components/MediaView";
import { titleCase } from "@/lib/format";
import { promoImageSrc } from "@/lib/media";
import { BlogCoverCard } from "@/components/BlogCoverCard";
import { TrackedSignupLink } from "@/components/TrackedSignupLink";
import { getDarkMainSliderImages, getMainSliderImages, FIRST_DARK_SLIDE, FIRST_LIGHT_SLIDE, pickPreferredSlide } from "@/lib/main-slider";

export const metadata: Metadata = {
  title: "Totally Gone Bananas | Banana Recipes & Culture",
  description:
    "Find tested banana recipes for every stage of ripeness, from smoothies and banana bread to bakes, snacks, guides, and banana-culture finds.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Totally Gone Bananas | Banana Recipes & Culture",
    description:
      "Find tested banana recipes for every stage of ripeness, from smoothies and banana bread to bakes, snacks, guides, and banana-culture finds.",
    url: "/",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Totally Gone Bananas banana recipes" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Totally Gone Bananas | Banana Recipes & Culture",
    description:
      "Find tested banana recipes for every stage of ripeness, from smoothies and banana bread to bakes, snacks, guides, and banana-culture finds.",
    images: ["/og-image.jpg"],
  },
};

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
  const [categories, counts, latest, rotdPool, lightSlides, darkSlides, promo, homePosts, blogCategories, viewer] = await Promise.all([
    getCategories(),
    categoryCounts(),
    listRecipes({ category: active, limit: 8 }),
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
            <p className="hero-subhead">Tested banana recipes for every stage of ripeness, from green to gone.</p>
            <p className="lede">From 5-minute smoothies to weekend bakes. Pick a craving below.</p>
            <form className="hero-search" action="/recipes" role="search">
              <label className="sr-only" htmlFor="hero-q">
                Search banana recipes
              </label>
              <input
                id="hero-q"
                name="q"
                type="search"
                placeholder="Try 'banana bread' or 'ripe bananas'"
                autoComplete="off"
              />
              <button type="submit">Search</button>
            </form>
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
            <HeroSlide
              lightSrc={heroLight}
              darkSrc={heroDark}
              alt="Totally Gone Bananas mascot, a banana in sunglasses lounging on a golden throne"
              sizes="(max-width: 768px) 90vw, 45vw"
            />
          </div>
        </div>
      </section>

      <section className="block" id="latest" aria-labelledby="latest-h">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2 id="latest-h">{cat ? cat.name : "Fresh from the kitchen"}</h2>
              {!cat ? (
                <p className="home-latest-lede">
                  The newest recipes on the site, tested in my kitchen and ready for yours.
                </p>
              ) : null}
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

      <section className="home-join" aria-labelledby="home-join-h">
        <div className="wrap home-join-inner">
          <div className="home-join-copy">
            <p className="home-join-kicker">Join the bunch</p>
            <h2 id="home-join-h">Save your favorites and share your own</h2>
            <p>
              Save recipes, rate what you bake, and share your own banana wins. Members get first dibs on contests and giveaways.
            </p>
            <div className="home-join-actions">
              {!viewer.userId ? (
                <TrackedSignupLink
                  className="btn"
                  href="/login?intent=join"
                  buttonText="Join the bunch, it's free"
                  intent="join"
                >
                  Join the bunch, it&apos;s free
                </TrackedSignupLink>
              ) : (
                <Link className="btn" href="/recipes/new">
                  Share a recipe
                </Link>
              )}
            </div>
          </div>
          <div className="home-join-art">
            <Image
              className="home-join-img"
              src="/images/finish.webp"
              alt="Cartoon bananas racing toward a finish line"
              width={1200}
              height={638}
              sizes="(max-width: 900px) 92vw, 65vw"
              quality={75}
            />
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
                  <Link className="btn dark" href={`/recipes/${rotd.slug}`} prefetch={viewer.userId ? null : false}>See The Recipe</Link>
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

      <section className="block home-seo" aria-labelledby="home-seo-h">
        <div className="wrap">
          <div className="home-seo-card">
            <p className="kicker">WHY GO TOTALLY BANANAS?</p>
            <h2 id="home-seo-h">Banana recipes, ripeness help, and a little banana culture in one happy place</h2>
            <div className="home-seo-copy">
              <p>
                Totally Gone Bananas is built for the moment you look at a bunch on the counter and wonder what it can
                become. Some days that means a five-minute smoothie with frozen banana and almond butter. Other days it
                means a weekend bake, a soft banana bread, a gooey pudding dessert, or a freezer treat that keeps the
                chocolate cravings handled. The recipes here are organized around real kitchen questions: how ripe are
                your bananas, how much time do you have, and what kind of craving are you chasing?
              </p>
              <p>
                You can start in the <Link href="/recipes">recipe archive</Link>, search by ingredient, or jump into a
                category like breakfast, breads and bakes, snacks, frozen treats, drinks, or savory ideas. Each recipe is
                written to be practical first, with clear ingredients, approachable steps, serving tools, and notes that
                help you decide whether today&apos;s bananas are better for blending, baking, frying, freezing, or saving
                for tomorrow. When a recipe uses extra-ripe bananas, barely-speckled bananas, or frozen bananas, the goal
                is to make that choice feel obvious before you even preheat the oven.
              </p>
              <p>
                The site goes beyond recipes too. Banana fans can explore the <Link href="/blog">blog</Link> for stories
                about banana varieties, banana history, kitchen experiments, product finds, and the weird little corners
                of banana culture that make this fruit so much more interesting than a lunchbox staple. If you&apos;re
                curious about plants, the <Link href="/banana-growing-zones">Banana Growing Zones</Link> guide helps you
                compare USDA hardiness zones with banana varieties so you can see whether your favorite plant belongs in
                the ground, in a big pot, or in your sunniest window.
              </p>
              <p>
                Members can save favorites, rate what they bake, and share their own banana wins with the bunch. If you
                have a family banana bread, a smoothie combo, a dessert mashup, or a brilliant way to rescue overripe
                bananas, <Link href="/recipes/new">share a recipe</Link> and help grow the collection. Whether your
                bananas are green, yellow, freckled, frozen, or fully gone, this site is here to help you use them well
                and have fun doing it.
              </p>
            </div>
            <div className="home-seo-actions">
              <Link className="btn" href="/recipes">Browse banana recipes</Link>
              <Link className="btn ghost" href="/recipes/new">Share your banana win</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

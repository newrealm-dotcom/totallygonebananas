import Image from "next/image";
import Link from "next/link";
import { getCategories, getHomepagePromo, listPosts, listRecipes } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { CategoryStickers } from "@/components/CategoryStickers";
import { RecipeGrid } from "@/components/RecipeGrid";
import { HeroSlide } from "@/components/HeroSlide";
import { MediaView } from "@/components/MediaView";
import { shortDate, titleCase } from "@/lib/format";
import { mediaSrc, promoImageSrc } from "@/lib/media";
import { stripInlineMarkdown } from "@/lib/render-post-markdown";
import { getDarkMainSliderImages, getMainSliderImages, pickRandomSlide } from "@/lib/main-slider";

/** Recipe of the day: the same pick for everyone for 24 hours (UTC). */
function recipeOfTheDay<T>(list: T[]): T | null {
  if (!list.length) return null;
  const day = Math.floor(new Date().getTime() / 864e5);
  return list[(day * 7 + 3) % list.length];
}

async function categoryCounts() {
  const supabase = await createClient();
  const { data } = await supabase.from("recipes").select("category_id").eq("status", "published");
  const m = new Map<string, number>();
  data?.forEach((r) => r.category_id && m.set(r.category_id, (m.get(r.category_id) ?? 0) + 1));
  return m;
}

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const active = typeof sp.category === "string" ? sp.category : undefined;
  const [categories, counts, latest, all, lightSlides, darkSlides, promo, homePosts] = await Promise.all([
    getCategories(),
    categoryCounts(),
    listRecipes({ category: active, limit: 8 }),
    listRecipes({ limit: 200, sort: "az" }),
    getMainSliderImages(),
    getDarkMainSliderImages(),
    getHomepagePromo(),
    listPosts({ publishedOnly: true, limit: 6, offset: 0, excludeCategory: "favorites" }),
  ]);
  const promoSrc = promoImageSrc(promo.image_path);
  const cat = categories.find((c) => c.id === active);
  const heroLight = pickRandomSlide(lightSlides);
  const heroDark = pickRandomSlide(darkSlides);
  const moreHref = cat ? `/recipes?category=${cat.id}` : "/recipes";

  const rotd = recipeOfTheDay(all);

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <h1>What are we going bananas for today?</h1>
            <p className="lede">Pick a craving and dig in. Whether you&apos;re after something chocolatey, something fruity, or an easy bake for a slow Sunday morning, there&apos;s a recipe here for it. New ones go up all the time, so check back often to see what just came out of the oven.</p>
            <CategoryStickers categories={categories.filter((c) => counts.get(c.id))} counts={counts} active={active} hrefFor={(id) => (id ? `/?category=${id}#latest` : "/#latest")} />
          </div>
          <div className="mascot-wrap">
            <div className="bubble">
              <strong>{cat ? cat.name : "All recipes"}</strong>
              <span>{cat?.tagline ?? `${all.length} ways to go bananas.`}</span>
            </div>
            <HeroSlide lightSrc={heroLight} darkSrc={heroDark} />
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
          <h2 id="home-band-kicker" className="home-band-kicker">Check Out Our Current Obsession</h2>
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
            <ul className="blog-grid home-blog-grid">
              {homePosts.map((p) => {
                const cover = mediaSrc(p.cover_path);
                return (
                  <li key={p.id} className="blog-card">
                    {cover ? (
                      <Link href={`/blog/${p.slug}`} className="blog-card-media" tabIndex={-1} aria-hidden>
                        <Image src={cover} alt="" width={640} height={360} unoptimized />
                      </Link>
                    ) : (
                      <Link href={`/blog/${p.slug}`} className="blog-card-media blog-card-media-ph" tabIndex={-1} aria-hidden />
                    )}
                    <div className="blog-card-body">
                      <h3><Link href={`/blog/${p.slug}`}>{stripInlineMarkdown(p.title)}</Link></h3>
                      {p.excerpt ? <p>{stripInlineMarkdown(p.excerpt)}</p> : null}
                      {p.published_at ? <p className="muted">{shortDate(p.published_at)}</p> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

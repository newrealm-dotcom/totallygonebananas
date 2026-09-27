import Image from "next/image";
import Link from "next/link";
import { getCategories, getHomepagePromo, listRecipes } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { CategoryStickers } from "@/components/CategoryStickers";
import { RecipeGrid } from "@/components/RecipeGrid";
import { HeroSlide } from "@/components/HeroSlide";
import { MediaView } from "@/components/MediaView";
import { titleCase } from "@/lib/format";
import { promoImageSrc } from "@/lib/media";
import { getDarkMainSliderImages, getMainSliderImages, pickRandomSlide } from "@/lib/main-slider";

/** Temporary homepage blog placeholders — replace with real posts when ready. */
const HOME_BLOG_PLACEHOLDERS = [
  {
    title: "Placeholder post one",
    excerpt: "Swap this for a real blog title and short teaser when the first story is ready to publish.",
  },
  {
    title: "Placeholder post two",
    excerpt: "Use this card for tips, product roundups, or banana news you want to feature on the homepage.",
  },
  {
    title: "Placeholder post three",
    excerpt: "Third slot for another story. Link each card to /blog/[slug] once the real posts exist.",
  },
] as const;

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
  const [categories, counts, latest, all, lightSlides, darkSlides, promo] = await Promise.all([
    getCategories(),
    categoryCounts(),
    listRecipes({ category: active, limit: 8 }),
    listRecipes({ limit: 200, sort: "az" }),
    getMainSliderImages(),
    getDarkMainSliderImages(),
    getHomepagePromo(),
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
            <p className="lede">Pick a craving and dig in. New recipes land here all the time, so check back often.</p>
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
              <p>{cat ? cat.tagline : "The newest recipes on the site."}</p>
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
              <h2 id="home-blog-h">From the Blog</h2>
              <p>Temporary header — replace these three placeholders with real posts when you&apos;re ready.</p>
            </div>
            <Link className="btn ghost small" href="/blog">View all posts</Link>
          </div>
          <ul className="blog-grid home-blog-grid">
            {HOME_BLOG_PLACEHOLDERS.map((post) => (
              <li key={post.title} className="blog-card">
                <div className="blog-card-media blog-card-media-ph" aria-hidden="true" />
                <div className="blog-card-body">
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                  <p className="muted">Coming soon</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

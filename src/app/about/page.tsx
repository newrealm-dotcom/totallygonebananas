import type { Metadata } from "next";
import Link from "next/link";
import { HeroSlide } from "@/components/HeroSlide";
import { getDarkMainSliderImages, getMainSliderImages, pickRandomSlide } from "@/lib/main-slider";

export const metadata: Metadata = { title: "About" };

export default async function AboutPage() {
  const [lightSlides, darkSlides] = await Promise.all([getMainSliderImages(), getDarkMainSliderImages()]);
  const heroLight = pickRandomSlide(lightSlides);
  const heroDark = pickRandomSlide(darkSlides);

  return (
    <div className="wrap">
      <div className="about">
        <div className="about-copy">
          <h1 className="h1">About Totally Gone Bananas</h1>
          <p className="lede">We&apos;re a home for banana recipes at every stage, from firm and green to spotty and gone. No banana left behind.</p>
          <h2>How it works</h2>
          <p>Browse recipes by category or search for what&apos;s in your kitchen. Every recipe has a servings scaler and an ingredient checklist, and many come with step-by-step photos or video.</p>
          <p>Sign in to save favorites to your Banana Stand, rate what you cook, and share your own recipes. Editors give new submissions a quick look before they go live.</p>
          <p><Link className="btn" href="/recipes/new">Share a recipe</Link></p>
        </div>
        <div className="mascot-wrap about-slide">
          <HeroSlide lightSrc={heroLight} darkSrc={heroDark} />
        </div>
      </div>
    </div>
  );
}

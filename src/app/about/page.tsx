import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";
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
          <p className="lede">Welcome to Totally Gone Bananas, the internet&apos;s happiest corner for anyone who&apos;s ever looked at a bunch of bananas and thought, &quot;I could do something amazing with these.&quot;</p>
          <p>Here you&apos;ll find a growing collection of recipes, from classic banana bread and silky smoothies to caramelized banana bread and inventive dishes you never knew you needed. We go beyond the kitchen, too, rounding up the coolest banana-related and banana-adjacent finds out there including gifts for the banana lover in your life.</p>
          <p>At its heart, though, Totally Gone Bananas is a community. We want to see what you&apos;re making, so sign up, share your favorite recipes, swap tips with fellow fans, and help us build the ultimate banana-loving bunch.</p>
          <p>Whether you&apos;re a seasoned baker or someone with three overripe bananas and a dream, there&apos;s a place for you here. Come peel back the fun and go totally bananas with us!</p>
          <h2>How The Recipe Section works</h2>
          <p>Browse recipes by category or search for what&apos;s in your kitchen. Every recipe has a servings scaler and an ingredient checklist, and many come with step-by-step photos or video.</p>
          <p>Sign in to save favorites to your Banana Stand, rate what you cook, and share your own recipes.</p>
          <p className="about-note">* Editors give new submissions a quick look before they go live.</p>
          <p><Link className="btn" href="/recipes/new">Share a recipe</Link></p>

          <section className="about-contact" aria-labelledby="contact-h">
            <h2 id="contact-h">Contact Us</h2>
            <p>
              Say Hello! Questions, ideas, or banana confessions? Send us a message using the form below,
              and we&apos;ll peel back a reply soon.
            </p>
            <ContactForm />
          </section>
        </div>
        <div className="mascot-wrap about-slide">
          <HeroSlide lightSrc={heroLight} darkSrc={heroDark} />
        </div>
      </div>
    </div>
  );
}

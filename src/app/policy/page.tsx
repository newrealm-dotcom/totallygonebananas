import type { Metadata } from "next";
import { HeroSlide } from "@/components/HeroSlide";
import {
  getDarkMainSliderImages,
  getMainSliderImages,
  FIRST_DARK_SLIDE,
  FIRST_LIGHT_SLIDE,
  pickPreferredSlide,
} from "@/lib/main-slider";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Totally Gone Bananas uses affiliate advertising and Google Analytics.",
};

export default async function PolicyPage() {
  const [lightSlides, darkSlides] = await Promise.all([getMainSliderImages(), getDarkMainSliderImages()]);
  const heroLight = pickPreferredSlide(lightSlides, FIRST_LIGHT_SLIDE);
  const heroDark = pickPreferredSlide(darkSlides, FIRST_DARK_SLIDE);

  return (
    <div className="wrap">
      <div className="about policy">
        <div className="about-copy">
          <h1 className="h1">Privacy Policy</h1>
          <h2>Advertising.</h2>
          <p>
            This Site uses affiliate marketing for the purposes of placing advertising on the Site, and will sometimes
            collect and use certain data for advertising purposes.
          </p>
          <p>
            We use Google Analytics to analyze the use of our website. Google Analytics gathers information about website
            use by means of cookies. The information gathered relating to our website is used to create reports about the
            use of our website. Google&apos;s privacy policy is available at:{" "}
            <a href="https://www.google.com/policies/privacy/" target="_blank" rel="noopener noreferrer">
              https://www.google.com/policies/privacy/
            </a>
          </p>
        </div>
        <div className="mascot-wrap about-slide">
          <HeroSlide
            lightSrc={heroLight}
            darkSrc={heroDark}
            sizes="(max-width: 900px) 320px, min(38rem, 54vw)"
          />
        </div>
      </div>
    </div>
  );
}

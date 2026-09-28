import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Faves",
  description: "Hand-picked favorite posts from Totally Gone Bananas.",
};

export default function OurFavesPage() {
  return (
    <div className="wrap our-faves-page">
      <div className="page-head">
        <h1>Our Faves</h1>
        <p className="lede">
          A curated shelf of favorite banana stories. Posts tagged favorites will show up here soon.
        </p>
      </div>
      <div className="empty">
        <p>Placeholder for now — favorite posts are on the way.</p>
      </div>
      <div style={{ height: "3rem" }} />
    </div>
  );
}

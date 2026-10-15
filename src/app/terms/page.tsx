import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using Totally Gone Bananas.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service",
    description: "Terms for using Totally Gone Bananas.",
    url: "/terms",
  },
};

export default function TermsPage() {
  return (
    <div className="wrap narrow">
      <section className="page-head">
        <h1>Terms of Service</h1>
        <p className="lede">The friendly-but-important stuff for using Totally Gone Bananas.</p>
      </section>

      <div className="about-copy policy">
        <h2>Using This Site</h2>
        <p>
          Totally Gone Bananas shares recipes, banana guides, product recommendations, and related content for general
          information and entertainment. By using this site, you agree to use it lawfully and respectfully.
        </p>

        <h2>Recipes and Advice</h2>
        <p>
          Recipes, gardening notes, and nutrition or plant-care information are provided as general guidance. Use your
          judgment, follow food safety practices, and verify plant or allergy information that matters for your household.
        </p>

        <h2>Accounts and Submissions</h2>
        <p>
          If you create an account or submit a recipe, comment, photo, or other content, you are responsible for what you
          share. We may edit, moderate, remove, or decline submissions that are inaccurate, unsafe, spammy, or not a fit
          for the site.
        </p>

        <h2>Affiliate Links and Products</h2>
        <p>
          Some links may be affiliate or sponsored links. We may earn a commission if you buy through those links, at no
          extra cost to you. Product availability, pricing, and claims belong to the seller or manufacturer.
        </p>

        <h2>Intellectual Property</h2>
        <p>
          Site content, branding, photos, writing, and design belong to Totally Gone Bananas or their respective owners.
          Please do not copy, republish, or sell site content without permission.
        </p>

        <h2>Changes</h2>
        <p>
          We may update these terms from time to time. Continued use of the site after updates means you accept the
          revised terms.
        </p>

        <p>
          Questions about these terms? Use the contact form on the About page.
        </p>
      </div>
    </div>
  );
}

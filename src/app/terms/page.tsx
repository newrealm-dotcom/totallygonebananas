import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using Totally Gone Bananas and the merch store.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service",
    description: "Terms for using Totally Gone Bananas and the merch store.",
    url: "/terms",
  },
};

export default function TermsPage() {
  return (
    <div className="wrap narrow">
      <section className="page-head">
        <h1>Terms of Service</h1>
        <p className="policy-updated">Last updated: October 29, 2026</p>
      </section>

      <div className="about-copy policy-copy">
        <p>
          The friendly-but-important stuff for using Totally Gone Bananas. These terms are an agreement between you and
          Totally Gone Bananas (&quot;we,&quot; &quot;us&quot;) and cover{" "}
          <a href="https://totallygonebananas.com/">totallygonebananas.com</a> and our merch store at{" "}
          <a href="https://store.totallygonebananas.com/" target="_blank" rel="noopener noreferrer">
            store.totallygonebananas.com
          </a>{" "}
          (together, the &quot;Site&quot;). By using the Site, you agree to them. Our{" "}
          <Link href="/policy">Privacy Policy</Link> explains how we handle your information.
        </p>

        <h2>Who can use the Site</h2>
        <p>
          You must be 13 or older to create an account, submit content, or sign up for the newsletter. If you&apos;re
          under 18, please review these terms with a parent or guardian. Contests and giveaways have their own age and
          location requirements, set out in each contest&apos;s official rules.
        </p>

        <h2>Your account</h2>
        <p>
          Give accurate information when you join, keep your password private, and let us know if you think someone
          else has used your account. You&apos;re responsible for what happens under your account. We may suspend or
          close accounts that break these terms.
        </p>

        <h2>Recipes and advice</h2>
        <p>
          Recipes, gardening notes, and nutrition or plant-care information are general guidance. Use your judgment,
          follow food safety practices, and check ingredients against any allergies in your household. Nutrition
          figures, where shown, are estimates.
        </p>

        <h2>Your submissions</h2>
        <p>
          When you submit a recipe, photo, comment, rating or anything else (&quot;Submissions&quot;), you keep
          ownership of it.
        </p>
        <p>
          By posting it, you give Totally Gone Bananas a non-exclusive, worldwide, royalty-free license to host,
          display, copy, resize, crop, format and share your Submission on the Site, in our newsletter and on our
          social media accounts. We&apos;ll credit your username where practical. This license ends when you delete the
          Submission or your account, except for copies already shared in a newsletter or social post, and backup
          copies we keep for a limited time.
        </p>
        <p>You promise that:</p>
        <ul>
          <li>You own your Submission or have permission to share it, including every photo.</li>
          <li>It doesn&apos;t copy someone else&apos;s recipe text, photos or other work without permission.</li>
          <li>It doesn&apos;t include anyone else&apos;s personal information.</li>
          <li>It isn&apos;t unlawful, hateful, harassing, sexually explicit, misleading, or spam.</li>
        </ul>
        <p>
          We may edit, moderate, remove, or decline Submissions that are inaccurate, unsafe, spammy, infringing, or not
          a fit for the Site.
        </p>

        <h2>Copyright complaints</h2>
        <p>
          We respect copyright and respond to notices that follow the Digital Millennium Copyright Act (DMCA). If you
          believe something on the Site infringes your copyright, send a written notice to our designated agent:
        </p>
        <p>
          Copyright Agent, Totally Gone Bananas, 7512 SW 26th Ct, Davie, FL 33314. Email:{" "}
          <a href="mailto:privacy@totallygonebananas.com">privacy@totallygonebananas.com</a>.
        </p>
        <p>Your notice must include:</p>
        <ol>
          <li>Your physical or electronic signature, as the copyright owner or someone authorized to act for them.</li>
          <li>A description of the copyrighted work you believe was infringed.</li>
          <li>The location of the material on the Site, such as its URL.</li>
          <li>Your name, mailing address, phone number and email address.</li>
          <li>
            A statement that you have a good-faith belief the use isn&apos;t authorized by the copyright owner, its
            agent, or the law.
          </li>
          <li>
            A statement that the information in your notice is accurate and, under penalty of perjury, that you are
            authorized to act for the copyright owner.
          </li>
        </ol>
        <p>
          <strong>Counter-notices.</strong> If we remove your Submission after a notice and you believe that was a
          mistake, you can send our agent a counter-notice. It must include your signature; a description of the
          removed material and where it appeared; a statement under penalty of perjury that you have a good-faith
          belief it was removed by mistake or misidentification; your name, address and phone number; and your consent
          to the jurisdiction of the federal district court for your address (or, if you live outside the U.S., any
          judicial district where we may be found) and to accept service from the person who sent the original notice.
          We may restore the material in 10 to 14 business days unless the complaining party tells us they&apos;ve
          filed a court action.
        </p>
        <p>
          <strong>Repeat infringers.</strong> We close the accounts of users who repeatedly infringe others&apos;
          copyrights.
        </p>

        <h2>Store purchases</h2>
        <p>
          Orders from our merch store are one-time purchases; we don&apos;t sell subscriptions. Prices, availability,
          shipping times and our returns policy are shown in the store. We may cancel an order if an item is
          unavailable or a price was listed in error, and we&apos;ll refund you in full if we do.
        </p>

        <h2>Contests and giveaways</h2>
        <p>
          Each contest or giveaway has official rules that set out eligibility, how to enter, how winners are chosen,
          and the prizes. Those rules apply alongside these terms. Unless the rules say otherwise, entrants must be
          legal U.S. residents aged 18 or older, and contests are void where prohibited.
        </p>

        <h2>Affiliate links and products</h2>
        <p>
          Some links are affiliate or sponsored links. We may earn a commission if you buy through them, at no extra
          cost to you. Product availability, pricing and claims belong to the seller or manufacturer.
        </p>

        <h2>Our content</h2>
        <p>
          Site content, branding, photos, writing and design belong to Totally Gone Bananas or their respective owners.
          Please don&apos;t copy, republish or sell our content without permission. Sharing a link to a recipe is always
          welcome.
        </p>

        <h2>Disclaimers and limits</h2>
        <p>
          The Site is provided &quot;as is,&quot; without warranties of any kind, to the fullest extent the law allows.
          We aren&apos;t responsible for content other users post or for third-party sites we link to. To the fullest
          extent the law allows, Totally Gone Bananas isn&apos;t liable for indirect, incidental or consequential
          damages from your use of the Site, and our total liability to you is limited to the greater of what you paid
          us in the past 12 months or $50.
        </p>

        <h2>Governing law</h2>
        <p>
          These terms are governed by the laws of the State of Florida. Any dispute will be handled in the state or
          federal courts located in Broward County, Florida.
        </p>

        <h2>Changes</h2>
        <p>
          We may update these terms from time to time and will change the date at the top when we do. Continued use of
          the Site after an update means you accept the revised terms.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms? Email{" "}
          <a href="mailto:privacy@totallygonebananas.com">privacy@totallygonebananas.com</a> or use the{" "}
          <Link href="/about#contact-h">contact form</Link> on our About page.
        </p>
      </div>
    </div>
  );
}

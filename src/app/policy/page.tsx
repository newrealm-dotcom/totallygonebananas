import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Totally Gone Bananas collects, uses, and shares information.",
  alternates: { canonical: "/policy" },
  openGraph: {
    title: "Privacy Policy",
    description: "How Totally Gone Bananas collects, uses, and shares information.",
    url: "/policy",
  },
};

export default function PolicyPage() {
  return (
    <div className="wrap narrow">
      <section className="page-head">
        <h1>Privacy Policy</h1>
        <p className="policy-updated">Last updated: October 29, 2026</p>
      </section>

      <div className="about-copy policy-copy">
        <p>
          This policy explains what information Totally Gone Bananas (&quot;we,&quot; &quot;us&quot;) collects when you
          use{" "}
          <a href="https://totallygonebananas.com/">totallygonebananas.com</a> and our merch store at{" "}
          <a href="https://store.totallygonebananas.com/" target="_blank" rel="noopener noreferrer">
            store.totallygonebananas.com
          </a>{" "}
          (together, the &quot;Site&quot;), how we use it, who we share it with, and the choices you have.
        </p>

        <h2>Who we are</h2>
        <p>Totally Gone Bananas, 7512 SW 26th Ct, Davie, FL 33314, United States.</p>
        <p>
          Email: <a href="mailto:privacy@totallygonebananas.com">privacy@totallygonebananas.com</a>. You can also reach
          us through the <Link href="/about#contact-h">contact form</Link> on our About page.
        </p>

        <h2>Information you give us</h2>
        <ul>
          <li>
            <strong>Account details.</strong> When you join, we collect your email address, username and password. If
            you add a profile photo or bio, we collect those too.
          </li>
          <li>
            <strong>Your submissions.</strong> Recipes, photos, comments, ratings and the recipes you save to your
            Banana Stand.
          </li>
          <li>
            <strong>Newsletter signups.</strong> Your email address.
          </li>
          <li>
            <strong>Messages.</strong> Your name, email and whatever you write when you use our contact form.
          </li>
          <li>
            <strong>Store orders.</strong> Your name, email, shipping and billing address, phone number (if you give
            one) and order details. Card payments are handled by Stripe; we never see or store your full card number.
          </li>
          <li>
            <strong>Contests and giveaways.</strong> The details each entry form asks for, such as your name, email and
            shipping address if you win.
          </li>
        </ul>

        <h2>Information we collect automatically</h2>
        <ul>
          <li>
            <strong>Device and usage data.</strong> Your IP address, browser and device type, approximate location
            based on IP address, pages you view, links you click, the site that referred you, and the date and time of
            your visit.
          </li>
          <li>
            <strong>Google Analytics.</strong> We use Google Analytics to understand how people use the Site. It uses
            cookies to gather usage information and send it to Google, which produces reports for us.
          </li>
          <li>
            <strong>Microsoft Clarity session recordings.</strong> We use Microsoft Clarity to see how visitors use our
            pages so we can fix problems and improve the design. Clarity records mouse movements, clicks, scrolling and
            page content, and builds heatmaps and session replays from them. We set Clarity to mask text you type into
            forms, so your passwords, messages and other entries are not captured.
          </li>
          <li>
            <strong>Cookies.</strong> See{" "}
            <a href="#cookies">&quot;Cookies and your choices&quot;</a> below.
          </li>
        </ul>

        <h2>How we use your information</h2>
        <ul>
          <li>To run your account and show your recipes, photos, ratings and comments on the Site.</li>
          <li>To send the newsletter you signed up for.</li>
          <li>To process, ship and support your store orders.</li>
          <li>To run contests and giveaways and contact winners.</li>
          <li>To answer your messages.</li>
          <li>To understand how the Site is used, fix bugs and improve it.</li>
          <li>To keep the Site secure and prevent spam, fraud and abuse.</li>
          <li>To meet legal, tax and accounting obligations.</li>
        </ul>

        <h2>What other people can see</h2>
        <p>
          Recipes, photos, comments, ratings and your username are public. Anyone visiting the Site can see them, and
          search engines may index them. Don&apos;t include personal details in your submissions that you wouldn&apos;t
          want public.
        </p>

        <h2>Who we share information with</h2>
        <p>We do not sell your personal information. We share it only with:</p>
        <ul>
          <li>
            <strong>Service providers</strong> that run parts of the Site for us: our hosting and database providers
            (including Supabase), Resend for the newsletter, Google (Analytics), Microsoft (Clarity), WooCommerce and
            our store host, Stripe, and the shipping carriers and print partners that make and deliver your order. They
            may use your information only to provide their services to us.
          </li>
          <li>
            <strong>Affiliate partners.</strong> Some links on the Site are affiliate links through Amazon Associates
            and Rakuten Advertising. If you click one, the retailer may set its own cookies to track whether you made a
            purchase. Their own privacy policies apply.
          </li>
          <li>
            <strong>Legal and safety reasons.</strong> When the law requires it, or when it&apos;s needed to protect our
            rights, our users or the public.
          </li>
          <li>
            <strong>A business change.</strong> If Totally Gone Bananas is sold or merged, your information may transfer
            to the new owner under this policy.
          </li>
        </ul>

        <h2 id="cookies">Cookies and your choices</h2>
        <p>We use three kinds of cookies:</p>
        <ul>
          <li>
            <strong>Essential cookies</strong> keep you signed in, remember your cart and your light or dark theme
            setting. The Site doesn&apos;t work properly without them.
          </li>
          <li>
            <strong>Analytics cookies</strong> from Google Analytics and Microsoft Clarity help us understand how the
            Site is used.
          </li>
          <li>
            <strong>Affiliate cookies</strong> are set by retailers when you click an affiliate link.
          </li>
        </ul>
        <p>
          If you visit from the European Economic Area, the United Kingdom or Switzerland, we ask for your consent
          before setting analytics cookies, and you can change your choice at any time through the cookie settings link
          in the footer. Anyone can block or delete cookies in their browser settings, and Google offers a browser
          add-on to opt out of Google Analytics.
        </p>
        <p>Our Site does not currently respond to browser &quot;Do Not Track&quot; signals.</p>

        <h2>Children</h2>
        <p>
          The Site is meant for a general audience and is not directed to children under 13. You must be 13 or older to
          create an account, submit content, enter a contest or sign up for the newsletter. If we learn that we&apos;ve
          collected personal information from a child under 13, we will delete it. Parents who think their child has
          given us information can contact us at{" "}
          <a href="mailto:privacy@totallygonebananas.com">privacy@totallygonebananas.com</a>.
        </p>

        <h2>Your rights and choices</h2>
        <ul>
          <li>
            <strong>Newsletter.</strong> Every email has an unsubscribe link.
          </li>
          <li>
            <strong>Your account.</strong> You can edit your profile and submissions from{" "}
            <Link href="/profile">My Banana Stand</Link>. To delete your account, contact us and we&apos;ll remove it
            along with your personal information, except what we must keep for legal reasons.
          </li>
          <li>
            <strong>Access, correction and deletion.</strong> You can ask what personal information we hold about you,
            or ask us to correct or delete it. We&apos;ll respond within 30 days, wherever you live.
          </li>
          <li>
            <strong>Visitors in the EEA, UK and Switzerland.</strong> You also have the right to restrict or object to
            our use of your information, to receive it in a portable format, to withdraw consent at any time, and to
            complain to your local data protection authority. We rely on your consent for analytics cookies, on our
            contract with you for accounts and orders, and on our legitimate interest in running a secure, working
            website for everything else.
          </li>
        </ul>
        <p>
          To make a request, email <a href="mailto:privacy@totallygonebananas.com">privacy@totallygonebananas.com</a>.
          We may need to confirm your identity first.
        </p>

        <h2>How long we keep information</h2>
        <ul>
          <li>
            <strong>Account information and submissions:</strong> until you delete your account.
          </li>
          <li>
            <strong>Newsletter email:</strong> until you unsubscribe.
          </li>
          <li>
            <strong>Order records:</strong> as long as tax and accounting rules require.
          </li>
          <li>
            <strong>Analytics and session recording data:</strong> for the retention period set by Google and Microsoft.
          </li>
        </ul>

        <h2>Security</h2>
        <p>
          We use reasonable safeguards, including encrypted connections (HTTPS) and access controls, to protect your
          information. No website is completely secure, so we can&apos;t guarantee absolute security.
        </p>

        <h2>Where your information is stored</h2>
        <p>
          We&apos;re based in the United States, and our service providers may store and process information in the
          U.S. and other countries. If you visit from outside the U.S., your information will be transferred there.
        </p>

        <h2>Other websites</h2>
        <p>
          The Site links to other sites, including Patreon, Spotify, our social media accounts and retailers. Their
          privacy practices are their own, and this policy doesn&apos;t cover them.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          When we change this policy, we&apos;ll update the date at the top. If a change is significant, we&apos;ll also
          post a notice on the Site or email account holders.
        </p>

        <h2>Contact us</h2>
        <p>
          Questions about this policy or your information:{" "}
          <a href="mailto:privacy@totallygonebananas.com">privacy@totallygonebananas.com</a>, or write to Totally Gone
          Bananas, 7512 SW 26th Ct, Davie, FL 33314.
        </p>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Send Totally Gone Bananas a question, idea, or banana confession.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Totally Gone Bananas",
    description: "Send Totally Gone Bananas a question, idea, or banana confession.",
    url: "/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="wrap narrow contact-page">
      <section className="page-head">
        <h1>Contact Totally Gone Bananas</h1>
        <p className="lede">Questions, ideas, or banana confessions? Send us a note and we&apos;ll peel back a reply soon.</p>
      </section>
      <ContactForm />
    </div>
  );
}

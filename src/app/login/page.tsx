import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getViewer } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Sign in",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

const INTENT_LEDE: Record<string, string> = {
  save: "Create a free account to save recipes to your Banana Stand.",
  rate: "Create a free account to rate recipes, share tips, and track what you've cooked.",
  newsletter: "You're on the list — create a free Banana Stand to save recipes and earn points.",
  float: "Create a free account to save recipes, rate what you cook, and share your own.",
  share: "Create a free account to share your favorite banana recipes with the bunch.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const raw = typeof sp.next === "string" ? sp.next : "/profile";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/profile";
  const failed = sp.error === "auth";
  const intent = typeof sp.intent === "string" ? sp.intent : null;
  const emailRaw = typeof sp.email === "string" ? sp.email.trim() : "";
  const initialEmail = emailRaw.includes("@") && emailRaw.length <= 120 ? emailRaw : "";
  const lede =
    (intent && INTENT_LEDE[intent]) ||
    "Sign in to save recipes, rate what you cook, and share your own.";
  const { userId } = await getViewer();
  if (userId && !failed) redirect(next);
  return (
    <div className="wrap narrow login">
      <div className="login-hero-stack">
        <Image
          className="login-hero login-hero-light"
          src="/img-login.webp"
          alt=""
          width={1200}
          height={800}
          priority
        />
        <Image
          className="login-hero login-hero-dark"
          src="/img-login-dark.webp"
          alt=""
          width={1200}
          height={800}
          priority
        />
      </div>
      <div className="page-head" style={{ textAlign: "center" }}>
        <h1>Come on in</h1>
        <p className="lede" style={{ marginInline: "auto" }}>
          {lede}
        </p>
      </div>
      {failed && (
        <p className="notice-inline warn" role="alert">
          That sign-in link didn&apos;t work or has expired. Request a new one below — or enter the
          one-time code from the email.
        </p>
      )}
      <LoginForm
        next={next}
        googleEnabled={process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true"}
        initialEmail={initialEmail}
        intent={intent}
      />
    </div>
  );
}

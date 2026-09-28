import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getViewer } from "@/lib/queries";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const raw = typeof sp.next === "string" ? sp.next : "/profile";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/profile";
  const failed = sp.error === "auth";
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
        <p className="lede" style={{ marginInline: "auto" }}>Sign in to save recipes, rate what you cook, and share your own.</p>
      </div>
      {failed && (
        <p className="notice-inline warn" role="alert">
          That sign-in link didn&apos;t work or has expired. Request a new one below — or enter the
          one-time code from the email.
        </p>
      )}
      <LoginForm next={next} googleEnabled={process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true"} />
    </div>
  );
}

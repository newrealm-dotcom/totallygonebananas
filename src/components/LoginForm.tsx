"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AUTH_NEXT_COOKIE,
  HAS_ACCOUNT_COOKIE,
  HAS_ACCOUNT_MAX_AGE,
  firstLoginDestination,
  isFreshAccount,
  withAuthJoinedFlag,
} from "@/lib/auth-next";
import { trackButtonClick, trackEvent, trackFormFill } from "@/lib/analytics/datalayer";
import { createClient } from "@/lib/supabase/client";
import { TurnstileField } from "@/components/TurnstileField";

const TURNSTILE_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());

export function LoginForm({
  next,
  googleEnabled,
  initialEmail = "",
  intent = null,
}: {
  next: string;
  googleEnabled: boolean;
  initialEmail?: string;
  intent?: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "verifying" | "error">("idle");
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const onTurnstileToken = useCallback((token: string) => setTurnstileToken(token), []);

  // Keep redirectTo free of query params — GoTrue's PKCE redirect can drop `code`
  // when the allow-listed URL already has a query string.
  const callback = () => `${location.origin}/auth/callback`;

  function rememberNext() {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(next)}; Path=/; Max-Age=3600; SameSite=Lax${secure}`;
  }

  function rememberHasAccount() {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${HAS_ACCOUNT_COOKIE}=1; Path=/; Max-Age=${HAS_ACCOUNT_MAX_AGE}; SameSite=Lax${secure}`;
  }

  async function sendLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formToken = new FormData(e.currentTarget).get("cf-turnstile-response");
    const captchaToken = turnstileToken || (typeof formToken === "string" ? formToken : "");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setState("error");
      setError("Enter a valid email address.");
      return;
    }
    setState("sending");
    setError("");
    if (!TURNSTILE_CONFIGURED) {
      setState("error");
      setError("Captcha isn't configured yet. Please try again later.");
      return;
    }
    if (!captchaToken) {
      setState("error");
      setError("Please complete the captcha and try again.");
      return;
    }
    rememberNext();
    trackFormFill("login_email", { intent: intent ?? undefined });
    trackEvent("sign_up_start", { method: "email", intent: intent ?? undefined });
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback(), captchaToken },
    });
    if (error) {
      setState("error");
      setTurnstileResetKey((v) => v + 1);
      const msg = error.message.toLowerCase();
      setError(
        msg.includes("sending magic link") || msg.includes("error sending")
          ? "We couldn't send the sign-in email right now. Please try again in a minute."
          : error.message,
      );
    } else {
      setState("sent");
      setCode("");
      setTurnstileResetKey((v) => v + 1);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\s/g, "");
    if (!/^\d{6,8}$/.test(token)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setState("verifying");
    setError("");
    const supabase = createClient();
    // Confirmation emails use type "signup"; later sign-ins use "email".
    const emailTry = await supabase.auth.verifyOtp({ email, token, type: "email" });
    const signupTry = emailTry.error ? await supabase.auth.verifyOtp({ email, token, type: "signup" }) : null;
    const verified = signupTry && !signupTry.error ? signupTry : emailTry;
    if (verified.error) {
      setState("sent");
      setError(verified.error.message);
      return;
    }
    rememberHasAccount();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;
    const aal = typeof claimsData?.claims?.aal === "string" ? claimsData.claims.aal : "aal1";
    if (userId) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle<{ role: string }>();
      if (profile?.role === "admin" && aal !== "aal2") {
        router.replace(`/login/mfa?next=${encodeURIComponent(next)}`);
        router.refresh();
        return;
      }
    }
    const createdAt = verified.data.user?.created_at;
    const confirmedSignup = Boolean(signupTry && !signupTry.error);
    const landing =
      confirmedSignup || isFreshAccount(createdAt) ? firstLoginDestination(next) : withAuthJoinedFlag(next);
    router.replace(landing);
    router.refresh();
  }

  async function google() {
    rememberNext();
    trackButtonClick("Continue with Google", { intent: intent ?? undefined });
    trackEvent("sign_up_start", { method: "google", intent: intent ?? undefined });
    await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
  }

  if (state === "sent" || state === "verifying") {
    return (
      <div className="panel stack" data-clarity-mask="true">
        <div>
          <h2>Check your email</h2>
          <p>
            We sent a message to <b>{email}</b>. Open it to confirm your address. A new account
            lands on your Banana Stand. You can also enter the code from that email below.
          </p>
          <ol className="welcome-steps">
            <li>Open the email and tap the link.</li>
            <li>Your profile opens so you can name your stand and save a recipe.</li>
          </ol>
        </div>
        <form onSubmit={verifyCode} className="stack" noValidate data-clarity-mask="true">
          <div className="f">
            <label htmlFor="otp">One-time code</label>
            <input
              id="otp"
              className="field"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-invalid={Boolean(error)}
            />
          </div>
          {error && (
            <p className="f-err" role="alert">
              {error}
            </p>
          )}
          <button className="btn" type="submit" disabled={state === "verifying"}>
            {state === "verifying" ? "Confirming…" : "Confirm and continue"}
          </button>
        </form>
        <button
          type="button"
          className="linkbtn"
          onClick={() => {
            setState("idle");
            setError("");
          }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="panel stack" data-clarity-mask="true">
      <form onSubmit={sendLink} className="stack" noValidate data-clarity-mask="true">
        <div className="f">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="field"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={state === "error"}
          />
        </div>
        {state === "error" && (
          <p className="f-err" role="alert">
            {error}
          </p>
        )}
        <TurnstileField onTokenChange={onTurnstileToken} resetKey={turnstileResetKey} />
        <button className="btn" type="submit" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>
      {googleEnabled && (
        <>
          <p className="or">
            <span>or</span>
          </p>
          <button type="button" className="btn ghost" onClick={google}>
            Continue with Google
          </button>
        </>
      )}
      <p className="hint">No password needed. New here? The same link creates your account.</p>
    </div>
  );
}

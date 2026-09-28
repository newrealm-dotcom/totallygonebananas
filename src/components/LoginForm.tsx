"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AUTH_NEXT_COOKIE } from "@/lib/auth-next";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "verifying" | "error">("idle");
  const [error, setError] = useState("");

  // Keep redirectTo free of query params — GoTrue's PKCE redirect can drop `code`
  // when the allow-listed URL already has a query string.
  const callback = () => `${location.origin}/auth/callback`;

  function rememberNext() {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(next)}; Path=/; Max-Age=3600; SameSite=Lax${secure}`;
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setState("error");
      setError("Enter a valid email address.");
      return;
    }
    setState("sending");
    setError("");
    rememberNext();
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback() },
    });
    if (error) {
      setState("error");
      const msg = error.message.toLowerCase();
      setError(
        msg.includes("sending magic link") || msg.includes("error sending")
          ? "We couldn't send the sign-in email right now. Please try again in a minute."
          : error.message,
      );
    } else {
      setState("sent");
      setCode("");
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
    const { error } = await createClient().auth.verifyOtp({ email, token, type: "email" });
    if (error) {
      setState("sent");
      setError(error.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function google() {
    rememberNext();
    await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
  }

  if (state === "sent" || state === "verifying") {
    return (
      <div className="panel stack">
        <div>
          <h2>Check your email</h2>
          <p>
            We sent a sign-in link to <b>{email}</b>. You can open the link, or enter the code from
            that email below.
          </p>
        </div>
        <form onSubmit={verifyCode} className="stack" noValidate>
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
            {state === "verifying" ? "Signing in…" : "Sign in with code"}
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
    <div className="panel stack">
      <form onSubmit={sendLink} className="stack" noValidate>
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

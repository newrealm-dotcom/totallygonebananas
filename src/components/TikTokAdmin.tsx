"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { disconnectTikTokAccount } from "@/actions/tiktok";

export function TikTokAdmin({
  connected,
  username,
  appConfigured,
  callbackUrl,
  urlPrefix,
  error,
  justConnected,
}: {
  connected: boolean;
  username: string | null;
  appConfigured: boolean;
  callbackUrl: string;
  urlPrefix: string;
  error: string | null;
  justConnected: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(
    justConnected ? "TikTok connected. New recipes and posts with covers will publish as photo posts." : null,
  );
  const [pending, start] = useTransition();

  function onDisconnect() {
    if (!confirm("Disconnect TikTok auto-posting?")) return;
    start(async () => {
      const result = await disconnectTikTokAccount();
      setMessage(result.ok ? "TikTok disconnected." : result.error);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="stack" style={{ maxWidth: "36rem" }}>
      {error ? (
        <p className="f-err" role="alert">
          {error === "missing_app"
            ? "Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in Vercel, then try again."
            : error === "oauth_state"
              ? "OAuth state mismatch. Click Connect again."
              : error}
        </p>
      ) : null}
      {message ? <p className="ok-msg" role="status">{message}</p> : null}

      <div className="panel">
        <h2>1. Create a TikTok app</h2>
        <p>
          In{" "}
          <a href="https://developers.tiktok.com/" target="_blank" rel="noopener noreferrer">
            developers.tiktok.com
          </a>
          , create an app for Totally Gone Bananas. Add Login Kit and the Content Posting API. Add this Redirect URI exactly:
        </p>
        <p>
          <code>{callbackUrl}</code>
        </p>
        <p>
          Verify this URL prefix so TikTok can pull cover images. In the app, open Manage URL properties and add:
        </p>
        <p>
          <code>{urlPrefix}</code>
        </p>
        <p>Request the <code>user.info.basic</code> and <code>video.publish</code> scopes, then set these Vercel env vars and redeploy:</p>
        <ul>
          <li>
            <code>TIKTOK_CLIENT_KEY</code>
          </li>
          <li>
            <code>TIKTOK_CLIENT_SECRET</code>
          </li>
        </ul>
        <p className="hint">{appConfigured ? "App credentials are set." : "App credentials are not set yet."}</p>
      </div>

      <div className="panel">
        <h2>{connected ? "Connected" : "2. Connect TikTok"}</h2>
        <p>
          {connected
            ? `Signed in${username ? ` as @${username}` : ""}. Newly published recipes, blog posts, and Our Faves that have a cover image are posted to this account.`
            : "Sign in with the Totally Gone Bananas TikTok account and approve posting access."}
        </p>
        <p className="hint">
          Until TikTok audits the app, photo posts stay private on that account. After approval they publish publicly.
        </p>
        {connected ? (
          <div className="row-actions">
            <a className="btn ghost" href="/api/tiktok/oauth">
              Reconnect
            </a>
            <button type="button" className="btn danger" disabled={pending} onClick={onDisconnect}>
              Disconnect
            </button>
          </div>
        ) : appConfigured ? (
          <p>
            <a className="btn" href="/api/tiktok/oauth">
              Connect TikTok
            </a>
          </p>
        ) : (
          <p className="hint">Add the app credentials above, redeploy, then the Connect button will appear.</p>
        )}
      </div>
    </div>
  );
}

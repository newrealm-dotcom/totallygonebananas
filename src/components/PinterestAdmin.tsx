"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { disconnectPinterestAccount, savePinterestBoard } from "@/actions/pinterest";
import type { PinterestBoard } from "@/lib/social/pinterest";

export function PinterestAdmin({
  connected,
  boardId,
  boards,
  appConfigured,
  callbackUrl,
  error,
  justConnected,
}: {
  connected: boolean;
  boardId: string | null;
  boards: PinterestBoard[];
  appConfigured: boolean;
  callbackUrl: string;
  error: string | null;
  justConnected: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(boardId ?? boards[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(
    justConnected ? "Pinterest connected. Choose a board to finish setup." : null,
  );
  const [pending, start] = useTransition();

  function onSaveBoard() {
    start(async () => {
      const result = await savePinterestBoard(selected);
      setMessage(result.ok ? "Board saved. New recipes and posts with covers will Pin automatically." : result.error);
    });
  }

  function onDisconnect() {
    if (!confirm("Disconnect Pinterest auto-posting?")) return;
    start(async () => {
      const result = await disconnectPinterestAccount();
      setMessage(result.ok ? "Pinterest disconnected." : result.error);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="stack" style={{ maxWidth: "36rem" }}>
      {error ? (
        <p className="f-err" role="alert">
          {error === "missing_app"
            ? "Add PINTEREST_APP_ID and PINTEREST_APP_SECRET in Vercel, then try again."
            : error === "oauth_state"
              ? "OAuth state mismatch. Click Connect again."
              : error}
        </p>
      ) : null}
      {message ? <p className="ok-msg" role="status">{message}</p> : null}

      <div className="panel">
        <h2>1. Create a Pinterest app</h2>
        <p>
          In{" "}
          <a href="https://developers.pinterest.com/" target="_blank" rel="noopener noreferrer">
            developers.pinterest.com
          </a>
          , create an app for Totally Gone Bananas. Add this Redirect URI exactly:
        </p>
        <p>
          <code>{callbackUrl}</code>
        </p>
        <p>Set these Vercel env vars and redeploy before connecting:</p>
        <ul>
          <li>
            <code>PINTEREST_APP_ID</code>
          </li>
          <li>
            <code>PINTEREST_APP_SECRET</code>
          </li>
        </ul>
        <p className="hint">{appConfigured ? "App credentials are set." : "App credentials are not set yet."}</p>
      </div>

      <div className="panel">
        <h2>{connected ? "Connected" : "2. Connect Pinterest"}</h2>
        <p>
          {connected
            ? "Your Pinterest account is linked. Pick the board new Pins should land on."
            : "Sign in with the Totally Gone Bananas Pinterest account and approve boards + pins access."}
        </p>
        {connected ? (
          <div className="row-actions">
            <a className="btn ghost" href="/api/pinterest/oauth">
              Reconnect
            </a>
            <button type="button" className="btn danger" disabled={pending} onClick={onDisconnect}>
              Disconnect
            </button>
          </div>
        ) : appConfigured ? (
          <p>
            <a className="btn" href="/api/pinterest/oauth">
              Connect Pinterest
            </a>
          </p>
        ) : (
          <p className="hint">Add the app credentials above, redeploy, then the Connect button will appear.</p>
        )}
      </div>

      {connected ? (
        <div className="panel">
          <h2>3. Choose a board</h2>
          {boards.length === 0 ? (
            <p>No boards found on this account. Create one on Pinterest, then reconnect.</p>
          ) : (
            <>
              <label className="f">
                <span>Board</span>
                <select className="field" value={selected} onChange={(e) => setSelected(e.target.value)}>
                  {boards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.privacy ? ` (${b.privacy})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div className="row-actions">
                <button type="button" className="btn" disabled={pending || !selected} onClick={onSaveBoard}>
                  {pending ? "Saving…" : "Save board"}
                </button>
              </div>
              {boardId ? (
                <p className="hint">
                  Active board id: <code>{boardId}</code>
                </p>
              ) : (
                <p className="hint">Save a board before publishing — Pins need a destination board.</p>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

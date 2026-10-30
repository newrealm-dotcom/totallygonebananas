"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface TotpFactor {
  id: string;
  friendly_name?: string | null;
  status: "verified" | "unverified";
}

interface MfaPanelProps {
  isAdmin?: boolean;
  required?: boolean;
  next?: string;
}

export function MfaPanel({ isAdmin = false, required = false, next = "/profile" }: MfaPanelProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [aal, setAal] = useState("aal1");
  const [code, setCode] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [enrollFactorId, setEnrollFactorId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  const verified = factors.filter((f) => f.status === "verified");
  const challengeFactor = verified[0];
  const needsAdminMfa = required && isAdmin && aal !== "aal2";

  const refresh = useCallback(async () => {
    setError("");
    const [{ data: assurance, error: assuranceError }, { data, error: factorsError }] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);
    if (assuranceError || factorsError) {
      setError("Couldn't load authenticator settings. Refresh and try again.");
      setLoading(false);
      return;
    }
    setAal(assurance.currentLevel ?? "aal1");
    setFactors((data.totp ?? []) as TotpFactor[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  useEffect(() => {
    if (required && isAdmin && aal === "aal2") {
      router.replace(next);
      router.refresh();
    }
  }, [aal, isAdmin, next, required, router]);

  function beginEnroll() {
    setError("");
    setMessage("");
    setCode("");
    startTransition(async () => {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Totally Gone Bananas",
      });
      if (error) {
        setError(error.message);
        return;
      }
      setEnrollFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
    });
  }

  function verifyEnrollment(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollFactorId) return;
    const clean = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(clean)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setError("");
    startTransition(async () => {
      const challenge = await supabase.auth.mfa.challenge({ factorId: enrollFactorId });
      if (challenge.error) {
        setError(challenge.error.message);
        return;
      }
      const verify = await supabase.auth.mfa.verify({
        factorId: enrollFactorId,
        challengeId: challenge.data.id,
        code: clean,
      });
      if (verify.error) {
        setError(verify.error.message);
        return;
      }
      setCode("");
      setQr("");
      setSecret("");
      setEnrollFactorId("");
      setMessage("Authenticator app enabled.");
      await refresh();
      if (required) {
        router.replace(next);
        router.refresh();
      }
    });
  }

  function verifyChallenge(e: React.FormEvent) {
    e.preventDefault();
    if (!challengeFactor) {
      beginEnroll();
      return;
    }
    const clean = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(clean)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setError("");
    startTransition(async () => {
      const challenge = await supabase.auth.mfa.challenge({ factorId: challengeFactor.id });
      if (challenge.error) {
        setError(challenge.error.message);
        return;
      }
      const verify = await supabase.auth.mfa.verify({
        factorId: challengeFactor.id,
        challengeId: challenge.data.id,
        code: clean,
      });
      if (verify.error) {
        setError(verify.error.message);
        return;
      }
      setCode("");
      setMessage("Authenticator code verified.");
      await refresh();
      if (required) {
        router.replace(next);
        router.refresh();
      }
    });
  }

  function removeFactor(factorId: string) {
    if (isAdmin && verified.length <= 1) {
      setError("Admins must keep at least one authenticator app enabled.");
      return;
    }
    setError("");
    startTransition(async () => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) {
        setError(error.message);
        return;
      }
      setMessage("Authenticator app removed.");
      await supabase.auth.refreshSession();
      await refresh();
      router.refresh();
    });
  }

  if (loading) return <div className="panel stack"><p className="hint">Loading authenticator settings…</p></div>;

  if (required) {
    return (
      <div className="panel stack mfa-panel" data-clarity-mask="true">
        <h2>Admin verification</h2>
        <p className="hint">
          Admin accounts need an authenticator app before admin tools can be used.
        </p>
        {needsAdminMfa && challengeFactor ? (
          <form className="stack" onSubmit={verifyChallenge} noValidate>
            <div className="f">
              <label htmlFor="mfa-code">Authenticator code</label>
              <input
                id="mfa-code"
                className="field"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            {error ? <p className="f-err" role="alert">{error}</p> : null}
            {message ? <p className="ok-msg" role="status">{message}</p> : null}
            <div className="row-actions">
              <button className="btn" type="submit" disabled={pending}>
                {pending ? "Verifying…" : "Verify and continue"}
              </button>
            </div>
          </form>
        ) : null}
        {needsAdminMfa && !challengeFactor ? (
          qr ? (
            <form className="stack" onSubmit={verifyEnrollment} noValidate>
              <p>Scan this QR code in your authenticator app, then enter the 6-digit code.</p>
              {/* eslint-disable-next-line @next/next/no-img-element -- Supabase returns a QR data URL. */}
              <img className="mfa-qr" src={qr} alt="Authenticator QR code" />
              <p className="hint">Can&apos;t scan it? Enter this secret manually: <code>{secret}</code></p>
              <div className="f">
                <label htmlFor="mfa-enroll-code">Authenticator code</label>
                <input
                  id="mfa-enroll-code"
                  className="field"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
              {error ? <p className="f-err" role="alert">{error}</p> : null}
              <div className="row-actions">
                <button className="btn" type="submit" disabled={pending}>
                  {pending ? "Enabling…" : "Enable and continue"}
                </button>
              </div>
            </form>
          ) : (
            <>
              {error ? <p className="f-err" role="alert">{error}</p> : null}
              <div className="row-actions">
                <button className="btn" type="button" disabled={pending} onClick={beginEnroll}>
                  {pending ? "Starting…" : "Set up authenticator app"}
                </button>
              </div>
            </>
          )
        ) : null}
      </div>
    );
  }

  return (
    <section className="panel stack mfa-panel" data-clarity-mask="true" aria-labelledby="mfa-settings-h">
      <div>
        <h2 id="mfa-settings-h">Authenticator app</h2>
        <p className="hint">
          Add a one-time code from an authenticator app for extra protection. Admins must keep one enabled.
        </p>
      </div>
      {verified.length ? (
        <div className="mfa-factor-list">
          {verified.map((factor, i) => (
            <div className="mfa-factor" key={factor.id}>
              <div>
                <strong>{factor.friendly_name || `Authenticator app ${i + 1}`}</strong>
                <p className="hint">Verified</p>
              </div>
              <button
                type="button"
                className="btn ghost small"
                disabled={pending || aal !== "aal2" || (isAdmin && verified.length <= 1)}
                onClick={() => removeFactor(factor.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="hint">No authenticator app is enabled yet.</p>
      )}
      {verified.length && aal !== "aal2" ? (
        <form className="stack" onSubmit={verifyChallenge} noValidate>
          <p className="hint">Verify a current authenticator code before managing your factor.</p>
          <div className="f">
            <label htmlFor="mfa-manage-code">Authenticator code</label>
            <input
              id="mfa-manage-code"
              className="field"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          <div className="row-actions">
            <button className="btn" type="submit" disabled={pending}>
              {pending ? "Verifying…" : "Verify code"}
            </button>
          </div>
        </form>
      ) : null}
      {qr ? (
        <form className="stack" onSubmit={verifyEnrollment} noValidate>
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase returns a QR data URL. */}
          <img className="mfa-qr" src={qr} alt="Authenticator QR code" />
          <p className="hint">Can&apos;t scan it? Enter this secret manually: <code>{secret}</code></p>
          <div className="f">
            <label htmlFor="mfa-settings-code">Authenticator code</label>
            <input
              id="mfa-settings-code"
              className="field"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>
          <div className="row-actions">
            <button className="btn" type="submit" disabled={pending}>
              {pending ? "Enabling…" : "Enable authenticator"}
            </button>
            <button className="btn ghost" type="button" disabled={pending} onClick={() => { setQr(""); setSecret(""); setEnrollFactorId(""); setCode(""); }}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="row-actions">
          <button className="btn" type="button" disabled={pending} onClick={beginEnroll}>
            {pending ? "Starting…" : "Add authenticator app"}
          </button>
        </div>
      )}
      {error ? <p className="f-err" role="alert">{error}</p> : null}
      {message ? <p className="ok-msg" role="status">{message}</p> : null}
      {isAdmin && verified.length <= 1 ? <p className="hint">Admin accounts must keep at least one verified authenticator app.</p> : null}
    </section>
  );
}

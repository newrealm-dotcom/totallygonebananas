"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RECIPE_BUCKET, checkFile, kindOf, promoImageSrc } from "@/lib/media";
import { saveHomepagePromo } from "@/actions/homepage-promo";
import type { HomepagePromo } from "@/lib/types";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function HomepagePromoForm({ initial }: { initial: HomepagePromo }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [heading, setHeading] = useState(initial.heading);
  const [body, setBody] = useState(initial.body);
  const [buttonLabel, setButtonLabel] = useState(initial.button_label);
  const [buttonHref, setButtonHref] = useState(initial.button_href);
  const [imagePath, setImagePath] = useState(initial.image_path);
  const [preview, setPreview] = useState(() => promoImageSrc(initial.image_path));
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  async function onImage(file: File | null) {
    if (!file) return;
    const bad = checkFile(file);
    if (bad || kindOf(file) !== "image") {
      setErrors({ imagePath: bad || "Use a JPG, PNG, or WebP image." });
      return;
    }
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) {
      setErrors({ form: "Please sign in again." });
      return;
    }
    setUploading(true);
    setErrors((e) => ({ ...e, imagePath: "" }));
    const path = `${userId}/promo-${uid()}-${file.name.replace(/[^A-Za-z0-9._-]/g, "").slice(0, 80)}`;
    const { error } = await supabase.storage.from(RECIPE_BUCKET).upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    setUploading(false);
    if (error) {
      setErrors({ imagePath: error.message });
      return;
    }
    setImagePath(path);
    setPreview(URL.createObjectURL(file));
  }

  return (
    <form
      className="panel stack"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        start(async () => {
          const res = await saveHomepagePromo({ heading, body, buttonLabel, buttonHref, imagePath });
          if (res.ok) {
            setErrors({});
            setSaved(true);
            router.refresh();
          } else setErrors(res.errors);
        });
      }}
    >
      <div className="f">
        <label htmlFor="promo-heading">Header text</label>
        <input id="promo-heading" className="field" value={heading} maxLength={120} onChange={(e) => setHeading(e.target.value)} aria-invalid={!!errors.heading} />
        {errors.heading && <p className="f-err">{errors.heading}</p>}
      </div>
      <div className="f">
        <label htmlFor="promo-body">Body text</label>
        <textarea id="promo-body" className="field" rows={3} maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} aria-invalid={!!errors.body} />
        {errors.body && <p className="f-err">{errors.body}</p>}
      </div>
      <div className="f-grid">
        <div className="f">
          <label htmlFor="promo-btn-label">Button text</label>
          <input id="promo-btn-label" className="field" value={buttonLabel} maxLength={40} onChange={(e) => setButtonLabel(e.target.value)} aria-invalid={!!errors.buttonLabel} />
          {errors.buttonLabel && <p className="f-err">{errors.buttonLabel}</p>}
        </div>
        <div className="f">
          <label htmlFor="promo-btn-href">Button link</label>
          <input id="promo-btn-href" className="field" value={buttonHref} placeholder="/recipes" onChange={(e) => setButtonHref(e.target.value)} aria-invalid={!!errors.buttonHref} />
          {errors.buttonHref && <p className="f-err">{errors.buttonHref}</p>}
        </div>
      </div>
      <div className="f">
        <label htmlFor="promo-image">Background image</label>
        <input id="promo-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0] ?? null; e.target.value = ""; void onImage(f); }} />
        <p className="hint">Upload a new image, or keep the current public path ({imagePath.startsWith("/") ? imagePath : "uploaded file"}).</p>
        {preview && (
          <div className="post-cover-preview">
            <Image src={preview} alt="" width={640} height={280} unoptimized style={{ width: "100%", height: "auto", objectFit: "cover" }} />
            {imagePath !== "/featured-home.webp" && (
              <button
                type="button"
                className="linkbtn"
                onClick={() => {
                  setImagePath("/featured-home.webp");
                  setPreview("/featured-home.webp");
                }}
              >
                Reset to featured-home.webp
              </button>
            )}
          </div>
        )}
        {errors.imagePath && <p className="f-err">{errors.imagePath}</p>}
      </div>
      {errors.form && <p className="f-err" role="alert">{errors.form}</p>}
      {saved && <p className="ok-msg" role="status">Homepage promo saved.</p>}
      <div className="row-actions">
        <button className="btn" type="submit" disabled={pending || uploading}>{pending ? "Saving…" : uploading ? "Uploading…" : "Save promo"}</button>
        <Link className="btn ghost" href="/">View homepage</Link>
      </div>
    </form>
  );
}

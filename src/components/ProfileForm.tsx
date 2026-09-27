"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { AVATAR_BUCKET, isLocalUrl, publicUrl } from "@/lib/media";
import { updateProfile } from "@/actions/profile";
import type { Profile } from "@/lib/types";

const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const AVATAR_MAX_PX = 250;

function extFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

/** Scale an image down so both sides are at most AVATAR_MAX_PX. */
async function resizeAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, AVATAR_MAX_PX / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const type = AVATAR_TYPES.includes(file.type as (typeof AVATAR_TYPES)[number]) ? file.type : "image/jpeg";
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), type, 0.92);
    });
  } finally {
    bitmap.close();
  }
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarPath, setAvatarPath] = useState(profile.avatar_path);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const avatar = publicUrl(avatarPath, AVATAR_BUCKET);

  async function onAvatar(file: File) {
    if (!AVATAR_TYPES.includes(file.type as (typeof AVATAR_TYPES)[number])) {
      window.alert("Please upload a JPG, PNG, or WebP image.");
      setErrors({ avatarPath: "Please upload a JPG, PNG, or WebP image." });
      return;
    }
    setUploading(true);
    setErrors({});
    try {
      const blob = await resizeAvatar(file);
      const path = `${profile.id}/avatar-${Date.now()}.${extFor(file.type)}`;
      const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, blob, { contentType: file.type, upsert: false });
      if (error) setErrors({ avatarPath: "Upload failed. Try again." });
      else setAvatarPath(path);
    } catch {
      setErrors({ avatarPath: "Couldn’t process that image. Try another file." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      className="panel stack"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        start(async () => {
          const res = await updateProfile({ displayName, username, bio, avatarPath });
          if (res.ok) { setErrors({}); setSaved(true); router.refresh(); }
          else setErrors(res.errors);
        });
      }}
    >
      <div className="avatar-row">
        <div className="avatar-lg">
          {avatar ? <Image src={avatar} alt="" fill sizes="96px" unoptimized={isLocalUrl(avatar)} /> : <span aria-hidden="true">{(displayName || "?").slice(0, 1).toUpperCase()}</span>}
        </div>
        <div>
          <label className="btn ghost small">
            {uploading ? "Uploading…" : "Upload photo"}
            <input
              type="file"
              className="sr"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void onAvatar(f);
              }}
            />
          </label>
          <p className="hint" style={{ margin: ".35rem 0 0" }}>JPG, PNG, or WebP. Resized to 250×250 max.</p>
        </div>
      </div>
      {errors.avatarPath && <p className="f-err" role="alert">{errors.avatarPath}</p>}
      <div className="f">
        <label htmlFor="dn">Display name</label>
        <input id="dn" className="field" value={displayName} maxLength={60} onChange={(e) => setDisplayName(e.target.value)} aria-invalid={!!errors.displayName} />
        {errors.displayName && <p className="f-err">{errors.displayName}</p>}
      </div>
      <div className="f">
        <label htmlFor="un">Username <small>(optional, for your public page later)</small></label>
        <input id="un" className="field" value={username} maxLength={24} placeholder="bananafan_42" onChange={(e) => setUsername(e.target.value.toLowerCase())} aria-invalid={!!errors.username} />
        {errors.username && <p className="f-err">{errors.username}</p>}
      </div>
      <div className="f">
        <label htmlFor="bio">Bio <small>{bio.length}/280</small></label>
        <textarea id="bio" className="field" rows={3} maxLength={280} value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      {errors.form && <p className="f-err" role="alert">{errors.form}</p>}
      {saved && <p className="ok-msg" role="status">Profile saved.</p>}
      <div className="row-actions"><button className="btn" type="submit" disabled={pending || uploading}>{pending ? "Saving…" : "Save profile"}</button></div>
    </form>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { checkFile, isRemoteMediaPath, kindOf, mediaSrc, RECIPE_BUCKET } from "@/lib/media";
import { savePost, deletePost } from "@/actions/posts";
import { PostBodyEditor } from "@/components/PostBodyEditor";
import { slugify, toEasternDatetimeLocal, easternDatetimeLocalToIso } from "@/lib/format";
import type { Post } from "@/lib/types";

const MAX_HEAD_JSON_BYTES = 100_000;

type CoverMode = "upload" | "url";

function uid() {
  return crypto.randomUUID();
}

function isJsonObjectOrArray(value: unknown): value is Record<string, unknown> | unknown[] {
  return value !== null && typeof value === "object";
}

function initialCoverMode(path: string | null | undefined): CoverMode {
  return isRemoteMediaPath(path) ? "url" : "upload";
}

export function PostForm({ post }: { post?: Post }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [seoTitle, setSeoTitle] = useState(post?.seo_title ?? "");
  const [metaDescription, setMetaDescription] = useState(post?.meta_description ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const [title, setTitle] = useState(post?.title ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [publishedAtLocal, setPublishedAtLocal] = useState(() =>
    toEasternDatetimeLocal(post?.published_at),
  );
  const [coverMode, setCoverMode] = useState<CoverMode>(() => initialCoverMode(post?.cover_path));
  const [coverPath, setCoverPath] = useState<string | null>(
    isRemoteMediaPath(post?.cover_path) ? null : (post?.cover_path ?? null),
  );
  const [coverUrl, setCoverUrl] = useState(
    isRemoteMediaPath(post?.cover_path) ? (post?.cover_path ?? "") : "",
  );
  const [coverPreview, setCoverPreview] = useState<string | null>(mediaSrc(post?.cover_path));
  const [headJson, setHeadJson] = useState<Record<string, unknown> | unknown[] | null>(
    isJsonObjectOrArray(post?.head_json) ? post.head_json : null,
  );
  const [headJsonName, setHeadJsonName] = useState<string | null>(post?.head_json ? "Attached JSON" : null);
  const [uploading, setUploading] = useState(false);

  function onTitleChange(next: string) {
    setTitle(next);
    if (!slugTouched) setSlug(slugify(next));
  }

  function onSlugChange(next: string) {
    setSlugTouched(true);
    setSlug(next.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, ""));
  }

  function switchCoverMode(mode: CoverMode) {
    setCoverMode(mode);
    setErrors((e) => ({ ...e, coverPath: "" }));
  }

  function clearCover() {
    setCoverPath(null);
    setCoverUrl("");
    setCoverPreview(null);
    setErrors((e) => ({ ...e, coverPath: "" }));
  }

  async function onCover(file: File | null) {
    if (!file) return;
    const bad = checkFile(file);
    if (kindOf(file) !== "image") {
      setErrors({ coverPath: bad || "Cover must be an image." });
      return;
    }
    if (bad) {
      setErrors({ coverPath: bad });
      return;
    }
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) {
      setErrors({ form: "Please sign in again." });
      return;
    }
    setUploading(true);
    setErrors((e) => ({ ...e, coverPath: "" }));
    const path = `${userId}/${uid()}-${file.name.replace(/[^A-Za-z0-9._-]/g, "").slice(0, 80)}`;
    const { error } = await supabase.storage.from(RECIPE_BUCKET).upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    setUploading(false);
    if (error) {
      setErrors({ coverPath: error.message });
      return;
    }
    setCoverPath(path);
    setCoverUrl("");
    setCoverPreview(URL.createObjectURL(file));
  }

  function applyCoverUrl() {
    const next = coverUrl.trim();
    setErrors((e) => ({ ...e, coverPath: "" }));
    if (!next) {
      setCoverPath(null);
      setCoverPreview(null);
      return;
    }
    if (!next.startsWith("/") && !/^https?:\/\//i.test(next)) {
      setErrors({ coverPath: "URL must start with https://, http://, or /" });
      return;
    }
    setCoverPath(null);
    setCoverPreview(next);
  }

  async function onHeadJson(file: File | null) {
    if (!file) return;
    setErrors((e) => ({ ...e, headJson: "" }));
    if (file.size > MAX_HEAD_JSON_BYTES) {
      setErrors({ headJson: "Keep the JSON file under 100 KB." });
      return;
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith(".json") && file.type !== "application/json" && file.type !== "text/json") {
      setErrors({ headJson: "Upload a .json file." });
      return;
    }
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      if (!isJsonObjectOrArray(parsed)) {
        setErrors({ headJson: "JSON must be an object or an array." });
        return;
      }
      setHeadJson(parsed);
      setHeadJsonName(file.name);
    } catch {
      setErrors({ headJson: "That file isn't valid JSON." });
    }
  }

  function clearHeadJson() {
    setHeadJson(null);
    setHeadJsonName(null);
  }

  function resolvedCoverPath(): string | null {
    if (coverMode === "url") {
      const next = coverUrl.trim();
      return next || null;
    }
    return coverPath;
  }

  function submit(intent: "draft" | "publish") {
    setErrors({});
    const nextCover = resolvedCoverPath();
    if (coverMode === "url" && nextCover && !nextCover.startsWith("/") && !/^https?:\/\//i.test(nextCover)) {
      setErrors({ coverPath: "URL must start with https://, http://, or /" });
      return;
    }
    const publishedAt = easternDatetimeLocalToIso(publishedAtLocal);
    if (!publishedAt) {
      setErrors({ publishedAt: "Pick a valid publish date and time." });
      return;
    }
    startTransition(async () => {
      const result = await savePost(
        {
          seoTitle,
          metaDescription,
          slug,
          title,
          excerpt,
          body,
          coverPath: nextCover,
          headJson,
          publishedAt,
          intent,
        },
        post?.id,
      );
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      router.push(result.status === "published" ? `/blog/${result.slug}` : "/admin/posts");
      router.refresh();
    });
  }

  function onDelete() {
    if (!post || !confirm("Delete this post permanently?")) return;
    startTransition(async () => {
      const result = await deletePost(post.id);
      if (!result.ok) {
        setErrors({ form: result.error });
        return;
      }
      router.push("/admin/posts");
      router.refresh();
    });
  }

  return (
    <form className="panel stack" onSubmit={(e) => { e.preventDefault(); submit("publish"); }} noValidate>
      <div className="f">
        <label htmlFor="post-seo-title">SEO title</label>
        <input
          id="post-seo-title"
          className="field"
          value={seoTitle}
          onChange={(e) => setSeoTitle(e.target.value)}
          aria-invalid={!!errors.seoTitle}
          maxLength={70}
        />
        <p className="hint">Used in the browser tab and search results. Leave blank to use the post title.</p>
        {errors.seoTitle && <p className="f-err">{errors.seoTitle}</p>}
      </div>
      <div className="f">
        <label htmlFor="post-meta-description">Meta description</label>
        <textarea
          id="post-meta-description"
          className="field"
          rows={2}
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          aria-invalid={!!errors.metaDescription}
          maxLength={160}
        />
        <p className="hint">Search-result snippet. Leave blank to use the excerpt.</p>
        {errors.metaDescription && <p className="f-err">{errors.metaDescription}</p>}
      </div>
      <div className="f">
        <label htmlFor="post-slug">URL slug</label>
        <input
          id="post-slug"
          className="field"
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          aria-invalid={!!errors.slug}
          placeholder="my-blog-post"
          autoComplete="off"
          spellCheck={false}
        />
        <p className="hint">
          Appears in <code>/blog/{slug || "your-slug"}</code>. Auto-fills from the title until you edit it.
        </p>
        {errors.slug && <p className="f-err">{errors.slug}</p>}
      </div>
      <div className="f">
        <label htmlFor="post-title">Title</label>
        <input id="post-title" className="field" value={title} onChange={(e) => onTitleChange(e.target.value)} aria-invalid={!!errors.title} />
        {errors.title && <p className="f-err">{errors.title}</p>}
      </div>
      <div className="f">
        <label htmlFor="post-excerpt">Excerpt</label>
        <textarea id="post-excerpt" className="field" rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} aria-invalid={!!errors.excerpt} />
        {errors.excerpt && <p className="f-err">{errors.excerpt}</p>}
      </div>
      <div className="f">
        <label htmlFor="post-body">Body</label>
        <PostBodyEditor value={body} onChange={setBody} invalid={!!errors.body} />
        <p className="hint">Switch between Visual and Code to edit formatted content or raw HTML.</p>
        {errors.body && <p className="f-err">{errors.body}</p>}
      </div>
      <div className="f">
        <span id="post-cover-label">Cover image</span>
        <div className="row-actions" style={{ justifyContent: "flex-start" }} role="group" aria-labelledby="post-cover-label">
          <button
            type="button"
            className={`btn small${coverMode === "upload" ? "" : " ghost"}`}
            aria-pressed={coverMode === "upload"}
            onClick={() => switchCoverMode("upload")}
          >
            Upload file
          </button>
          <button
            type="button"
            className={`btn small${coverMode === "url" ? "" : " ghost"}`}
            aria-pressed={coverMode === "url"}
            onClick={() => switchCoverMode("url")}
          >
            Paste URL
          </button>
        </div>
        {coverMode === "upload" ? (
          <input
            id="post-cover"
            className="post-cover-input"
            type="file"
            accept="image/*"
            aria-labelledby="post-cover-label"
            onChange={(e) => void onCover(e.target.files?.[0] ?? null)}
          />
        ) : (
          <div className="row-actions post-cover-input" style={{ justifyContent: "flex-start", width: "100%" }}>
            <input
              id="post-cover-url"
              className="field"
              type="text"
              inputMode="url"
              placeholder="https://example.com/cover.jpg"
              value={coverUrl}
              aria-labelledby="post-cover-label"
              onChange={(e) => setCoverUrl(e.target.value)}
              onBlur={applyCoverUrl}
            />
            <button type="button" className="btn small ghost" onClick={applyCoverUrl}>
              Preview
            </button>
          </div>
        )}
        {coverPreview && (
          <div className="post-cover-preview">
            <Image src={coverPreview} alt="" width={480} height={270} unoptimized />
            <button type="button" className="linkbtn" onClick={clearCover}>Remove cover</button>
          </div>
        )}
        {errors.coverPath && <p className="f-err">{errors.coverPath}</p>}
      </div>
      <div className="f">
        <label htmlFor="post-published-at">Publish date</label>
        <input
          id="post-published-at"
          className="field"
          type="datetime-local"
          value={publishedAtLocal}
          onChange={(e) => setPublishedAtLocal(e.target.value)}
          aria-invalid={!!errors.publishedAt}
        />
        <p className="hint">Eastern Time (ET). Shown as the article date on the blog.</p>
        {errors.publishedAt && <p className="f-err">{errors.publishedAt}</p>}
      </div>
      <div className="f">
        <label htmlFor="post-head-json">Head JSON (optional)</label>
        <p className="hint">
          Upload a <code>.json</code> file to inject into the blog post&apos;s document head
          (for example JSON-LD structured data).
        </p>
        {headJson ? (
          <div className="row-actions" style={{ justifyContent: "flex-start" }}>
            <p className="hint" style={{ margin: 0 }}>
              Attached{headJsonName ? `: ${headJsonName}` : ""} — will be injected into the post head.
            </p>
            <button type="button" className="linkbtn" onClick={clearHeadJson}>Remove</button>
          </div>
        ) : (
          <input
            id="post-head-json"
            type="file"
            accept=".json,application/json"
            onChange={(e) => void onHeadJson(e.target.files?.[0] ?? null)}
          />
        )}
        {errors.headJson && <p className="f-err">{errors.headJson}</p>}
      </div>
      {errors.form && <p className="f-err" role="alert">{errors.form}</p>}
      <div className="row-actions">
        <button type="submit" className="btn" disabled={pending || uploading}>{pending ? "Saving…" : "Publish"}</button>
        <button type="button" className="btn ghost" disabled={pending || uploading} onClick={() => submit("draft")}>Save draft</button>
        {post && <button type="button" className="btn danger" disabled={pending} onClick={onDelete}>Delete</button>}
      </div>
    </form>
  );
}

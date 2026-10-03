"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markSocialPosted, markSocialSkipped, updateSocialCaption } from "@/actions/social-queue";

export interface SocialQueueItem {
  id: string;
  kind: "recipe" | "post";
  title: string;
  caption: string;
  url: string;
  status: "pending" | "posted" | "skipped";
  platforms: string[];
  createdAt: string;
  postedAt: string | null;
  imageSrc: string | null;
}

export function SocialQueueList({ items }: { items: SocialQueueItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [captions, setCaptions] = useState(() => Object.fromEntries(items.map((item) => [item.id, item.caption])));
  const [copied, setCopied] = useState<string | null>(null);

  async function copyText(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((current) => (current === id ? null : current)), 1600);
    } catch {
      window.prompt("Copy this:", text);
    }
  }

  function saveCaption(id: string) {
    startTransition(async () => {
      const result = await updateSocialCaption(id, captions[id] ?? "");
      if (!result.ok) alert(result.error);
      router.refresh();
    });
  }

  function markPosted(id: string) {
    startTransition(async () => {
      const result = await markSocialPosted(id);
      if (!result.ok) alert(result.error);
      router.refresh();
    });
  }

  function skip(id: string) {
    startTransition(async () => {
      const result = await markSocialSkipped(id);
      if (!result.ok) alert(result.error);
      router.refresh();
    });
  }

  if (!items.length) {
    return <div className="empty"><p>No social posts in the queue yet.</p></div>;
  }

  return (
    <div className="social-queue">
      {items.map((item) => {
        const caption = captions[item.id] ?? item.caption;
        const copyCaptionId = `${item.id}:caption`;
        const copyLinkId = `${item.id}:link`;
        return (
          <article key={item.id} className={`social-card s-${item.status}`}>
            <div className="social-card-main">
              {item.imageSrc ? (
                <div className="social-card-thumb">
                  <Image src={item.imageSrc} alt="" width={220} height={160} unoptimized />
                </div>
              ) : (
                <div className="social-card-thumb is-empty" aria-hidden="true" />
              )}
              <div className="social-card-copy">
                <div className="social-card-kicker">
                  <span className={`status s-${item.status}`}>{item.status}</span>
                  <span>{item.kind === "recipe" ? "Recipe" : "Blog post"}</span>
                  <span>{item.platforms.map((p) => (p === "instagram" ? "Instagram" : "Facebook")).join(" + ")}</span>
                </div>
                <h3>{item.title}</h3>
                <Link href={item.url} target="_blank" rel="noopener noreferrer">
                  {item.url}
                </Link>
              </div>
            </div>

            <label className="social-caption">
              <span>Caption</span>
              <textarea
                className="field"
                rows={7}
                value={caption}
                disabled={pending || item.status !== "pending"}
                onChange={(event) => setCaptions((current) => ({ ...current, [item.id]: event.target.value }))}
              />
            </label>

            <div className="social-actions">
              <button type="button" className="btn small ghost" onClick={() => copyText(copyCaptionId, caption)}>
                {copied === copyCaptionId ? "Copied" : "Copy caption"}
              </button>
              <button type="button" className="btn small ghost" onClick={() => copyText(copyLinkId, item.url)}>
                {copied === copyLinkId ? "Copied" : "Copy link"}
              </button>
              {item.status === "pending" ? (
                <>
                  <button type="button" className="btn small ghost" disabled={pending} onClick={() => saveCaption(item.id)}>
                    Save caption
                  </button>
                  <button type="button" className="btn small" disabled={pending} onClick={() => markPosted(item.id)}>
                    Mark posted
                  </button>
                  <button type="button" className="btn small ghost" disabled={pending} onClick={() => skip(item.id)}>
                    Skip
                  </button>
                </>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { mediaSrc } from "@/lib/media";
import { SocialQueueList, type SocialQueueItem } from "@/components/SocialQueueList";

export const metadata: Metadata = { title: "Admin · Social queue" };

interface SocialQueueRow {
  id: string;
  kind: "recipe" | "post";
  title: string;
  caption: string;
  url: string;
  status: "pending" | "posted" | "skipped";
  platforms: string[];
  created_at: string;
  posted_at: string | null;
  cover_path: string | null;
}

export default async function AdminSocialPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("social_queue")
    .select("id, kind, title, caption, url, status, platforms, created_at, posted_at, cover_path")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(60);

  const items: SocialQueueItem[] = ((data as SocialQueueRow[] | null) ?? []).map((item) => ({
    id: item.id,
    kind: item.kind,
    title: item.title,
    caption: item.caption,
    url: item.url,
    status: item.status,
    platforms: item.platforms,
    createdAt: item.created_at,
    postedAt: item.posted_at,
    imageSrc: mediaSrc(item.cover_path),
  }));

  return (
    <>
      <div className="sec-head">
        <div>
          <h2>Social queue</h2>
          <p>
            Drafts for Facebook and Instagram. Copy the caption and link, post manually, then mark each item posted or skipped.
          </p>
        </div>
      </div>
      {error ? (
        <div className="empty"><p>Could not load the social queue: {error.message}</p></div>
      ) : (
        <SocialQueueList items={items} />
      )}
    </>
  );
}

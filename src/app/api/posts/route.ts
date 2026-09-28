import { NextResponse } from "next/server";
import { countPosts, listPosts } from "@/lib/queries";

export const PAGE_SIZE = 12;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const limit = Math.min(PAGE_SIZE, Math.max(1, Number(url.searchParams.get("limit")) || PAGE_SIZE));

  const [posts, total] = await Promise.all([
    listPosts({ publishedOnly: true, limit, offset }),
    countPosts({ publishedOnly: true }),
  ]);

  return NextResponse.json({
    posts,
    total,
    offset,
    hasMore: offset + posts.length < total,
  });
}

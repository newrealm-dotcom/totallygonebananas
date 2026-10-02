import { NextResponse } from "next/server";
import { countPosts, listPosts } from "@/lib/queries";

export const PAGE_SIZE = 12;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const limit = Math.min(PAGE_SIZE, Math.max(1, Number(url.searchParams.get("limit")) || PAGE_SIZE));
  const author = url.searchParams.get("author")?.trim() || undefined;
  const category = url.searchParams.get("category")?.trim() || undefined;
  const date = url.searchParams.get("date")?.trim() || undefined;
  const tag = url.searchParams.get("tag")?.trim() || undefined;
  const excludeCategory = url.searchParams.get("excludeCategory")?.trim() || undefined;

  const filters = { publishedOnly: true as const, author, category, date, tag, excludeCategory };
  const [posts, total] = await Promise.all([
    listPosts({ ...filters, limit, offset }),
    countPosts(filters),
  ]);

  return NextResponse.json({
    posts,
    total,
    offset,
    hasMore: offset + posts.length < total,
  });
}

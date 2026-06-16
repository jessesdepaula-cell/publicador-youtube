import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enqueuePost, listPosts } from "@/lib/tiktok";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  caption: z.string().min(1).max(2200),
  videoUrl: z.string().url(),
  publishAt: z.string(),
});

export async function GET() {
  return NextResponse.json({ posts: await listPosts() });
}

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const p = await enqueuePost({ ...body, publishAt: new Date(body.publishAt).toISOString() });
    return NextResponse.json(p);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 400 });
  }
}

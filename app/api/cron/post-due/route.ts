import { NextRequest, NextResponse } from "next/server";
import { dueposts, postNow, updatePost } from "@/lib/tiktok";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Vercel cron envia Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const due = await dueposts();
  const results: { id: string; ok: boolean; error?: string; publishId?: string }[] = [];
  for (const p of due) {
    try {
      const r = await postNow(p);
      await updatePost(p.id, { status: "posted", postedAt: new Date().toISOString(), publishId: r.publishId });
      results.push({ id: p.id, ok: true, publishId: r.publishId });
    } catch (e: any) {
      await updatePost(p.id, { status: "failed", error: e?.message ?? String(e) });
      results.push({ id: p.id, ok: false, error: e?.message ?? String(e) });
    }
  }
  return NextResponse.json({ processed: results.length, results });
}

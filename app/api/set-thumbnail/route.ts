import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setThumbnail } from "@/lib/youtube";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  channel: z.enum(["1", "2", "3"]),
  videoId: z.string().min(1),
  thumbnailBase64: z.string().min(100),
});

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    await setThumbnail(body.channel, body.videoId, Buffer.from(body.thumbnailBase64, "base64"));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 400 });
  }
}

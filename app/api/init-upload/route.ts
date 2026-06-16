import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { initResumableUpload } from "@/lib/youtube";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  channel: z.enum(["1", "2", "3"]),
  title: z.string().min(1),
  description: z.string(),
  tags: z.array(z.string()),
  publishAt: z.string(),
  videoSize: z.number().positive(),
  videoMime: z.string().min(3),
});

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const r = await initResumableUpload(body);
    return NextResponse.json(r);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateThumbnail } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({
  topic: z.string().min(2).max(2000),
  title: z.string().min(1),
  niche: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const buf = await generateThumbnail(body);
    return NextResponse.json({ imageBase64: buf.toString("base64") });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 400 });
  }
}

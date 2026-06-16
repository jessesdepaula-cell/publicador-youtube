import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateMetadata } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  topic: z.string().min(2).max(2000),
  niche: z.string().optional(),
  channelName: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const data = await generateMetadata(body);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 400 });
  }
}

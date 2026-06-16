import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { initFileUpload } from "@/lib/tiktok";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({ videoSize: z.number().positive() });

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const r = await initFileUpload(body);
    return NextResponse.json(r);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 400 });
  }
}

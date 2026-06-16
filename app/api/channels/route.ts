import { NextResponse } from "next/server";
import { listChannels } from "@/lib/channels";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ channels: listChannels() });
}

import { NextResponse } from "next/server";
import { authUrl } from "@/lib/tiktok";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const state = crypto.randomUUID();
  return NextResponse.redirect(authUrl(state));
}

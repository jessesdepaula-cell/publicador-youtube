import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/tiktok";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "sem code" }, { status: 400 });
  try {
    const tokens = await exchangeCodeForToken(code);
    return new NextResponse(
      `<html><body style="font-family:system-ui;background:#0a0a0b;color:#ededed;padding:40px;max-width:700px;margin:0 auto;">
        <h1>TikTok conectado</h1>
        <p>Cole estes valores nas Environment Variables da Vercel:</p>
        <pre style="background:#15151a;padding:16px;border-radius:8px;overflow:auto;border:1px solid #26262d;">TIKTOK_REFRESH_TOKEN=${tokens.refresh_token}
TIKTOK_OPEN_ID=${tokens.open_id}</pre>
        <p style="color:#888;font-size:13px;">scope: ${tokens.scope}</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF nao enviado" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `PDF passa do limite (20 MB). Tem ${(file.size / 1024 / 1024).toFixed(1)} MB.` },
        { status: 413 },
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buf);
    const text = (parsed.text || "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!text) {
      return NextResponse.json({ error: "Nao consegui extrair texto desse PDF (talvez seja escaneado/imagem)." }, { status: 400 });
    }
    return NextResponse.json({ text, pages: parsed.numpages, chars: text.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 400 });
  }
}

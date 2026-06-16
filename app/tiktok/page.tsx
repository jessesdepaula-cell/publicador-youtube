"use client";

import { useEffect, useState } from "react";

interface Post {
  id: string; caption: string; publishAt: string; status: string;
  postedAt?: string; publishId?: string; error?: string;
}

export default function TikTokPage() {
  const [video, setVideo] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(18, 0, 0, 0);
    setPublishAt(d.toISOString().slice(0, 16));
    loadPosts();
  }, []);

  const say = (s: string) => setLog((l) => [...l, `[${new Date().toLocaleTimeString()}] ${s}`]);
  async function loadPosts() { const r = await fetch("/api/tiktok/schedule"); const d = await r.json(); setPosts(d.posts || []); }

  async function uploadNow() {
    if (!video) return;
    setBusy("Enviando para o inbox do TikTok...");
    try {
      const init = await fetch("/api/tiktok/init-upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoSize: video.size }),
      });
      const d = await init.json();
      if (!init.ok) throw new Error(d.error);
      say(`Upload URL obtida (publish_id ${d.publishId}). Enviando bytes...`);
      const up = await fetch(d.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "video/mp4", "Content-Range": `bytes 0-${video.size - 1}/${video.size}` },
        body: video,
      });
      if (!up.ok) throw new Error(`Upload falhou: ${up.status} ${await up.text()}`);
      say(`Video enviado para o inbox do TikTok. Abra o app TikTok > Inbox para finalizar com a legenda.`);
    } catch (e: any) { say("ERRO: " + e.message); }
    finally { setBusy(null); }
  }

  async function schedulePullUrl() {
    if (!caption || !publishAt) return;
    setBusy("Agendando post via URL...");
    try {
      const r = await fetch("/api/tiktok/schedule", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption, videoUrl: prompt("URL publica do video MP4:") || "", publishAt: new Date(publishAt).toISOString() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      say(`Agendado para ${publishAt}. ID ${d.id}`);
      await loadPosts();
    } catch (e: any) { say("ERRO: " + e.message); }
    finally { setBusy(null); }
  }

  return (
    <main className="max-w-5xl mx-auto p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Publicador TikTok</h1>
          <p className="text-neutral-400">@vencendo.todo.dia8 - upload + agendamento via Content Posting API</p>
        </div>
        <a href="/" className="btn btn-ghost">← YouTube</a>
      </header>

      <div className="card mb-6 bg-amber-500/10 border-amber-500/30">
        <p className="text-amber-200 text-sm">
          <strong>2 modos disponiveis:</strong>
        </p>
        <ul className="text-amber-100/80 text-sm list-disc pl-5 mt-2 space-y-1">
          <li><strong>Upload pro inbox</strong> (sandbox/sem audit): manda o video pro inbox do TikTok, voce abre o app e finaliza com a legenda. Funciona desde o dia 1.</li>
          <li><strong>Agendamento via URL</strong> (precisa Direct Post aprovado E URL publica do video): o cron posta na hora marcada com a legenda ja preenchida.</li>
        </ul>
      </div>

      <section className="card mb-6">
        <label className="label">Video</label>
        <input type="file" accept="video/mp4" onChange={(e) => setVideo(e.target.files?.[0] || null)} className="input" />
        {video && <div className="text-xs text-neutral-400 mt-2">{video.name} - {(video.size / 1024 / 1024).toFixed(1)} MB</div>}
        <div className="mt-4 flex gap-3">
          <button onClick={uploadNow} disabled={!video || !!busy} className="btn btn-primary">
            Enviar pro inbox TikTok agora
          </button>
        </div>
      </section>

      <section className="card mb-6">
        <label className="label">Legenda</label>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4}
          maxLength={2200} placeholder="Cole sua legenda com hashtags. Max 2200 chars."
          className="input mb-3" />
        <label className="label">Data/hora de publicacao</label>
        <input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} className="input mb-3 max-w-xs" />
        <button onClick={schedulePullUrl} disabled={!caption || !publishAt || !!busy} className="btn btn-primary">
          Agendar publicacao (precisa Direct Post + URL publica)
        </button>
      </section>

      {posts.length > 0 && (
        <section className="card mb-6">
          <label className="label">Fila</label>
          <div className="space-y-2">
            {posts.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-bg rounded border border-border">
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{p.caption.slice(0, 80)}</div>
                  <div className="text-xs text-neutral-500">{new Date(p.publishAt).toLocaleString()}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${p.status === "posted" ? "bg-emerald-500/20 text-emerald-300" : p.status === "failed" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"}`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {(busy || log.length > 0) && (
        <section className="card">
          {busy && <div className="text-amber-300 mb-2 text-sm">{busy}</div>}
          <pre className="text-xs text-neutral-400 whitespace-pre-wrap">{log.join("\n")}</pre>
        </section>
      )}
    </main>
  );
}

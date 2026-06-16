"use client";

import { useEffect, useState } from "react";

type Channel = { key: "1" | "2" | "3"; name: string; configured: boolean };

export default function Page() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channel, setChannel] = useState<Channel["key"]>("1");
  const [video, setVideo] = useState<File | null>(null);
  const [topic, setTopic] = useState("");
  const [niche, setNiche] = useState("");
  const [meta, setMeta] = useState<{ title: string; description: string; tags: string[] } | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [publishAt, setPublishAt] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [script, setScript] = useState<string>("");
  const [scriptFile, setScriptFile] = useState<File | null>(null);

  useEffect(() => {
    fetch("/api/channels").then((r) => r.json()).then((d) => setChannels(d.channels));
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(12, 0, 0, 0);
    setPublishAt(d.toISOString().slice(0, 16));
  }, []);

  const channelObj = channels.find((c) => c.key === channel);
  const say = (s: string) => setLog((l) => [...l, `[${new Date().toLocaleTimeString()}] ${s}`]);

  async function extractScript(file: File) {
    setScriptFile(file);
    setBusy("Extraindo texto do PDF...");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/extract-pdf", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setScript(d.text || "");
      say(`Roteiro extraido: ${d.pages} pagina(s), ${d.chars} chars`);
    } catch (e: any) { say("ERRO: " + e.message); setScript(""); }
    finally { setBusy(null); }
  }

  async function genMeta() {
    if ((!topic && !script) || !channelObj) return;
    setBusy("Gerando metadados...");
    try {
      const r = await fetch("/api/generate-metadata", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic || "(veja roteiro anexado)",
          niche,
          channelName: channelObj.name,
          transcript: script || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMeta(d); say(script ? "Metadados gerados (com roteiro do PDF)" : "Metadados gerados");
    } catch (e: any) { say("ERRO: " + e.message); }
    finally { setBusy(null); }
  }

  async function genThumb() {
    if (!meta || !topic) return;
    setBusy("Gerando thumbnail (~20s)...");
    try {
      const r = await fetch("/api/generate-thumbnail", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, title: meta.title, niche }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setThumb(d.imageBase64); say("Thumbnail gerada");
    } catch (e: any) { say("ERRO: " + e.message); }
    finally { setBusy(null); }
  }

  async function schedule() {
    if (!video || !meta || !thumb || !publishAt) return;
    setBusy("Iniciando upload...");
    try {
      const init = await fetch("/api/init-upload", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel, title: meta.title, description: meta.description, tags: meta.tags,
          publishAt: new Date(publishAt).toISOString(),
          videoSize: video.size, videoMime: video.type || "video/mp4",
        }),
      });
      const d = await init.json();
      if (!init.ok) throw new Error(d.error);
      say("URL de upload obtida. Enviando bytes diretamente para o YouTube...");
      setBusy("Enviando video para o YouTube...");

      const up = await fetch(d.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": video.type || "video/mp4", "Content-Length": String(video.size) },
        body: video,
      });
      if (!up.ok) throw new Error(`Upload falhou: ${up.status} ${await up.text()}`);
      const result = await up.json();
      const vid = result.id;
      setVideoId(vid);
      say(`Video criado: ${vid}. Setando thumbnail...`);

      setBusy("Setando thumbnail...");
      const tr = await fetch("/api/set-thumbnail", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, videoId: vid, thumbnailBase64: thumb }),
      });
      const td = await tr.json();
      if (!tr.ok) throw new Error(td.error);
      say(`PRONTO! Video agendado: https://studio.youtube.com/video/${vid}/edit`);
    } catch (e: any) { say("ERRO: " + e.message); }
    finally { setBusy(null); }
  }

  return (
    <main className="max-w-5xl mx-auto p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Publicador YouTube</h1>
          <p className="text-neutral-400">Upload de video + IA pra thumb/titulo/descricao/tags + agendamento nos 3 canais</p>
        </div>
        <div className="flex gap-2">
          <a href="/historico" className="btn btn-ghost">Historico</a>
          <a href="/tiktok" className="btn btn-ghost">TikTok →</a>
        </div>
      </header>

      <section className="card mb-6">
        <label className="label">1. Canal</label>
        <div className="grid grid-cols-3 gap-3">
          {channels.map((c) => (
            <button key={c.key} onClick={() => setChannel(c.key)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${channel === c.key ? "border-accent bg-accent/10" : "border-border bg-bg hover:border-neutral-500"}`}>
              <div className="font-medium">{c.name}</div>
              <div className={`text-xs mt-1 ${c.configured ? "text-emerald-400" : "text-amber-400"}`}>
                {c.configured ? "configurado" : "sem refresh token"}
              </div>
            </button>
          ))}
          {channels.length === 0 && <div className="col-span-3 text-neutral-500 text-sm">Carregando...</div>}
        </div>
      </section>

      <section className="card mb-6">
        <label className="label">2. Video</label>
        <input type="file" accept="video/*" onChange={(e) => setVideo(e.target.files?.[0] || null)} className="input" />
        {video && <div className="text-xs text-neutral-400 mt-2">{video.name} - {(video.size / 1024 / 1024).toFixed(1)} MB</div>}
      </section>

      <section className="card mb-6">
        <label className="label">3. Roteiro em PDF (opcional, base para a IA)</label>
        <p className="text-xs text-neutral-500 mb-2">Anexa o PDF com o texto falado no video. A IA usa como fonte principal pra gerar titulo, descricao e tags.</p>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            if (f) extractScript(f); else { setScriptFile(null); setScript(""); }
          }}
          className="input"
        />
        {scriptFile && <div className="text-xs text-neutral-400 mt-2">{scriptFile.name} - {(scriptFile.size / 1024 / 1024).toFixed(2)} MB</div>}
        {script && (
          <details className="mt-3">
            <summary className="text-xs text-emerald-400 cursor-pointer">Texto extraido ({script.length} chars) - clique para ver/editar</summary>
            <textarea value={script} onChange={(e) => setScript(e.target.value)} rows={8} className="input mt-2 text-xs" />
          </details>
        )}
      </section>

      <section className="card mb-6">
        <label className="label">4. Assunto / contexto extra (opcional se enviou PDF)</label>
        <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={3}
          placeholder="Ex: video de motivacao matinal sobre disciplina e habitos de pessoas bem sucedidas"
          className="input mb-3" />
        <input value={niche} onChange={(e) => setNiche(e.target.value)}
          placeholder="Nicho/estilo (opcional): ex: motivacao raiz, viral curto, educativo profundo"
          className="input mb-3" />
        <button onClick={genMeta} disabled={(!topic && !script) || !!busy} className="btn btn-primary">Gerar metadados</button>
      </section>

      {meta && (
        <section className="card mb-6">
          <label className="label">5. Metadados (edite se quiser)</label>
          <input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} className="input mb-2" placeholder="Titulo" />
          <textarea value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} rows={6} className="input mb-2" placeholder="Descricao" />
          <input value={meta.tags.join(", ")} onChange={(e) => setMeta({ ...meta, tags: e.target.value.split(",").map((s) => s.trim()) })} className="input mb-3" placeholder="Tags separadas por virgula" />
          <button onClick={genThumb} disabled={!!busy} className="btn btn-primary">Gerar thumbnail</button>
        </section>
      )}

      {thumb && (
        <section className="card mb-6">
          <label className="label">6. Thumbnail</label>
          <img src={`data:image/png;base64,${thumb}`} alt="thumb" className="rounded-lg max-w-md mb-3" />
          <button onClick={genThumb} disabled={!!busy} className="btn btn-ghost mr-2">Regerar</button>
        </section>
      )}

      {meta && (
        <section className="card mb-6">
          <label className="label">7. Agendamento</label>
          <input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} className="input mb-3 max-w-xs" />
          <button onClick={schedule} disabled={!video || !thumb || !publishAt || !!busy || !channelObj?.configured} className="btn btn-primary">
            Agendar publicacao
          </button>
          {!channelObj?.configured && <p className="text-amber-400 text-xs mt-2">Configure o refresh token desse canal antes de agendar</p>}
        </section>
      )}

      {(busy || log.length > 0) && (
        <section className="card">
          <label className="label">Log</label>
          {busy && <div className="text-amber-300 mb-2 text-sm">{busy}</div>}
          <pre className="text-xs text-neutral-400 whitespace-pre-wrap">{log.join("\n")}</pre>
          {videoId && <a href={`https://studio.youtube.com/video/${videoId}/edit`} target="_blank" className="text-accent underline text-sm mt-2 block">Abrir no YouTube Studio</a>}
        </section>
      )}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";

type Channel = { key: "1" | "2" | "3"; name: string; configured: boolean };
type Item = {
  id: string;
  title: string;
  publishedAt: string;
  scheduledAt: string | null;
  privacyStatus: string;
  views: string;
  thumbnail: string;
  url: string;
};

export default function HistoricoPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channel, setChannel] = useState<Channel["key"]>("1");
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/channels").then((r) => r.json()).then((d) => setChannels(d.channels));
  }, []);

  useEffect(() => {
    const c = channels.find((x) => x.key === channel);
    if (!c?.configured) { setItems([]); setError(null); return; }
    setBusy(true); setError(null);
    fetch(`/api/history?channel=${channel}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); setItems([]); }
        else setItems(d.items || []);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setBusy(false));
  }, [channel, channels]);

  const channelObj = channels.find((c) => c.key === channel);

  function fmtDate(s: string) {
    if (!s) return "-";
    try { return new Date(s).toLocaleString("pt-BR"); } catch { return s; }
  }

  function badge(privacy: string, scheduledAt: string | null) {
    if (scheduledAt && new Date(scheduledAt) > new Date()) {
      return <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">agendado</span>;
    }
    if (privacy === "public") return <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">publico</span>;
    if (privacy === "private") return <span className="text-xs px-2 py-0.5 rounded bg-neutral-500/20 text-neutral-300">privado</span>;
    if (privacy === "unlisted") return <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">nao listado</span>;
    return <span className="text-xs px-2 py-0.5 rounded bg-neutral-700 text-neutral-400">{privacy}</span>;
  }

  return (
    <main className="max-w-5xl mx-auto p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Historico</h1>
          <p className="text-neutral-400">Ultimos 25 videos por canal (publicados e agendados)</p>
        </div>
        <a href="/" className="btn btn-ghost">← Publicar</a>
      </header>

      <section className="card mb-6">
        <label className="label">Canal</label>
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

      {!channelObj?.configured && (
        <p className="text-amber-400 text-sm mb-6">Configure o refresh token desse canal para ver o historico.</p>
      )}
      {busy && <p className="text-neutral-400 text-sm mb-4">Carregando historico...</p>}
      {error && <p className="text-red-400 text-sm mb-4">Erro: {error}</p>}

      {!busy && channelObj?.configured && items.length === 0 && !error && (
        <p className="text-neutral-500 text-sm">Nenhum video encontrado nesse canal.</p>
      )}

      <ul className="space-y-3">
        {items.map((v) => (
          <li key={v.id} className="card flex gap-4">
            {v.thumbnail && (
              <img src={v.thumbnail} alt="" className="w-40 h-auto rounded shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium text-sm leading-tight">{v.title}</h3>
                {badge(v.privacyStatus, v.scheduledAt)}
              </div>
              <div className="text-xs text-neutral-400 mt-2 space-y-1">
                {v.scheduledAt && new Date(v.scheduledAt) > new Date() ? (
                  <div>Agendado para: <span className="text-amber-300">{fmtDate(v.scheduledAt)}</span></div>
                ) : (
                  <div>Publicado em: {fmtDate(v.publishedAt)}</div>
                )}
                <div>Views: {v.views}</div>
              </div>
              <div className="mt-2 flex gap-3 text-xs">
                <a href={v.url} target="_blank" rel="noreferrer" className="text-accent underline">YouTube Studio</a>
                <a href={`https://youtu.be/${v.id}`} target="_blank" rel="noreferrer" className="text-accent underline">Abrir no YouTube</a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

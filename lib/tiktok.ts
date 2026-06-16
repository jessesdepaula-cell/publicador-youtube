import { redis } from "./redis";

const TT_BASE = "https://open.tiktokapis.com";
const TT_AUTH = "https://www.tiktok.com/v2/auth/authorize/";
const SCOPES = ["user.info.basic", "video.upload", "video.publish"].join(",");

function envOrThrow(k: string): string {
  const v = process.env[k];
  if (!v) throw new Error(`Env ${k} nao configurada`);
  return v;
}

export function authUrl(state: string): string {
  const u = new URL(TT_AUTH);
  u.searchParams.set("client_key", envOrThrow("TIKTOK_CLIENT_KEY"));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", SCOPES);
  u.searchParams.set("redirect_uri", envOrThrow("TIKTOK_REDIRECT_URI"));
  u.searchParams.set("state", state);
  return u.toString();
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  open_id: string;
  scope: string;
}

export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_key: envOrThrow("TIKTOK_CLIENT_KEY"),
    client_secret: envOrThrow("TIKTOK_CLIENT_SECRET"),
    code,
    grant_type: "authorization_code",
    redirect_uri: envOrThrow("TIKTOK_REDIRECT_URI"),
  });
  const r = await fetch(`${TT_BASE}/v2/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body,
  });
  if (!r.ok) throw new Error(`TikTok token exchange falhou: ${r.status} ${await r.text()}`);
  return (await r.json()) as TokenResponse;
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = envOrThrow("TIKTOK_REFRESH_TOKEN");
  const body = new URLSearchParams({
    client_key: envOrThrow("TIKTOK_CLIENT_KEY"),
    client_secret: envOrThrow("TIKTOK_CLIENT_SECRET"),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const r = await fetch(`${TT_BASE}/v2/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body,
  });
  if (!r.ok) throw new Error(`TikTok refresh falhou: ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.access_token;
}

export interface ScheduledPost {
  id: string;
  caption: string;
  /** Para PULL_FROM_URL: URL publica. Para FILE_UPLOAD agendado: nao usamos (post imediato). */
  videoUrl: string;
  publishAt: string;
  status: "pending" | "posted" | "failed";
  postedAt?: string;
  publishId?: string;
  error?: string;
}

export async function initFileUpload(args: { videoSize: number }): Promise<{
  uploadUrl: string;
  publishId: string;
}> {
  const accessToken = await refreshAccessToken();
  const chunkSize = args.videoSize;
  const r = await fetch(`${TT_BASE}/v2/post/publish/inbox/video/init/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      source_info: {
        source: "FILE_UPLOAD",
        video_size: args.videoSize,
        chunk_size: chunkSize,
        total_chunk_count: 1,
      },
    }),
  });
  if (!r.ok) throw new Error(`TikTok inbox init falhou: ${r.status} ${await r.text()}`);
  const data = await r.json();
  return { uploadUrl: data.data.upload_url, publishId: data.data.publish_id };
}

const QUEUE_KEY = "tiktok:queue";

export async function enqueuePost(p: Omit<ScheduledPost, "id" | "status">): Promise<ScheduledPost> {
  const post: ScheduledPost = { ...p, id: crypto.randomUUID(), status: "pending" };
  await redis().hset(QUEUE_KEY, { [post.id]: JSON.stringify(post) });
  return post;
}

export async function listPosts(): Promise<ScheduledPost[]> {
  const raw = (await redis().hgetall(QUEUE_KEY)) as Record<string, string> | null;
  if (!raw) return [];
  return Object.values(raw)
    .map((s) => (typeof s === "string" ? JSON.parse(s) : s))
    .sort((a, b) => a.publishAt.localeCompare(b.publishAt));
}

export async function updatePost(id: string, patch: Partial<ScheduledPost>) {
  const raw = (await redis().hget(QUEUE_KEY, id)) as string | null;
  if (!raw) return;
  const post: ScheduledPost = typeof raw === "string" ? JSON.parse(raw) : raw;
  const next = { ...post, ...patch };
  await redis().hset(QUEUE_KEY, { [id]: JSON.stringify(next) });
}

export async function dueposts(now: Date = new Date()): Promise<ScheduledPost[]> {
  const all = await listPosts();
  return all.filter((p) => p.status === "pending" && new Date(p.publishAt) <= now);
}

export async function postNow(p: ScheduledPost): Promise<{ publishId: string }> {
  const accessToken = await refreshAccessToken();

  const initRes = await fetch(`${TT_BASE}/v2/post/publish/video/init/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      post_info: {
        title: p.caption.slice(0, 2200),
        privacy_level: "SELF_ONLY",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: p.videoUrl,
      },
    }),
  });

  if (!initRes.ok) throw new Error(`TikTok init falhou: ${initRes.status} ${await initRes.text()}`);
  const data = await initRes.json();
  const publishId = data.data?.publish_id;
  if (!publishId) throw new Error(`TikTok nao retornou publish_id: ${JSON.stringify(data)}`);
  return { publishId };
}

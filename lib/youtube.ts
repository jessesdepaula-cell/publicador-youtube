import { google } from "googleapis";
import { getChannel, type ChannelKey } from "./channels";

export function oauthClient(refreshToken?: string) {
  const c = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/callback/google",
  );
  if (refreshToken) c.setCredentials({ refresh_token: refreshToken });
  return c;
}

export function ytClient(channel: ChannelKey) {
  const { refreshToken } = getChannel(channel);
  return google.youtube({ version: "v3", auth: oauthClient(refreshToken) });
}

export async function initResumableUpload(args: {
  channel: ChannelKey;
  title: string;
  description: string;
  tags: string[];
  publishAt: string;
  videoSize: number;
  videoMime: string;
}): Promise<{ uploadUrl: string; accessToken: string }> {
  const auth = oauthClient(getChannel(args.channel).refreshToken);
  const { token } = await auth.getAccessToken();
  if (!token) throw new Error("Falha ao obter access_token");

  const body = {
    snippet: {
      title: args.title.slice(0, 100),
      description: args.description.slice(0, 5000),
      tags: args.tags.slice(0, 30),
      categoryId: "22",
    },
    status: {
      privacyStatus: "private",
      publishAt: args.publishAt,
      selfDeclaredMadeForKids: false,
    },
  };

  const res = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Length": String(args.videoSize),
        "X-Upload-Content-Type": args.videoMime,
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) throw new Error(`YouTube init failed: ${res.status} ${await res.text()}`);
  const uploadUrl = res.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube nao retornou Location header");
  return { uploadUrl, accessToken: token };
}

export async function setThumbnail(channel: ChannelKey, videoId: string, imageBuffer: Buffer, mime = "image/png") {
  const auth = oauthClient(getChannel(channel).refreshToken);
  const { token } = await auth.getAccessToken();
  const res = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": mime },
      body: new Uint8Array(imageBuffer),
    },
  );
  if (!res.ok) throw new Error(`Thumbnail set falhou: ${res.status} ${await res.text()}`);
}

import { NextRequest, NextResponse } from "next/server";
import { ytClient } from "@/lib/youtube";
import type { ChannelKey } from "@/lib/channels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const channel = req.nextUrl.searchParams.get("channel") as ChannelKey | null;
    if (!channel || !["1", "2", "3"].includes(channel)) {
      return NextResponse.json({ error: "channel invalido (1, 2 ou 3)" }, { status: 400 });
    }
    const yt = ytClient(channel);

    const ch = await yt.channels.list({ part: ["contentDetails", "snippet"], mine: true });
    const uploadsId = ch.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    const channelName = ch.data.items?.[0]?.snippet?.title || "";
    if (!uploadsId) return NextResponse.json({ error: "Playlist de uploads nao encontrada" }, { status: 404 });

    const pl = await yt.playlistItems.list({ part: ["snippet", "contentDetails"], playlistId: uploadsId, maxResults: 25 });
    const ids = (pl.data.items || []).map((i) => i.contentDetails?.videoId).filter(Boolean) as string[];

    const vids = ids.length
      ? await yt.videos.list({ part: ["snippet", "status", "statistics"], id: ids })
      : null;

    const items = (vids?.data.items || []).map((v) => ({
      id: v.id!,
      title: v.snippet?.title || "",
      publishedAt: v.snippet?.publishedAt || "",
      scheduledAt: v.status?.publishAt || null,
      privacyStatus: v.status?.privacyStatus || "",
      views: v.statistics?.viewCount || "0",
      thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url || "",
      url: `https://studio.youtube.com/video/${v.id}/edit`,
    }));

    return NextResponse.json({ channelName, items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 400 });
  }
}

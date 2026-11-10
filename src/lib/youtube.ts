import { XMLParser } from "fast-xml-parser";
import { getYoutubeAccessToken } from "@/lib/youtube-oauth";
import { sanitizeYoutubeSettings, youtubeChannelId, youtubeVideoId } from "@/lib/youtube-common";
import type { YoutubeSettings, YoutubeVideo } from "@/lib/types";

type YoutubeResult = { videos: YoutubeVideo[]; channelId?: string; channelTitle?: string; channelThumbnail?: string; subscriberCount?: string; viewCount?: string; videoCount?: string; source: string };
const cache = new Map<string, { expires: number; result: YoutubeResult }>();
const validId = (id: string) => /^[\w-]{11}$/.test(id);

function youtubeUrl(value: string) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || !(url.hostname === "youtu.be" || url.hostname === "youtube.com" || url.hostname.endsWith(".youtube.com"))) return null;
    return url;
  } catch { return null; }
}

function durationSeconds(value: string | undefined) {
  if (!value) return undefined;
  const match = value.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  return match ? Number(match[1] ?? 0) * 86400 + Number(match[2] ?? 0) * 3600 + Number(match[3] ?? 0) * 60 + Number(match[4] ?? 0) : undefined;
}

async function publicChannelListing(reference: string) {
  const endpoint = new URL("https://www.youtube.com");
  endpoint.pathname = reference.startsWith("UC") ? `/channel/${reference}/videos` : `/@${reference}/videos`;
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(8000), cache: "no-store", headers: { "Accept-Language": "en-US,en;q=0.8" } });
  if (!response.ok) throw new Error("YouTube’s public channel listing is unavailable right now.");
  const html = await response.text();
  if (html.length > 5000000) throw new Error("YouTube’s response was too large.");
  const match = html.match(/(?:var ytInitialData = |ytInitialData\s*=\s*)(\{[\s\S]*?\});\s*<\/script>/);
  if (!match) throw new Error("YouTube’s channel listing could not be read.");
  const data = JSON.parse(match[1]) as Record<string, unknown>;
  const metadata = ((data.metadata as Record<string, unknown> | undefined)?.channelMetadataRenderer ?? {}) as Record<string, unknown>;
  const channelId = typeof metadata.externalId === "string" && /^UC[\w-]{22}$/.test(metadata.externalId) ? metadata.externalId : undefined;
  const channelTitle = typeof metadata.title === "string" ? metadata.title.slice(0, 200) : undefined;
  const videos: YoutubeVideo[] = []; const seen = new Set<string>(); const stack: unknown[] = [data]; let visited = 0;
  while (stack.length && visited++ < 100000 && videos.length < 15) {
    const value = stack.pop(); if (!value || typeof value !== "object") continue;
    if (Array.isArray(value)) { for (let i = value.length - 1; i >= 0; i--) stack.push(value[i]); continue; }
    const object = value as Record<string, unknown>;
    const lockup = object.lockupViewModel as { contentId?: string; contentType?: string; metadata?: { lockupMetadataViewModel?: { title?: { content?: string } } } } | undefined;
    const classic = object.videoRenderer as { videoId?: string; title?: { runs?: { text?: string }[]; simpleText?: string } } | undefined;
    const id = lockup?.contentType === "LOCKUP_CONTENT_TYPE_VIDEO" ? lockup.contentId : classic?.videoId;
    const title = lockup?.metadata?.lockupMetadataViewModel?.title?.content ?? classic?.title?.runs?.map((run) => run.text ?? "").join("") ?? classic?.title?.simpleText;
    if (id && validId(id) && !seen.has(id)) { seen.add(id); videos.push({ id, title: (title || "YouTube video").slice(0, 200), thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` }); }
    for (const child of Object.values(object).reverse()) if (child && typeof child === "object") stack.push(child);
  }
  return { channelId, channelTitle, videos };
}

export async function resolveYoutube(value: string, input: YoutubeSettings | unknown, profileId?: string): Promise<YoutubeResult> {
  const settings = sanitizeYoutubeSettings(input);
  const url = youtubeUrl(value);
  if (!url) throw new Error("Enter a valid YouTube video, channel, or playlist URL.");
  const cacheKey = JSON.stringify([value, settings, profileId]);
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.result;
  if (settings.source === "SINGLE") {
    const id = youtubeVideoId(value);
    if (!id) throw new Error("Paste a YouTube video URL for a single video.");
    const result: YoutubeResult = { videos: [{ id, title: settings.videos?.find((video) => video.id === id)?.title || "YouTube video", thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` }], source: "video" };
    try {
      const endpoint = new URL("https://www.youtube.com/oembed"); endpoint.searchParams.set("url", `https://www.youtube.com/watch?v=${id}`); endpoint.searchParams.set("format", "json");
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(3500) });
      if (response.ok) { const data = await response.json() as { title?: string; author_name?: string }; result.videos[0].title = data.title?.slice(0, 200) || result.videos[0].title; result.channelTitle = data.author_name; }
    } catch { /* a single video still embeds without metadata */ }
    cache.set(cacheKey, { expires: Date.now() + 300000, result }); return result;
  }
  if (settings.filter === "PICKED") {
    if (!settings.videos?.length) throw new Error("Add at least one video URL to your hand-picked list.");
    return { videos: settings.videos, channelId: settings.channelId, source: "hand-picked" };
  }
  let token: string | null = null;
  if (profileId) { try { token = await getYoutubeAccessToken(profileId); } catch { /* public API or feed can still work */ } }
  const key = process.env.YOUTUBE_API_KEY;
  async function api(path: string, params: Record<string, string>) {
    const endpoint = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
    Object.entries(params).forEach(([name, val]) => endpoint.searchParams.set(name, val));
    if (!token && key) endpoint.searchParams.set("key", key);
    const response = await fetch(endpoint, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(7000), cache: "no-store" });
    if (!response.ok) throw new Error("YouTube couldn’t load this feed. Check the URL and your API access.");
    return response.json();
  }
  let channelId = settings.channelId ?? youtubeChannelId(value) ?? undefined;
  const handle = url.pathname.match(/^\/@([\w.-]+)/)?.[1];
  let channel: { id?: string; snippet?: { title?: string; thumbnails?: { default?: { url?: string }; medium?: { url?: string } } }; contentDetails?: { relatedPlaylists?: { uploads?: string } }; statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string } } | undefined;
  if ((token || key) && (channelId || handle)) {
    const result = await api("channels", { part: "snippet,contentDetails,statistics", ...(channelId ? { id: channelId } : { forHandle: handle! }) }) as { items?: typeof channel[] };
    channel = result.items?.[0]; channelId = channel?.id ?? channelId;
  }
  let fallback: Awaited<ReturnType<typeof publicChannelListing>> | undefined;
  let resolvedSource = token || key ? "YouTube Data API" : "public YouTube feed";
  if (!channelId && handle && !token && !key && settings.filter !== "PLAYLIST") {
    fallback = await publicChannelListing(handle);
    channelId = fallback.channelId;
    if (fallback.channelTitle) channel = { snippet: { title: fallback.channelTitle } };
  }
  if (!channelId && settings.filter !== "PLAYLIST") throw new Error("Use a YouTube channel URL or a valid @handle.");
  let videos: YoutubeVideo[] = [];
  const playlistFromUrl = url.searchParams.get("list") ?? undefined;
  const playlist = settings.filter === "PLAYLIST" ? settings.playlistId ?? playlistFromUrl : channel?.contentDetails?.relatedPlaylists?.uploads;
  if (settings.filter === "PLAYLIST" && !playlist) throw new Error("Add a playlist ID or use a YouTube playlist URL.");
  if (token || key) {
    const playlistId = playlist ?? (channelId ? `UU${channelId.slice(2)}` : undefined);
    if (!playlistId) throw new Error("Couldn’t find this channel’s uploads.");
    const data = await api("playlistItems", { part: "snippet,contentDetails", playlistId, maxResults: "15" }) as { items?: { snippet?: { title?: string; publishedAt?: string; resourceId?: { videoId?: string } }; contentDetails?: { videoId?: string; videoPublishedAt?: string } }[] };
    videos = (data.items ?? []).flatMap((item) => {
      const id = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
      return id && validId(id) ? [{ id, title: item.snippet?.title?.slice(0, 200) ?? "YouTube video", thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, publishedAt: item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt }] : [];
    });
    if (videos.length && (settings.filter === "VIDEOS" || settings.filter === "SHORTS" || settings.sort === "VIEWS")) {
      const details = await api("videos", { part: "contentDetails,statistics", id: videos.map((video) => video.id).join(",") }) as { items?: { id: string; contentDetails?: { duration?: string }; statistics?: { viewCount?: string } }[] };
      const byId = new Map((details.items ?? []).map((item) => [item.id, item]));
      videos = videos.map((video) => ({ ...video, durationSeconds: durationSeconds(byId.get(video.id)?.contentDetails?.duration), viewCount: Number(byId.get(video.id)?.statistics?.viewCount ?? 0) }));
      if (settings.filter === "SHORTS") videos = videos.filter((video) => video.durationSeconds !== undefined && video.durationSeconds <= 180);
      if (settings.filter === "VIDEOS") videos = videos.filter((video) => video.durationSeconds !== undefined && video.durationSeconds > 180);
      if (settings.sort === "VIEWS") videos.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
    }
  } else {
    if (["VIDEOS", "SHORTS"].includes(settings.filter) || settings.sort === "VIEWS") throw new Error("Video-length filters and view sorting need a YouTube API key or connected account.");
    const endpoint = new URL("https://www.youtube.com/feeds/videos.xml");
    if (settings.filter === "PLAYLIST" && playlist) endpoint.searchParams.set("playlist_id", playlist);
    else if (channelId) endpoint.searchParams.set("channel_id", channelId);
    try {
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(7000), cache: "no-store" });
      if (!response.ok) throw new Error("Feed unavailable");
      const parsed = new XMLParser({ ignoreAttributes: false }).parse(await response.text()) as { feed?: { title?: string; entry?: { "yt:videoId"?: string; title?: string; published?: string }[] | { "yt:videoId"?: string; title?: string; published?: string } } };
      const entry = parsed.feed?.entry; const entries = Array.isArray(entry) ? entry : entry ? [entry] : [];
      videos = entries.flatMap((item) => item["yt:videoId"] && validId(item["yt:videoId"]) ? [{ id: item["yt:videoId"], title: String(item.title ?? "YouTube video").slice(0, 200), thumbnailUrl: `https://i.ytimg.com/vi/${item["yt:videoId"]}/hqdefault.jpg`, publishedAt: item.published }] : []);
      if (!channel?.snippet?.title && parsed.feed?.title) channel = { snippet: { title: String(parsed.feed.title) } };
    } catch {
      if (settings.filter === "PLAYLIST" || !channelId) throw new Error("YouTube’s public playlist feed is unavailable right now. Try again or connect an API key.");
      fallback = fallback ?? await publicChannelListing(channelId);
      videos = fallback.videos; resolvedSource = "public channel listing";
      if (fallback.channelTitle) channel = { snippet: { title: fallback.channelTitle } };
      if (!videos.length) throw new Error("No public videos were found for this channel.");
    }
  }
  const result: YoutubeResult = { videos: videos.slice(0, settings.source === "LATEST" ? 1 : 8), channelId, channelTitle: channel?.snippet?.title, channelThumbnail: channel?.snippet?.thumbnails?.medium?.url ?? channel?.snippet?.thumbnails?.default?.url, subscriberCount: channel?.statistics?.subscriberCount, viewCount: channel?.statistics?.viewCount, videoCount: channel?.statistics?.videoCount, source: resolvedSource };
  cache.set(cacheKey, { expires: Date.now() + 300000, result });
  if (cache.size > 200) for (const [key, item] of cache) if (item.expires < Date.now()) cache.delete(key);
  return result;
}

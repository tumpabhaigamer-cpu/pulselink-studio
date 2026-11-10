import type { YoutubeSettings, YoutubeVideo } from "@/lib/types";

export const DEFAULT_YOUTUBE_SETTINGS: YoutubeSettings = { source: "SINGLE", layout: "PLAYER", interaction: "INLINE", filter: "ALL", sort: "RECENT", askSubscribe: false, videos: [] };

export function youtubeVideoId(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    let id: string | null = null;
    if (host === "youtu.be" || host === "www.youtu.be") id = url.pathname.split("/")[1];
    else if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtube-nocookie.com" || host.endsWith(".youtube-nocookie.com")) id = url.searchParams.get("v") || (/^\/(embed|shorts|live)\//.test(url.pathname) ? url.pathname.split("/")[2] : null);
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export function youtubeChannelId(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^UC[\w-]{22}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (!(url.hostname === "youtube.com" || url.hostname.endsWith(".youtube.com"))) return null;
    const match = url.pathname.match(/^\/channel\/(UC[\w-]{22})/);
    return match?.[1] ?? null;
  } catch { return null; }
}

export function sanitizeYoutubeSettings(value: unknown): YoutubeSettings {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const choose = <T extends string>(v: unknown, options: readonly T[], fallback: T): T => typeof v === "string" && options.includes(v as T) ? v as T : fallback;
  const videos: YoutubeVideo[] = Array.isArray(raw.videos) ? raw.videos.slice(0, 15).flatMap((v: unknown) => {
    if (!v || typeof v !== "object") return [];
    const item = v as Record<string, unknown>;
    if (typeof item.id !== "string" || !/^[\w-]{11}$/.test(item.id)) return [];
    return [{ id: item.id, title: typeof item.title === "string" ? item.title.slice(0, 200) : "YouTube video", thumbnailUrl: `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`, publishedAt: typeof item.publishedAt === "string" ? item.publishedAt.slice(0, 50) : undefined, viewCount: typeof item.viewCount === "number" && Number.isFinite(item.viewCount) ? item.viewCount : undefined, durationSeconds: typeof item.durationSeconds === "number" && Number.isFinite(item.durationSeconds) ? item.durationSeconds : undefined }];
  }) : [];
  return {
    source: choose(raw.source, ["SINGLE", "LATEST", "FEED"] as const, "SINGLE"),
    layout: choose(raw.layout, ["CLASSIC", "IMAGE", "PLAYER", "GRID", "CAROUSEL", "CARDS", "PROFILE"] as const, "PLAYER"),
    interaction: choose(raw.interaction, ["INLINE", "YOUTUBE"] as const, "INLINE"),
    filter: choose(raw.filter, ["ALL", "VIDEOS", "SHORTS", "PLAYLIST", "PICKED"] as const, "ALL"),
    sort: choose(raw.sort, ["RECENT", "VIEWS", "MANUAL"] as const, "RECENT"),
    askSubscribe: raw.askSubscribe === true,
    channelId: typeof raw.channelId === "string" && /^UC[\w-]{22}$/.test(raw.channelId) ? raw.channelId : undefined,
    playlistId: typeof raw.playlistId === "string" && /^[\w-]{10,100}$/.test(raw.playlistId) ? raw.playlistId : undefined,
    videos,
  };
}

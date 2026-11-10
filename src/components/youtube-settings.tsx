"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, ExternalLink, Grid2X2, Link2, Play, RefreshCw, Video } from "lucide-react";
import { youtubeVideoId } from "@/lib/youtube-common";
import type { YoutubeSettings, YoutubeVideo } from "@/lib/types";

type Status = { configured: boolean; connected: boolean; channelId: string | null; channelTitle: string | null; apiKeyConfigured: boolean };
type Props = { url: string; settings: YoutubeSettings; onChange: (settings: YoutubeSettings) => void; onUseChannel: (url: string, channelId: string) => void; onResolved: (videos: YoutubeVideo[], channelId?: string) => void };

export function YoutubeSettingsEditor({ url, settings, onChange, onUseChannel, onResolved }: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [manual, setManual] = useState((settings.videos ?? []).map((video) => `https://youtu.be/${video.id}`).join("\n"));
  useEffect(() => { fetch("/api/integrations/youtube").then((response) => response.json()).then(setStatus).catch(() => {}); }, []);
  function update(patch: Partial<YoutubeSettings>) { onChange({ ...settings, ...patch }); }
  async function load() {
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/youtube/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, settings }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Couldn’t load videos.");
      onResolved(result.videos ?? [], result.channelId);
      setMessage(`${result.videos?.length ?? 0} video${result.videos?.length === 1 ? "" : "s"} found${result.channelTitle ? ` from ${result.channelTitle}` : ""}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Couldn’t load videos."); }
    finally { setLoading(false); }
  }
  async function disconnect() {
    await fetch("/api/integrations/youtube", { method: "DELETE" });
    setStatus((current) => current ? { ...current, connected: false, channelId: null, channelTitle: null } : null);
    setMessage("YouTube disconnected.");
  }
  function changeManual(value: string) {
    setManual(value);
    const ids = value.split(/[\n,\s]+/).map((entry) => youtubeVideoId(entry)).filter((id): id is string => !!id);
    const unique = [...new Set(ids)].slice(0, 15);
    update({ videos: unique.map((id) => settings.videos?.find((video) => video.id === id) ?? { id, title: "YouTube video", thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` }) });
  }
  function moveVideo(index: number, direction: number) {
    const videos = [...(settings.videos ?? [])]; const target = index + direction;
    if (target < 0 || target >= videos.length) return;
    [videos[index], videos[target]] = [videos[target], videos[index]];
    update({ videos }); setManual(videos.map((video) => `https://youtu.be/${video.id}`).join("\n"));
  }
  const layouts = settings.source === "FEED" ? ["CAROUSEL", "GRID", "CARDS", "PROFILE"] as const : ["CLASSIC", "IMAGE", "PLAYER"] as const;
  return <div className="youtube-editor">
    <div className="youtube-editor-heading"><span className="youtube-app-icon"><Play size={16} fill="currentColor" /></span><div><strong>YouTube settings</strong><small>Bring your videos to your PulseLink.</small></div><span className="youtube-app-label">LINK APP</span></div>
    <div className="youtube-connection"><div><span className={`connection-dot ${status?.connected ? "connected" : ""}`} /><strong>{status?.connected ? status.channelTitle : "Connect your YouTube"}</strong><small>{status?.connected ? "Your channel is connected" : "Optional · unlock channel data"}</small></div>{status?.connected ? <button type="button" onClick={disconnect}>Disconnect</button> : <button type="button" onClick={() => { if (status?.configured) window.location.assign("/api/integrations/youtube/connect"); else setMessage("To connect Google, configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI and INTEGRATION_ENCRYPTION_KEY on the server."); }}>Connect <ExternalLink size={12} /></button>}</div>
    {status?.connected && status.channelId && <button type="button" className="youtube-use-channel" onClick={() => { onUseChannel(`https://www.youtube.com/channel/${status.channelId}`, status.channelId!); setMessage("Connected channel selected."); }}>Use my connected channel <ArrowUp size={12} /></button>}
    <div className="youtube-field-title">What would you like to show?</div><div className="youtube-source-tabs">{([{ value: "SINGLE", label: "Single video" }, { value: "LATEST", label: "Latest video" }, { value: "FEED", label: "Video feed" }] as const).map((option) => <button type="button" key={option.value} className={settings.source === option.value ? "active" : ""} onClick={() => update({ source: option.value, layout: option.value === "FEED" ? "GRID" : "PLAYER", filter: "ALL", videos: [], channelId: undefined })}>{option.label}</button>)}</div>
    <div className="youtube-field-title">Layout</div><div className="youtube-layouts">{layouts.map((layout) => <button type="button" key={layout} className={settings.layout === layout ? "active" : ""} onClick={() => update({ layout })}>{layout === "PLAYER" ? <Play size={15} /> : layout === "GRID" ? <Grid2X2 size={15} /> : layout === "CLASSIC" ? <Link2 size={15} /> : <Video size={15} />}<span>{layout.charAt(0) + layout.slice(1).toLowerCase()}</span>{settings.layout === layout && <Check size={12} />}</button>)}</div>
    {settings.source !== "SINGLE" && <><div className="form-two-columns youtube-selects"><label>Show<select value={settings.filter} onChange={(event) => update({ filter: event.target.value as YoutubeSettings["filter"] })}><option value="ALL">All uploads</option><option value="VIDEOS">Videos (over 3 min)</option><option value="SHORTS">Short videos (up to 3 min)</option><option value="PLAYLIST">Playlist</option><option value="PICKED">Hand-picked</option></select></label><label>Sort by<select value={settings.sort} onChange={(event) => update({ sort: event.target.value as YoutubeSettings["sort"] })}><option value="RECENT">Most recent</option><option value="VIEWS">Most viewed (recent)</option><option value="MANUAL">Manual order</option></select></label></div><small className="youtube-hint">Length filters are approximate; filtering and view sorting need API access.</small>{settings.filter === "PLAYLIST" && <label>Playlist ID<input value={settings.playlistId ?? ""} onChange={(event) => update({ playlistId: event.target.value })} placeholder="PL..." /></label>}{settings.filter === "PICKED" && <><label>Video URLs, one per line<textarea value={manual} onChange={(event) => changeManual(event.target.value)} placeholder={'https://youtu.be/...\nhttps://youtube.com/watch?v=...'} rows={3} /></label>{(settings.videos ?? []).map((video, index) => <div className="youtube-picked" key={video.id}><span>{index + 1}. {video.title === "YouTube video" ? video.id : video.title}</span><button type="button" onClick={() => moveVideo(index, -1)} aria-label="Move video up"><ArrowUp size={13} /></button><button type="button" onClick={() => moveVideo(index, 1)} aria-label="Move video down"><ArrowDown size={13} /></button></div>)}</>}</>}
    <label>When visitors tap<select value={settings.interaction} onChange={(event) => update({ interaction: event.target.value as YoutubeSettings["interaction"] })}><option value="INLINE">Play on my PulseLink</option><option value="YOUTUBE">Open on YouTube</option></select></label>
    <label className="checkbox-label"><input type="checkbox" checked={settings.askSubscribe} onChange={(event) => update({ askSubscribe: event.target.checked })} /><span>Ask visitors to subscribe after watching</span></label>
    <div className="youtube-resolve"><button type="button" className="small-outline-button" onClick={load} disabled={loading || !url}><RefreshCw size={13} className={loading ? "spin" : ""} /> {loading ? "Loading videos..." : settings.source === "SINGLE" ? "Fetch video details" : "Refresh videos"}</button><span>{settings.source !== "SINGLE" ? "Public feeds refresh automatically." : "A video URL works without connecting."}</span></div>
    {message && <div className="youtube-message" role="status">{message}</div>}
  </div>;
}

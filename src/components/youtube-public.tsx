"use client";

import { useState } from "react";
import { ArrowUpRight, Check, ExternalLink, MoreHorizontal, Play, X } from "lucide-react";
import { sanitizeYoutubeSettings, youtubeVideoId } from "@/lib/youtube-common";
import type { PublicLink, ThemeConfig, YoutubeVideo } from "@/lib/types";

export function YoutubePublic({ link, theme, onPlay }: { link: PublicLink; theme: ThemeConfig; onPlay: () => void }) {
  const settings = sanitizeYoutubeSettings(link.contextPayload.youtube);
  const singleId = youtubeVideoId(link.url);
  const videos: YoutubeVideo[] = settings.source === "SINGLE" && singleId ? [{ id: singleId, title: link.title, thumbnailUrl: link.thumbnailUrl || `https://i.ytimg.com/vi/${singleId}/hqdefault.jpg` }] : settings.videos ?? [];
  const [playing, setPlaying] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(false);
  const [lastVideo, setLastVideo] = useState<string | null>(null);
  const channel = link.contextPayload.youtubeChannel && typeof link.contextPayload.youtubeChannel === "object" ? link.contextPayload.youtubeChannel as Record<string, unknown> : {};
  const channelId = settings.channelId;
  const buttonStyle = { backgroundColor: theme.buttonColor, color: theme.buttonTextColor, borderRadius: theme.buttonRadius };
  function play(video: YoutubeVideo) {
    onPlay(); setLastVideo(video.id);
    if (settings.interaction === "YOUTUBE") window.open(`https://www.youtube.com/watch?v=${video.id}`, "_blank", "noopener,noreferrer");
    else setPlaying((current) => current === video.id ? null : video.id);
    if (settings.askSubscribe) setPrompt(true);
  }
  if (!videos.length) return <a className="public-link" style={buttonStyle} href={`/api/go/${link.id}`} target="_blank" rel="noreferrer">{link.thumbnailUrl ? <img src={link.thumbnailUrl} alt="" /> : <span className="public-link-placeholder">▶</span>}<span>{link.title}</span><ArrowUpRight size={17} /></a>;
  const isSingle = settings.source !== "FEED";
  const layout = settings.layout;
  return <div className="youtube-public-block">
    {layout === "PROFILE" && <div className="youtube-channel-profile" style={buttonStyle}>{typeof channel.thumbnailUrl === "string" ? <img src={channel.thumbnailUrl} alt="" /> : <span className="youtube-channel-avatar"><Play size={20} fill="currentColor" /></span>}<div><strong>{typeof channel.title === "string" ? channel.title : link.title} <Check size={12} /></strong><small>{typeof channel.subscriberCount === "string" ? `${Number(channel.subscriberCount).toLocaleString()} subscribers` : "YouTube channel"}{typeof channel.videoCount === "string" ? ` · ${Number(channel.videoCount).toLocaleString()} videos` : ""}</small></div></div>}
    {isSingle && layout === "CLASSIC" ? <button className="public-link" style={buttonStyle} onClick={() => play(videos[0])}>{link.thumbnailUrl ? <img src={link.thumbnailUrl} alt="" /> : <span className="public-link-placeholder">▶</span>}<span>{link.title}</span><Play size={16} /></button> : isSingle ? <div className={`youtube-feature ${layout === "IMAGE" ? "youtube-feature-image" : ""}`} style={{ borderRadius: theme.buttonRadius }}><button className="youtube-video-art" onClick={() => play(videos[0])} aria-label={`Play ${videos[0].title}`}><img src={videos[0].thumbnailUrl} alt="" /><span><Play size={21} fill="currentColor" /></span></button><div className="youtube-feature-title" style={{ background: theme.buttonColor, color: theme.buttonTextColor }}><div><strong>{link.title}</strong><small>Watch on YouTube</small></div><MoreHorizontal size={17} /></div></div> : <div className={`youtube-feed youtube-feed-${layout.toLowerCase()}`}>{videos.map((video) => <button key={video.id} className="youtube-video-card" onClick={() => play(video)} style={{ background: theme.buttonColor, color: theme.buttonTextColor }}><span className="youtube-card-art"><img src={video.thumbnailUrl} alt="" /><span><Play size={14} fill="currentColor" /></span></span><strong>{video.title}</strong></button>)}</div>}
    {playing && <div className="video-embed"><iframe src={`https://www.youtube-nocookie.com/embed/${playing}?autoplay=1`} title={videos.find((video) => video.id === playing)?.title ?? link.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>}
    {prompt && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPrompt(false); }}><div className="modal public-modal subscribe-modal" role="dialog" aria-modal="true" aria-label="Subscribe on YouTube"><button className="modal-close" onClick={() => setPrompt(false)} aria-label="Close"><X size={19} /></button><div className="youtube-app-icon large"><Play size={21} fill="currentColor" /></div><h2>Enjoying the videos?</h2><p>Subscribe on YouTube to catch the next one.</p><a className="primary-button full-button" href={channelId ? `https://www.youtube.com/channel/${channelId}?sub_confirmation=1` : `https://www.youtube.com/watch?v=${lastVideo ?? videos[0].id}`} target="_blank" rel="noreferrer" onClick={() => setPrompt(false)}>Go to YouTube <ExternalLink size={15} /></a><button className="youtube-not-now" onClick={() => setPrompt(false)}>Not now</button></div></div>}
  </div>;
}

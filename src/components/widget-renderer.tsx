"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, ExternalLink, Grid2X2, Link2, Mail, MapPin, MessageCircle, Pause, Phone, Play, Sparkles, X } from "lucide-react";
import { Brand } from "@/components/brand";
import type { PulseAction, PulseWidget } from "@/lib/widget-schema";
import type { PublicLink } from "@/lib/types";

export function pulseBeacon(profileId: string, eventType: string, linkId?: string, durationSeconds?: number) {
  const params = new URLSearchParams(window.location.search); const payload = JSON.stringify({ profileId, eventType, linkId, durationSeconds, referrer: document.referrer, utmSource: params.get("utm_source"), utmMedium: params.get("utm_medium"), utmCampaign: params.get("utm_campaign") });
  if (navigator.sendBeacon) navigator.sendBeacon("/api/events/ingest", new Blob([payload], { type: "application/json" }));
  else void fetch("/api/events/ingest", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
}

type OnAction = (action: PulseAction, sourceId: string) => void;
function ActionIcon({ icon, size = 17 }: { icon: string; size?: number }) { if (icon === "WHATSAPP") return <MessageCircle size={size} />; if (icon === "CALENDAR") return <CalendarDays size={size} />; if (icon === "MAP") return <MapPin size={size} />; if (icon === "PHONE") return <Phone size={size} />; if (icon === "MAIL") return <Mail size={size} />; if (icon === "PLAY") return <Play size={size} fill="currentColor" />; if (icon === "HOME") return <Grid2X2 size={size} />; return <Link2 size={size} />; }

export function OSWindowContent({ widget, link, onAction }: { widget: Extract<PulseWidget, { type: "OS_WINDOW_CARD" }>; link: PublicLink; onAction: OnAction }) {
  const { content } = widget;
  return <><span className="pulse-window-overline">{content.eyebrow}</span><h2>{content.heading || link.title}</h2><p>{content.description}</p>{content.imageUrl && <div className="pulse-window-image" style={{ backgroundImage: `url("${content.imageUrl}")` }}><span>✳ PULSELINK / EXPERIENCE</span></div>}{content.action.kind !== "NONE" && <button className="pulse-window-cta" onClick={() => onAction(content.action, link.id)}>{content.action.label || "Explore"} <ArrowUpRight size={15} /></button>}</>;
}

export function VerticalReel({ widget, link, profileId, onAction, motionEnabled = true }: { widget: Extract<PulseWidget, { type: "VERTICAL_VIDEO_REEL" }>; link: PublicLink; profileId: string; onAction: OnAction; motionEnabled?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null); const started = useRef<number | null>(null); const played = useRef(false); const visible = useRef(false); const [playing, setPlaying] = useState(false);
  const { content } = widget;
  useEffect(() => {
    const video = ref.current; if (!video) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const flush = () => { if (started.current === null) return; const seconds = Math.min(3600, Math.floor((performance.now() - started.current) / 1000)); if (seconds > 0) pulseBeacon(profileId, "VIDEO_WATCH", link.id, seconds); started.current = video.paused ? null : performance.now(); };
    const observer = new IntersectionObserver(([entry]) => { visible.current = entry.isIntersecting; if (content.autoplay && content.muted && motionEnabled && !reduced) { if (entry.isIntersecting && !document.hidden) void video.play().catch(() => {}); else video.pause(); } }, { threshold: .45 }); observer.observe(video);
    const onVisibility = () => { if (document.hidden) { flush(); video.pause(); } else if (visible.current && content.autoplay && content.muted && motionEnabled && !reduced) void video.play().catch(() => {}); };
    const onPageHide = () => flush(); document.addEventListener("visibilitychange", onVisibility); window.addEventListener("pagehide", onPageHide); const timer = window.setInterval(flush, 15000);
    return () => { flush(); observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("pagehide", onPageHide); window.clearInterval(timer); };
  }, [profileId, link.id, content.autoplay, content.muted, motionEnabled]);
  function onPlay() { setPlaying(true); if (started.current === null) started.current = performance.now(); if (!played.current) { played.current = true; pulseBeacon(profileId, "VIDEO_PLAY", link.id); } }
  function onPause() { setPlaying(false); if (started.current !== null) { const seconds = Math.min(3600, Math.floor((performance.now() - started.current) / 1000)); if (seconds > 0) pulseBeacon(profileId, "VIDEO_WATCH", link.id, seconds); started.current = null; } }
  return <div className={`pw-reel ${link.layoutSize === "FEATURED" ? "pw-wide" : ""}`} style={{ "--widget-accent": widget.appearance.accent } as React.CSSProperties}><video ref={ref} src={content.videoUrl} poster={content.posterUrl || undefined} muted={content.muted} loop={content.loop} playsInline preload="metadata" onPlaying={onPlay} onPause={onPause} onWaiting={onPause} /><div className="pw-reel-top"><span>● LIVE REEL / 9:16</span><button onClick={() => { const video = ref.current; if (!video) return; if (video.paused) void video.play().catch(() => {}); else video.pause(); }} aria-label={playing ? "Pause video" : "Play video"}>{playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</button></div><div className="pw-reel-copy"><span>✳ WATCH & EXPLORE</span><strong>{content.heading || link.title}</strong><p>{content.subheading}</p>{content.action.kind !== "NONE" && <button onClick={() => onAction(content.action, link.id)}>{content.action.label || "Explore"} <ArrowUpRight size={14} /></button>}</div></div>;
}

export function NeonAction({ widget, link, onAction }: { widget: Extract<PulseWidget, { type: "NEON_ACTION_BUTTON" }>; link: PublicLink; onAction: OnAction }) {
  const { content } = widget;
  return <button className={`pw-neon-action ${link.layoutSize === "FEATURED" ? "pw-wide" : ""}`} style={{ "--widget-accent": widget.appearance.accent } as React.CSSProperties} onClick={() => onAction(content.action, link.id)}><span className="pw-neon-icon"><ActionIcon icon={content.icon} /></span><span><small>ONE TAP / LET’S GO</small><strong>{content.heading || link.title}</strong><em>{content.subheading}</em></span><ArrowUpRight size={19} /></button>;
}

export function BentoShowcase({ widget, link, onAction, onOpen }: { widget: Extract<PulseWidget, { type: "BENTO_SHOWCASE_GRID" }>; link: PublicLink; onAction: OnAction; onOpen?: () => void }) {
  const [category, setCategory] = useState("ALL"); const [selected, setSelected] = useState<(typeof widget.content.items)[number] | null>(null);
  const categories = [...new Set(widget.content.items.map((item) => item.category).filter(Boolean))]; const items = widget.content.items.filter((item) => category === "ALL" || item.category === category);
  return <section className={`pw-bento ${link.layoutSize === "FEATURED" ? "pw-wide" : ""}`} style={{ "--widget-accent": widget.appearance.accent } as React.CSSProperties}><div className="pw-bento-heading"><div><span>CURATED / EXPLORE</span><h3>{widget.content.heading || link.title}</h3></div><Sparkles size={17} /></div>{widget.content.filterEnabled && categories.length > 0 && <div className="pw-bento-filters">{["ALL", ...categories].map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>}<div className={`pw-bento-grid ${widget.content.layout === "CAROUSEL" ? "carousel" : ""}`}>{items.map((item) => <button key={item.id} onClick={() => { onOpen?.(); setSelected(item); }} style={item.imageUrl ? { backgroundImage: `linear-gradient(180deg,transparent 30%,#101015e8),url("${item.imageUrl}")` } : undefined}><span>{item.category || "FEATURED"}</span><div><strong>{item.title}</strong>{item.price && <small>{item.price}</small>}</div><ArrowUpRight size={14} /></button>)}</div>{selected && <div className="pulse-window-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="pulse-window pw-item-window" role="dialog" aria-modal="true" aria-label={selected.title}><div className="pulse-window-bar"><span><i /><i /><i /></span><strong>SHOWCASE / DETAIL</strong><button onClick={() => setSelected(null)} aria-label="Close item"><X size={17} /></button></div><div className="pulse-window-body"><span className="pulse-window-overline">{selected.category || "FEATURED"}</span><h2>{selected.title}</h2><p>{selected.caption}</p>{selected.imageUrl && <div className="pulse-window-image" style={{ backgroundImage: `url("${selected.imageUrl}")` }} />}{selected.price && <strong className="pulse-window-price">{selected.price}</strong>}{selected.action.kind !== "NONE" && <button className="pulse-window-cta" onClick={() => onAction(selected.action, link.id)}>{selected.action.label || "Explore"} <ArrowUpRight size={15} /></button>}</div></section></div>}</section>;
}

export function TaskbarDock({ widget, link, tier, onAction }: { widget: Extract<PulseWidget, { type: "TASKBAR_DOCK" }>; link: PublicLink; tier: string; onAction: OnAction }) {
  const showBranding = tier === "FREE" || widget.content.showBranding;
  return <div className="pw-dock-wrap"><div className="pw-taskbar" style={{ "--widget-accent": widget.appearance.accent } as React.CSSProperties}>{widget.content.items.map((item) => <button key={item.id} title={item.label} aria-label={item.label} onClick={() => item.icon === "HOME" && item.action.kind === "NONE" ? window.scrollTo({ top: 0, behavior: "smooth" }) : onAction(item.action, link.id)}><ActionIcon icon={item.icon} size={17} /><span>{item.label}</span></button>)}{showBranding && <><i /><a href="/" className="pw-dock-brand" aria-label="Built with PulseLink"><Brand compact /><span>BUILT WITH</span></a></>}</div></div>;
}

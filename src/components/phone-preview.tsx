"use client";

import { useState } from "react";
import { ArrowUpRight, Check, ChevronDown, ExternalLink, LockKeyhole, Monitor, MoreHorizontal, Play, Smartphone } from "lucide-react";
import { Brand, SocialRow } from "@/components/brand";
import { sanitizeYoutubeSettings, youtubeVideoId } from "@/lib/youtube-common";
import type { DashboardLink, DashboardProfile } from "@/lib/types";

function shown(link: DashboardLink) { const now = Date.now(); return link.isActive && !link.isArchived && (!link.scheduleStart || new Date(link.scheduleStart).getTime() <= now) && (!link.scheduleEnd || new Date(link.scheduleEnd).getTime() > now); }

export function PhonePreview({ profile, links }: { profile: DashboardProfile; links: DashboardLink[] }) {
  const [mode, setMode] = useState<"phone" | "desktop">("phone");
  const [expanded, setExpanded] = useState<string[]>([]); const [tab, setTab] = useState<"links" | "shop">("links");
  const active = links.filter(shown); const collectionIds = new Set(active.filter((link) => link.type === "COLLECTION").map((link) => link.id));
  const visible = active.filter((link) => !link.parentId || collectionIds.has(link.parentId));
  const theme = profile.themeConfig;
  const buttonStyle = { backgroundColor: theme.buttonColor, color: theme.buttonTextColor, borderRadius: theme.buttonRadius };
  function renderLink(link: DashboardLink): React.ReactNode {
    if (link.type === "HEADER") return <div className="phone-link-header" key={link.id}>{link.title}</div>;
    if (link.type === "TEXT_BLOCK") return <p className="phone-text-block" key={link.id}>{link.title}</p>;
    if (link.type === "COLLECTION") { const open = expanded.includes(link.id); return <div key={link.id}><button className="phone-link phone-collection" style={buttonStyle} onClick={() => setExpanded(open ? expanded.filter((id) => id !== link.id) : [...expanded, link.id])}><span>{link.title}</span><ChevronDown size={12} className={open ? "rotated" : ""} /></button>{open && <div className="phone-collection-children">{visible.filter((child) => child.parentId === link.id).map(renderLink)}</div>}</div>; }
    const locked = link.lockConfig.codeLock?.enabled || link.lockConfig.ageLock?.enabled || link.lockConfig.subscribeLock?.enabled || link.lockConfig.sensitiveWarning?.enabled;
    const youtube = link.type === "YOUTUBE_VIDEO" ? sanitizeYoutubeSettings(link.contextPayload.youtube) : null;
    if (youtube && !locked && ["PLAYER", "IMAGE"].includes(youtube.layout)) {
      const video = youtube.videos?.[0]; const id = video?.id ?? youtubeVideoId(link.url);
      const thumbnail = video?.thumbnailUrl || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : link.thumbnailUrl);
      return <div className="phone-video" key={link.id} style={buttonStyle}><div className="phone-video-art" style={thumbnail ? { backgroundImage: `url("${thumbnail}")` } : undefined}><span><Play size={13} fill="currentColor" /></span></div><strong>{link.title}</strong></div>;
    }
    return <div className="phone-link" key={link.id} style={buttonStyle}>{link.thumbnailUrl ? <img src={link.thumbnailUrl} alt="" /> : <span className="phone-link-placeholder">{["EMAIL_SIGNUP", "CONTACT_FORM"].includes(link.type) ? "✉" : "✳"}</span>}<span>{link.title}</span>{locked ? <LockKeyhole size={11} /> : <MoreHorizontal size={13} />}</div>;
  }
  return <aside className="preview-panel"><div className="preview-heading"><div><div className="preview-title">Live preview <span className="live-pip" /></div><p>See your page come to life</p></div><div className="view-switch" aria-label="Preview size"><button type="button" title="Phone preview" aria-label="Phone preview" className={mode === "phone" ? "selected" : ""} onClick={() => setMode("phone")}><Smartphone size={15} /></button><button type="button" title="Desktop preview" aria-label="Desktop preview" className={mode === "desktop" ? "selected" : ""} onClick={() => setMode("desktop")}><Monitor size={15} /></button></div></div><div className={`phone-wrap ${mode === "desktop" ? "preview-desktop" : ""}`}><div className="phone-shell">{mode === "phone" && <div className="phone-notch" />}<div className="phone-screen" style={{ background: theme.gradientEnd ? `linear-gradient(180deg, ${theme.background}, ${theme.gradientEnd})` : theme.background, color: theme.textColor, fontFamily: theme.fontFamily ? `"${theme.fontFamily}", sans-serif` : undefined }}><div className="phone-cover" style={profile.coverUrl ? { backgroundImage: `url("${profile.coverUrl}")` } : undefined}><span className="phone-share"><MoreHorizontal size={16} /></span></div><div className="phone-profile">{profile.avatarUrl ? <img className="phone-avatar" src={profile.avatarUrl} alt="" /> : <div className="phone-avatar avatar-fallback">{profile.displayName.slice(0, 1)}</div>}<div className="phone-name">{profile.displayName} <span className="verified-check"><Check size={8} strokeWidth={4} /></span></div><div className="phone-handle">@{profile.username}</div><p className="phone-bio">{profile.bio}</p><SocialRow socials={profile.socialLinks} />{profile.shopEnabled && <div className="phone-tabs"><button className={tab === "links" ? "active" : ""} onClick={() => setTab("links")}>Links</button><button className={tab === "shop" ? "active" : ""} onClick={() => setTab("shop")}>Shop</button></div>}<div className="phone-links">{(tab === "links" ? visible.filter((link) => !link.parentId) : visible.filter((link) => link.type === "DIGITAL_PRODUCT")).map(renderLink)}{!visible.length && <div className="phone-empty">Your links will appear here.</div>}</div>{theme.showLogo && <div className="phone-brand"><Brand compact /></div>}</div></div></div></div><div className="preview-bottom"><div className="preview-bottom-icon"><Check size={15} strokeWidth={2.5} /></div><div><strong>Looking good!</strong><p>Changes are reflected in your preview.</p></div><a href={`/${profile.username}`} target="_blank" rel="noreferrer" aria-label="Open your public page"><ArrowUpRight size={17} /></a></div><a className="preview-open" href={`/${profile.username}`} target="_blank" rel="noreferrer">View your Linkspace <ExternalLink size={13} /></a></aside>;
}

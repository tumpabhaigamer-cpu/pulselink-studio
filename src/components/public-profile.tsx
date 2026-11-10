"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, ExternalLink, LockKeyhole, MoreHorizontal, Share2, X } from "lucide-react";
import { Brand, SocialRow } from "@/components/brand";
import { YoutubePublic } from "@/components/youtube-public";
import type { PublicLink, PublicProfileData } from "@/lib/types";

function beacon(profileId: string, eventType: string, linkId?: string) {
  const params = new URLSearchParams(window.location.search);
  const payload = JSON.stringify({ profileId, eventType, linkId, referrer: document.referrer, utmSource: params.get("utm_source"), utmMedium: params.get("utm_medium"), utmCampaign: params.get("utm_campaign") });
  if (navigator.sendBeacon) navigator.sendBeacon("/api/events/ingest", new Blob([payload], { type: "application/json" }));
  else void fetch("/api/events/ingest", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
}

function SignupBlock({ link }: { link: PublicLink }) {
  const [email, setEmail] = useState(""); const [name, setName] = useState(""); const [inquiry, setInquiry] = useState("");
  const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);
  const contact = link.type === "CONTACT_FORM";
  const config = link.contextPayload.contact && typeof link.contextPayload.contact === "object" ? link.contextPayload.contact as Record<string, unknown> : {};
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/subscribers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ linkId: link.id, email, name, message: inquiry }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setMessage(contact ? "Your message is on its way. Thank you!" : "You’re on the list. Thank you!"); setEmail(""); setName(""); setInquiry("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); }
    finally { setLoading(false); }
  }
  return <form className={`public-signup ${contact ? "public-contact" : ""}`} onSubmit={submit}><strong>{link.title}</strong><p>{contact ? "I’d love to hear from you." : "A little something good, straight to your inbox."}</p>{contact && config.collectName !== false && <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" aria-label="Your name" required />}{contact ? <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" required aria-label="Email address" /> : <div><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" required aria-label="Email address" /><button type="submit" disabled={loading} aria-label="Subscribe">{loading ? "..." : <ArrowRight size={18} />}</button></div>}{contact && config.collectMessage !== false && <textarea value={inquiry} onChange={(event) => setInquiry(event.target.value)} placeholder="How can I help?" aria-label="Your message" rows={3} required />}{contact && typeof config.consentText === "string" && config.consentText && <small>{config.consentText}</small>}{contact && <button className="contact-submit" type="submit" disabled={loading}>{loading ? "Sending..." : "Send message"} <ArrowRight size={15} /></button>}{message && <small role="status">{message}</small>}</form>;
}

export function PublicProfile({ data }: { data: PublicProfileData }) {
  const { profile, links } = data; const theme = profile.themeConfig;
  const [gate, setGate] = useState<PublicLink | null>(null); const [pin, setPin] = useState(""); const [email, setEmail] = useState(""); const [checked, setChecked] = useState(false); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [music, setMusic] = useState<PublicLink | null>(null); const [copied, setCopied] = useState(false);
  const [openCollections, setOpenCollections] = useState<string[]>([]); const [tab, setTab] = useState<"links" | "shop">("links");
  const tracked = useRef(false);
  useEffect(() => { if (!tracked.current) { tracked.current = true; beacon(profile.id, "PAGE_VIEW"); const requested = new URLSearchParams(window.location.search).get("open"); const lockedLink = links.find((link) => link.id === requested && link.isLocked); if (lockedLink) setGate(lockedLink); } }, [profile.id, links]);
  async function share() { try { if (navigator.share) await navigator.share({ title: profile.displayName, url: window.location.href }); else { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2200); } } catch { /* dismissed share sheet */ } }
  function openGate(link: PublicLink) { setGate(link); setPin(""); setEmail(""); setChecked(false); setError(""); }
  async function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!gate) return; setBusy(true); setError("");
    try { const response = await fetch(`/api/links/${gate.id}/unlock`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin, email, ageConfirmed: checked, acknowledged: checked }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Couldn’t unlock this link."); window.location.assign(result.destinationUrl); }
    catch (err) { setError(err instanceof Error ? err.message : "Please try again."); setBusy(false); }
  }
  const buttonStyle = { backgroundColor: theme.buttonColor, color: theme.buttonTextColor, borderRadius: theme.buttonRadius, boxShadow: theme.buttonShadow === "hard" ? "4px 4px 0 rgba(40,45,35,.18)" : theme.buttonShadow === "none" ? "none" : undefined };
  function renderLink(link: PublicLink): React.ReactNode {
    if (link.type === "COLLECTION") {
      const expanded = openCollections.includes(link.id); const children = links.filter((child) => child.parentId === link.id);
      return <div className="public-collection" key={link.id}><button className="public-collection-trigger" style={buttonStyle} aria-expanded={expanded} onClick={() => setOpenCollections(expanded ? openCollections.filter((id) => id !== link.id) : [...openCollections, link.id])}><span>{link.title}</span><small>{children.length} links</small><ChevronDown size={17} className={expanded ? "rotated" : ""} /></button>{expanded && <div className="public-collection-children">{children.map(renderLink)}{!children.length && <p>Nothing here just yet.</p>}</div>}</div>;
    }
    if (link.type === "HEADER") return <h2 className="public-link-header" key={link.id}>{link.title}</h2>;
    if (link.type === "TEXT_BLOCK") return <p className="public-text-block" key={link.id}>{link.title}</p>;
    if (link.type === "EMAIL_SIGNUP" || link.type === "CONTACT_FORM") return <SignupBlock key={link.id} link={link} />;
    if (link.type === "YOUTUBE_VIDEO" && !link.isLocked) return <YoutubePublic key={link.id} link={link} theme={theme} onPlay={() => beacon(profile.id, "LINK_CLICK", link.id)} />;
    const platforms = Array.isArray(link.contextPayload.platforms) ? link.contextPayload.platforms as { name: string; url: string }[] : [];
    const content = <>{link.thumbnailUrl ? <img src={link.thumbnailUrl} alt="" /> : <span className="public-link-placeholder">✳</span>}<span>{link.title}</span>{link.isLocked ? <LockKeyhole size={16} /> : <MoreHorizontal size={18} />}</>;
    return <div className="public-link-wrap" key={link.id}>{link.isLocked ? <button className="public-link" style={buttonStyle} onClick={() => openGate(link)}>{content}</button> : link.type === "MUSIC_SMART_LINK" && platforms.length ? <button className="public-link" style={buttonStyle} onClick={() => { beacon(profile.id, "LINK_CLICK", link.id); setMusic(link); }}>{content}</button> : <a className="public-link" style={buttonStyle} href={`/api/go/${link.id}`} target="_blank" rel="noreferrer">{content}</a>}</div>;
  }
  const products = links.filter((link) => link.type === "DIGITAL_PRODUCT");
  return <main className="public-page" style={{ background: theme.gradientEnd ? `linear-gradient(180deg, ${theme.background}, ${theme.gradientEnd})` : theme.background, color: theme.textColor, fontFamily: theme.fontFamily ? `"${theme.fontFamily}", sans-serif` : undefined }}><div className="public-inner"><div className="public-cover" style={profile.coverUrl ? { backgroundImage: `url("${profile.coverUrl}")` } : undefined}><button className="public-share" onClick={share} aria-label="Share this profile">{copied ? <Check size={18} /> : <Share2 size={18} />}</button></div><div className="public-content">{profile.avatarUrl ? <img className="public-avatar" src={profile.avatarUrl} alt={profile.displayName} /> : <div className="public-avatar avatar-fallback">{profile.displayName.slice(0, 1)}</div>}<h1>{profile.displayName} <span className="verified-check"><Check size={10} strokeWidth={4} /></span></h1><div className="public-handle">@{profile.username}</div><p className="public-bio">{profile.bio}</p><SocialRow socials={profile.socialLinks} clickable />
    {profile.shopEnabled && <div className="public-tabs"><button className={tab === "links" ? "active" : ""} onClick={() => setTab("links")}>Links</button><button className={tab === "shop" ? "active" : ""} onClick={() => setTab("shop")}>Shop</button></div>}
    {tab === "links" ? <div className="public-links">{links.filter((link) => !link.parentId).map(renderLink)}</div> : <div className="public-shop">{products.length ? products.map((product) => { const details = product.contextPayload.product && typeof product.contextPayload.product === "object" ? product.contextPayload.product as Record<string, unknown> : {}; const content = <>{product.thumbnailUrl ? <img src={product.thumbnailUrl} alt="" /> : <span className="shop-product-placeholder">✳</span>}<div><strong>{product.title}</strong>{typeof details.description === "string" && details.description && <p>{details.description}</p>}<span>{typeof details.price === "string" && details.price ? details.price : "View product"} <ArrowUpRight size={13} /></span></div></>; return product.isLocked ? <button key={product.id} className="public-product" onClick={() => openGate(product)} style={buttonStyle}>{content}</button> : <a key={product.id} className="public-product" href={`/api/go/${product.id}`} target="_blank" rel="noreferrer" style={buttonStyle}>{content}</a>; }) : <p className="public-shop-empty">Something good is coming soon.</p>}</div>}
    {theme.showLogo && <a className="public-brand" href="/" aria-label="Create your own Linkspace"><Brand compact /> <span>Make your own</span></a>}</div></div>
    {gate && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setGate(null); }}><div className="modal public-modal" role="dialog" aria-modal="true" aria-label="Unlock link"><button className="modal-close" onClick={() => setGate(null)} aria-label="Close"><X size={19} /></button><div className="modal-icon"><LockKeyhole size={21} /></div><h2>One more thing</h2><p>Unlock <strong>{gate.title}</strong> to continue.</p><form onSubmit={unlock} className="modal-form">{gate.lockConfig.codeLock?.enabled && <label>Passcode<input type="password" value={pin} onChange={(event) => setPin(event.target.value)} placeholder="Enter the passcode" required autoFocus /></label>}{gate.lockConfig.subscribeLock?.enabled && <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /><small>By continuing, you agree to receive updates from {profile.displayName}.</small></label>}{(gate.lockConfig.ageLock?.enabled || gate.lockConfig.sensitiveWarning?.enabled) && <label className="checkbox-label"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} required /><span>{gate.lockConfig.ageLock?.enabled ? `I confirm I am at least ${gate.lockConfig.ageLock.minAge} years old.` : "I understand this link may contain sensitive content."}</span></label>}{error && <div className="form-error">{error}</div>}<button className="primary-button full-button" type="submit" disabled={busy}>{busy ? "Unlocking..." : "Continue"} <ArrowRight size={16} /></button></form></div></div>}
    {music && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setMusic(null); }}><div className="modal public-modal" role="dialog" aria-modal="true" aria-label="Listen on your favorite platform"><button className="modal-close" onClick={() => setMusic(null)} aria-label="Close"><X size={19} /></button><div className="modal-icon">♫</div><h2>Listen your way</h2><p>Choose where you’d like to listen to {music.title}.</p><div className="music-platforms">{(music.contextPayload.platforms as { name: string; url: string }[]).map((platform) => <a key={platform.name} href={platform.url} target="_blank" rel="noreferrer"><span>{platform.name}</span><ExternalLink size={16} /></a>)}</div></div></div>}
  </main>;
}

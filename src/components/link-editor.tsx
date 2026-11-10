"use client";

import { useState } from "react";
import { ArrowRight, CalendarDays, FolderOpen, Heading, Image as ImageIcon, Link2, LockKeyhole, Mail, MessageSquareText, Music2, ShoppingBag, Sparkles, Type, Video, X } from "lucide-react";
import { YoutubeSettingsEditor } from "@/components/youtube-settings";
import { sanitizeYoutubeSettings } from "@/lib/youtube-common";
import type { DashboardLink, YoutubeSettings, YoutubeVideo } from "@/lib/types";

export const blockTypes = [
  { type: "CLASSIC_LINK", title: "Link", description: "Share a website, article, or anything else.", icon: Link2, color: "green" },
  { type: "COLLECTION", title: "Collection", description: "Group links in an expandable section.", icon: FolderOpen, color: "lavender" },
  { type: "YOUTUBE_VIDEO", title: "YouTube video", description: "Share a video or a dynamic channel feed.", icon: Video, color: "rose" },
  { type: "VIDEO_TOUR", title: "Vertical video", description: "Play a 9:16 video inside a window.", icon: Video, color: "rose" },
  { type: "CALCULATOR", title: "Scope calculator", description: "Let visitors build a quick estimate.", icon: Sparkles, color: "lavender" },
  { type: "PRICING", title: "Pricing tiers", description: "Present your offers in an interactive window.", icon: ShoppingBag, color: "green" },
  { type: "CONTACT_FORM", title: "Contact form", description: "Collect inquiries from your visitors.", icon: MessageSquareText, color: "peach" },
  { type: "EMAIL_SIGNUP", title: "Email signup", description: "Grow your audience with a simple form.", icon: Mail, color: "green" },
  { type: "DIGITAL_PRODUCT", title: "Shop link", description: "Link to your products or storefront.", icon: ShoppingBag, color: "peach" },
  { type: "BOOKING_CALENDAR", title: "Booking link", description: "Send visitors to your booking page.", icon: CalendarDays, color: "rose" },
  { type: "MUSIC_SMART_LINK", title: "Music link", description: "Share a song across music platforms.", icon: Music2, color: "lavender" },
  { type: "HEADER", title: "Header", description: "Organize your links into sections.", icon: Heading, color: "lavender" },
  { type: "TEXT_BLOCK", title: "Text", description: "Add a little note for your visitors.", icon: Type, color: "peach" },
];

export function BlockPicker({ onClose, onSelect }: { onClose: () => void; onSelect: (type: string) => void }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><div className="modal picker-modal" role="dialog" aria-modal="true" aria-label="Add a block"><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button><div className="eyebrow">MAKE IT YOURS</div><h2>Add something new</h2><p>There’s more than one way to share your world.</p><div className="block-grid">{blockTypes.map((block) => { const Icon = block.icon; return <button key={block.type} type="button" className="block-option" onClick={() => onSelect(block.type)}><span className={`block-option-icon ${block.color}`}><Icon size={19} /></span><span><strong>{block.title}</strong><small>{block.description}</small></span><ArrowRight size={16} /></button>; })}</div></div></div>;
}

function currentGate(link?: DashboardLink) {
  if (link?.lockConfig.codeLock?.enabled) return "PIN";
  if (link?.lockConfig.subscribeLock?.enabled) return "EMAIL";
  if (link?.lockConfig.ageLock?.enabled) return "AGE";
  if (link?.lockConfig.sensitiveWarning?.enabled) return "SENSITIVE";
  return "NONE";
}
function inputDate(value: string | null | undefined) { if (!value) return ""; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }

type Props = { link?: DashboardLink; initialType?: string; collections: DashboardLink[]; onClose: () => void; onSave: (body: Record<string, unknown>, id?: string) => Promise<void>; onAutoSave: (body: Record<string, unknown>, id: string) => Promise<void> };

export function LinkEditor({ link, initialType = "CLASSIC_LINK", collections, onClose, onSave, onAutoSave }: Props) {
  const [type, setType] = useState(link?.type ?? initialType);
  const [title, setTitle] = useState(link?.title ?? "");
  const [url, setUrl] = useState(link?.url ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(link?.thumbnailUrl ?? "");
  const [gateType, setGateType] = useState(currentGate(link));
  const [pin, setPin] = useState("");
  const [start, setStart] = useState(inputDate(link?.scheduleStart));
  const [end, setEnd] = useState(inputDate(link?.scheduleEnd));
  const [spotlight, setSpotlight] = useState(link?.isSpotlight ?? false);
  const [animation, setAnimation] = useState(link?.animation ?? "REVEAL");
  const calc = (link?.contextPayload.calculator && typeof link.contextPayload.calculator === "object" ? link.contextPayload.calculator : {}) as { items?: { name: string; price: number }[]; currency?: string };
  const prices = (link?.contextPayload.pricing && typeof link.contextPayload.pricing === "object" ? link.contextPayload.pricing : {}) as { items?: { name: string; price: string; description: string }[] };
  const [calcText, setCalcText] = useState(calc.items?.length ? calc.items.map((item) => `${item.name} | ${item.price}`).join("\n") : "Landing page | 1200\nBrand identity | 800\nMotion & interactions | 600");
  const [currency, setCurrency] = useState(calc.currency ?? "USD");
  const [pricingText, setPricingText] = useState(prices.items?.length ? prices.items.map((item) => `${item.name} | ${item.price} | ${item.description}`).join("\n") : "Starter | $99 | A great place to begin\nSignature | $199 | The complete experience");
  const [parentId, setParentId] = useState(link?.parentId ?? "");
  const [platforms, setPlatforms] = useState<{ name: string; url: string }[]>(Array.isArray(link?.contextPayload.platforms) ? link.contextPayload.platforms as { name: string; url: string }[] : []);
  const [youtube, setYoutube] = useState<YoutubeSettings>(() => sanitizeYoutubeSettings(link?.contextPayload.youtube));
  const product = (link?.contextPayload.product && typeof link.contextPayload.product === "object" ? link.contextPayload.product : {}) as Record<string, unknown>;
  const contact = (link?.contextPayload.contact && typeof link.contextPayload.contact === "object" ? link.contextPayload.contact : {}) as Record<string, unknown>;
  const [price, setPrice] = useState(typeof product.price === "string" ? product.price : "");
  const [description, setDescription] = useState(typeof product.description === "string" ? product.description : "");
  const [collectName, setCollectName] = useState(contact.collectName !== false);
  const [collectMessage, setCollectMessage] = useState(contact.collectMessage !== false);
  const [consentText, setConsentText] = useState(typeof contact.consentText === "string" ? contact.consentText : "");
  const [busy, setBusy] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");
  const [resolveMessage, setResolveMessage] = useState("");
  const [autoMessage, setAutoMessage] = useState("");
  const noUrl = ["HEADER", "TEXT_BLOCK", "COLLECTION", "EMAIL_SIGNUP", "CONTACT_FORM", "CALCULATOR", "PRICING"].includes(type);
  const block = blockTypes.find((item) => item.type === type);
  async function autoSave(field: "title" | "url") {
    if (!link || type !== link.type || !title.trim() || (!noUrl && !url.trim())) return;
    try { await onAutoSave(field === "title" ? { title, quickSave: true } : { url: noUrl ? null : url, quickSave: true }, link.id); setAutoMessage("Saved automatically"); }
    catch { setAutoMessage(""); }
  }
  async function resolveMusic() {
    setResolving(true); setResolveMessage("");
    try {
      const response = await fetch("/api/music/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setPlatforms(result.platforms ?? []); if (!title && result.title) setTitle(result.artist ? `${result.artist} — ${result.title}` : result.title); if (!thumbnailUrl && result.thumbnailUrl) setThumbnailUrl(result.thumbnailUrl); setResolveMessage(`${result.platforms?.length ?? 0} platforms found.`);
    } catch (err) { setResolveMessage(err instanceof Error ? err.message : "Couldn’t match this song."); }
    finally { setResolving(false); }
  }
  function youtubeResolved(videos: YoutubeVideo[], channelId?: string) {
    setYoutube({ ...youtube, videos, channelId: channelId ?? youtube.channelId });
    if (!title && videos[0]?.title && videos[0].title !== "YouTube video") setTitle(videos[0].title);
    if (!thumbnailUrl && videos[0]?.thumbnailUrl) setThumbnailUrl(videos[0].thumbnailUrl);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const calculatorItems = calcText.split("\n").map((line) => { const [name, amount] = line.split("|").map((part) => part.trim()); return { name, price: Number(amount) }; }).filter((item) => item.name && Number.isFinite(item.price) && item.price >= 0);
      const pricingItems = pricingText.split("\n").map((line) => { const [name, amount, detail] = line.split("|").map((part) => part.trim()); return { name, price: amount ?? "", description: detail ?? "" }; }).filter((item) => item.name);
      await onSave({ type, title, url: noUrl ? null : url, thumbnailUrl, parentId: type === "COLLECTION" ? null : parentId || null, gate: { type: gateType, pin }, scheduleStart: start ? new Date(start).toISOString() : null, scheduleEnd: end ? new Date(end).toISOString() : null, isSpotlight: spotlight, animation, contextPayload: { platforms, youtube, product: { price, description }, contact: { collectName, collectMessage, consentText }, calculator: { items: calculatorItems, currency }, pricing: { items: pricingItems } } }, link?.id);
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn’t save this link."); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={`modal editor-modal ${type === "YOUTUBE_VIDEO" ? "youtube-modal" : ""}`} role="dialog" aria-modal="true" aria-label={link ? "Edit link" : "Add link"}>
    <button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button><div className="eyebrow">YOUR PULSELINK</div><h2>{link ? "Edit your widget" : "Add to your PulseLink"}</h2><p>{link ? "Make it just the way you want it." : "Give your visitors something good to find."} {autoMessage && <span className="autosave-label">✓ {autoMessage}</span>}</p>
    <form onSubmit={submit} className="modal-form">
      <label>Block type<select value={type} onChange={(event) => setType(event.target.value)}>{blockTypes.map((item) => <option value={item.type} key={item.type}>{item.title}</option>)}</select></label>
      <label>{type === "TEXT_BLOCK" ? "Your text" : "Title"}<input value={title} onChange={(event) => { setTitle(event.target.value); setAutoMessage(""); }} onBlur={() => autoSave("title")} maxLength={200} placeholder={type === "HEADER" || type === "COLLECTION" ? "e.g. A few of my favorites" : type === "EMAIL_SIGNUP" ? "e.g. Join my newsletter" : type === "CONTACT_FORM" ? "e.g. Let’s work together" : "Give your link a title"} required /></label>
      {!noUrl && <label>{type === "YOUTUBE_VIDEO" ? "YouTube URL" : "URL"}<input type="text" inputMode="url" value={url} onChange={(event) => { setUrl(event.target.value); setAutoMessage(""); if (type === "YOUTUBE_VIDEO") setYoutube((current) => ({ ...current, channelId: undefined, videos: [] })); }} onBlur={() => autoSave("url")} placeholder={type === "YOUTUBE_VIDEO" ? "https://youtube.com/watch?v=..." : "https://your-link.com"} required /><small>{type === "DIGITAL_PRODUCT" || type === "BOOKING_CALENDAR" ? "Connect an existing external shop or booking page." : type === "YOUTUBE_VIDEO" ? "Paste a video, channel, or playlist URL." : "This is where visitors will go when they tap."}</small></label>}
      {type === "YOUTUBE_VIDEO" && <YoutubeSettingsEditor url={url} settings={youtube} onChange={setYoutube} onUseChannel={(channelUrl, channelId) => { setUrl(channelUrl); setYoutube((current) => ({ ...current, source: "LATEST", layout: "PLAYER", channelId, videos: [] })); }} onResolved={youtubeResolved} />}
      {type === "MUSIC_SMART_LINK" && <div className="resolve-row"><button type="button" className="small-outline-button" onClick={resolveMusic} disabled={resolving || !url}><Sparkles size={14} /> {resolving ? "Finding platforms..." : "Find music platforms"}</button>{resolveMessage && <small>{resolveMessage}</small>}</div>}
      {type === "DIGITAL_PRODUCT" && <div className="form-two-columns"><label>Price <small>optional</small><input value={price} onChange={(event) => setPrice(event.target.value)} placeholder="e.g. $24" maxLength={30} /></label><label>Description <small>optional</small><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A little about your product" maxLength={300} /></label></div>}
      {type === "VIDEO_TOUR" && <div className="editor-info">Use a direct MP4 or WebM video URL. Vertical 9:16 clips work especially well in the in-page player.</div>}
      {type === "CALCULATOR" && <><label>Services and prices<textarea value={calcText} onChange={(event) => setCalcText(event.target.value)} rows={4} /><small>One per line: Service name | Price. Estimates are illustrative.</small></label><label>Currency<select value={currency} onChange={(event) => setCurrency(event.target.value)}><option>USD</option><option>INR</option><option>SGD</option><option>AED</option></select></label></>}
      {type === "PRICING" && <label>Pricing tiers<textarea value={pricingText} onChange={(event) => setPricingText(event.target.value)} rows={4} /><small>One per line: Name | Price | Description.</small></label>}
      {type === "CONTACT_FORM" && <div className="contact-options"><strong>Form fields</strong><label className="checkbox-label"><input type="checkbox" checked readOnly /><span>Email address (required)</span></label><label className="checkbox-label"><input type="checkbox" checked={collectName} onChange={(event) => setCollectName(event.target.checked)} /><span>Name</span></label><label className="checkbox-label"><input type="checkbox" checked={collectMessage} onChange={(event) => setCollectMessage(event.target.checked)} /><span>Message or inquiry</span></label><label>Consent text <small>optional</small><input value={consentText} onChange={(event) => setConsentText(event.target.value)} placeholder="By submitting, you agree..." maxLength={250} /></label></div>}
      {type === "COLLECTION" && <div className="editor-info">Once created, edit any link and choose this collection to group it inside an expandable section.</div>}
      {!noUrl && <label><span className="label-with-icon"><ImageIcon size={14} /> Thumbnail image URL <em>optional</em></span><input value={thumbnailUrl} onChange={(event) => setThumbnailUrl(event.target.value)} placeholder="https://..." /></label>}
      {type !== "COLLECTION" && collections.filter((item) => !item.isArchived && item.id !== link?.id).length > 0 && <label>Collection <small>optional</small><select value={parentId} onChange={(event) => setParentId(event.target.value)}><option value="">No collection</option>{collections.filter((item) => !item.isArchived && item.id !== link?.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
      <details className="advanced-details" open={!!(link?.scheduleStart || link?.scheduleEnd || currentGate(link) !== "NONE") || undefined}><summary><span><Sparkles size={15} /> More options</span><span>Schedule, lock & more</span></summary><div className="advanced-content">{!noUrl && <><label><span className="label-with-icon"><LockKeyhole size={14} /> Link gate</span><select value={gateType} onChange={(event) => setGateType(event.target.value)}><option value="NONE">No gate</option><option value="PIN">Passcode</option><option value="EMAIL">Collect an email</option><option value="AGE">Age confirmation (18+)</option><option value="SENSITIVE">Sensitive content warning</option></select></label>{gateType === "PIN" && <label>Passcode<input type="password" value={pin} onChange={(event) => setPin(event.target.value)} placeholder={link?.lockConfig.codeLock?.hasPasscode ? "Leave blank to keep current passcode" : "At least 4 characters"} minLength={pin ? 4 : undefined} required={!link?.lockConfig.codeLock?.hasPasscode} /></label>}</>}<label>Widget animation<select value={animation} onChange={(event) => setAnimation(event.target.value)}><option value="NONE">None</option><option value="REVEAL">Smooth reveal</option><option value="FLOAT">Gentle float</option><option value="PULSE">Neon glow</option></select></label><div className="form-two-columns"><label>Show from<input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} /></label><label>Show until<input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} /></label></div>{!noUrl && <label className="checkbox-label"><input type="checkbox" checked={spotlight} onChange={(event) => setSpotlight(event.target.checked)} /><span>Mark as a spotlight link</span></label>}</div></details>
      {error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{busy ? "Saving..." : link ? "Save changes" : `Add ${block?.title.toLowerCase() ?? "link"}`} <ArrowRight size={15} /></button></div>
    </form>
  </div></div>;
}

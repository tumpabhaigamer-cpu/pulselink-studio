"use client";

import { useState } from "react";
import { ArrowUpRight, Check, MessageCircle, X } from "lucide-react";
import type { LeadDrawerConfig, PulseAction } from "@/lib/widget-schema";

export function LeadDrawer({ config, action, creatorName, onClose, onSend }: { config: LeadDrawerConfig; action: PulseAction; creatorName: string; onClose: () => void; onSend: () => void }) {
  const [option, setOption] = useState(config.options[0] ?? ""); const [name, setName] = useState("");
  const message = config.messageTemplate.replace(/\{option\}/gi, option).replace(/\{name\}/gi, name.trim() || "a visitor");
  let href = "#"; try { const url = new URL(action.value); url.searchParams.set("text", message); href = url.toString(); } catch { /* validated before rendering */ }
  const isGeneric = (() => { try { const url = new URL(action.value); return url.hostname === "wa.me" && (url.pathname === "/" || url.pathname === ""); } catch { return false; } })();
  return <div className="lead-drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="lead-drawer" role="dialog" aria-modal="true" aria-label="Start a WhatsApp inquiry"><div className="lead-drawer-handle" /><button className="lead-drawer-close" onClick={onClose} aria-label="Close inquiry"><X size={18} /></button><div className="lead-drawer-icon"><MessageCircle size={20} /></div><span className="lead-drawer-eyebrow">ONE TAP / LET’S CONNECT</span><h2>{config.heading || "What can we help with?"}</h2><p>Choose what you’re interested in and we’ll prepare a message for {creatorName}.</p><div className="lead-options">{config.options.map((item) => <button key={item} className={option === item ? "active" : ""} onClick={() => setOption(item)}><span>{item}</span>{option === item && <Check size={15} />}</button>)}</div><label>Your name <small>optional</small><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Add your name" maxLength={80} /></label><div className="lead-message-preview"><span>MESSAGE PREVIEW</span><p>{message}</p></div>{isGeneric && <small className="lead-drawer-note">This demo opens WhatsApp’s contact chooser. Add a business number in the widget settings for direct messages.</small>}<a className="lead-drawer-cta" href={href} target="_blank" rel="noreferrer" onClick={() => { onSend(); onClose(); }}>Continue to WhatsApp <ArrowUpRight size={16} /></a><small className="lead-external-note">WhatsApp opens outside this page. Your message is not sent until you confirm there.</small></section></div>;
}

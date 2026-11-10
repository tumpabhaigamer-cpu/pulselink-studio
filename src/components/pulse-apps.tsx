"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Plus } from "lucide-react";
import type { PublicLink, PublicProfileData } from "@/lib/types";

function contactFor(data: PublicProfileData) { return data.links.find((link) => ["CONTACT_FORM", "BOOKING_CALENDAR"].includes(link.type) && !link.isLocked); }
function emailFor(data: PublicProfileData) { return data.profile.socialLinks.find((social) => social.platform === "EMAIL" && social.url.startsWith("mailto:"))?.url; }

export function CalculatorApp({ link, data, onSelect }: { link: PublicLink; data: PublicProfileData; onSelect: (link: PublicLink) => void }) {
  const config = link.contextPayload.calculator && typeof link.contextPayload.calculator === "object" ? link.contextPayload.calculator as { items?: { name: string; price: number }[]; currency?: string } : {};
  const items = Array.isArray(config.items) ? config.items : []; const [selected, setSelected] = useState<string[]>([]);
  const total = items.filter((item) => selected.includes(item.name)).reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const currency = ["USD", "INR", "SGD", "AED"].includes(config.currency ?? "") ? config.currency! : "USD";
  const format = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  const contact = contactFor(data); const email = emailFor(data);
  return <><p className="pulse-app-description">Choose what you need for a quick, illustrative estimate.</p><div className="pulse-app-options">{items.map((item, index) => <button key={`${item.name}-${index}`} className={selected.includes(item.name) ? "selected" : ""} onClick={() => setSelected(selected.includes(item.name) ? selected.filter((name) => name !== item.name) : [...selected, item.name])}><span>{selected.includes(item.name) ? <Check size={14} /> : <Plus size={14} />}</span><strong>{item.name}</strong><small>+ {format(Number(item.price) || 0)}</small></button>)}{!items.length && <p>No services have been added yet.</p>}</div><div className="pulse-app-total"><span>ILLUSTRATIVE ESTIMATE</span><strong>{format(total)}</strong></div>{contact ? <button className="pulse-window-cta" onClick={() => onSelect(contact)}>Discuss this project <ArrowUpRight size={15} /></button> : email ? <a className="pulse-window-cta" href={`${email}?subject=${encodeURIComponent("Project inquiry")}&body=${encodeURIComponent(`I'm interested in: ${selected.join(", ")}. Estimated scope: ${format(total)}.`)}`}>Discuss this project <ArrowUpRight size={15} /></a> : null}</>;
}

export function PricingApp({ link, data, onSelect }: { link: PublicLink; data: PublicProfileData; onSelect: (link: PublicLink) => void }) {
  const config = link.contextPayload.pricing && typeof link.contextPayload.pricing === "object" ? link.contextPayload.pricing as { items?: { name: string; price: string; description: string }[] } : {};
  const items = Array.isArray(config.items) ? config.items : []; const contact = contactFor(data); const email = emailFor(data);
  return <><p className="pulse-app-description">Find the option that feels right for you.</p><div className="pulse-app-prices">{items.map((item, index) => <div key={`${item.name}-${index}`}><span>0{index + 1} / OPTION</span><strong>{item.name}</strong>{item.description && <p>{item.description}</p>}<b>{item.price || "Get in touch"}</b></div>)}{!items.length && <p>No options have been added yet.</p>}</div>{contact ? <button className="pulse-window-cta" onClick={() => onSelect(contact)}>Get in touch <ArrowUpRight size={15} /></button> : email ? <a className="pulse-window-cta" href={`${email}?subject=${encodeURIComponent(`Inquiry about ${link.title}`)}`}>Get in touch <ArrowUpRight size={15} /></a> : null}</>;
}

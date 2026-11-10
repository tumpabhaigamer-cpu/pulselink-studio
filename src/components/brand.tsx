import { Asterisk, Globe2, Mail, Music2 } from "lucide-react";
import type { SocialLink } from "@/lib/types";

export function Brand({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return <span className={`brand ${light ? "brand-light" : ""} ${compact ? "brand-compact" : ""}`}><span className="pulse-brand-mark" aria-hidden="true"><svg viewBox="0 0 28 28" fill="none"><path d="M4 15h5l2.2-6 3.1 11 2.7-7H24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span>pulse<span className="brand-link">link</span></span></span>;
}

export function SocialIcon({ platform, size = 16 }: { platform: string; size?: number }) {
  const props = { size, strokeWidth: 1.9, "aria-hidden": true as const };
  switch (platform.toUpperCase()) {
    case "INSTAGRAM": return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>;
    case "YOUTUBE": return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="4" /><path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none" /></svg>;
    case "TIKTOK": return <Music2 {...props} />;
    case "EMAIL": return <Mail {...props} />;
    case "X": return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 4l16 16M20 4 4 20" /></svg>;
    case "LINKEDIN": return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="9" width="4" height="12" rx="1" /><circle cx="5" cy="5" r="2" /><path d="M10 9h4v1.7c1-1.4 2.2-2 3.7-2 2.6 0 3.3 1.7 3.3 4.5V21h-4v-6.8c0-1.3-.2-2.4-1.5-2.4s-1.7 1.1-1.7 2.4V21H10z" /></svg>;
    default: return <Globe2 {...props} />;
  }
}

export function SocialRow({ socials, clickable = false }: { socials: SocialLink[]; clickable?: boolean }) {
  return <div className="social-row">{socials.slice().sort((a, b) => a.position - b.position).map((social, index) => clickable ? <a key={`${social.platform}-${index}`} href={social.url} target={social.url.startsWith("mailto:") ? undefined : "_blank"} rel="noreferrer" aria-label={social.platform}><SocialIcon platform={social.platform} /></a> : <span key={`${social.platform}-${index}`} aria-label={social.platform}><SocialIcon platform={social.platform} /></span>)}</div>;
}

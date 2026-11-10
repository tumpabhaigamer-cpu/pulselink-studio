"use client";

import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Check, Eye, Link2, MousePointer2, Search, Sparkles, UsersRound } from "lucide-react";
import { THEME_PRESETS, type DashboardData, type DashboardProfile } from "@/lib/types";

function number(value: number) { return new Intl.NumberFormat("en-US").format(value); }

export function AppearanceView({ profile, onSave }: { profile: DashboardProfile; onSave: (body: Record<string, unknown>) => Promise<void> }) {
  const [name, setName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(profile.coverUrl ?? "");
  const [preset, setPreset] = useState(profile.themeConfig.preset);
  const [socials, setSocials] = useState(() => Object.fromEntries(profile.socialLinks.map((social) => [social.platform, social.url])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await onSave({ displayName: name, bio, avatarUrl, coverUrl, themePreset: preset, socialLinks: Object.entries(socials).filter(([, url]) => url.trim()).map(([platform, url], position) => ({ platform, url: platform === "EMAIL" && !url.startsWith("mailto:") ? `mailto:${url}` : url, position })) });
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn’t save your profile."); }
    finally { setBusy(false); }
  }
  return <div className="view-content appearance-view"><div className="page-heading"><div><div className="eyebrow">MAKE IT YOURS</div><h1>Appearance</h1><p>A little personality goes a long way.</p></div></div>
    <form onSubmit={save} className="appearance-form">
      <section className="settings-card"><div className="settings-title"><div><h2>Your profile</h2><p>Introduce yourself to the world.</p></div><span className="settings-sparkle"><Sparkles size={18} /></span></div><div className="profile-settings-head">{avatarUrl ? <img src={avatarUrl} alt="Profile preview" /> : <div className="avatar-fallback">{name.slice(0, 1)}</div>}<div><strong>Profile photo</strong><p>Make a great first impression.</p></div></div><div className="settings-fields"><label>Display name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required /></label><label>Bio<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={300} rows={3} /><small>{bio.length}/300 characters</small></label><details className="simple-details"><summary>Change profile and cover images</summary><div className="image-fields"><label>Profile image URL<input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://..." /></label><label>Cover image URL<input value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="https://..." /></label></div></details></div></section>
      <section className="settings-card"><div className="settings-title"><div><h2>Choose your look</h2><p>Pick a palette that feels like you.</p></div></div><div className="theme-grid">{THEME_PRESETS.map((theme) => <button type="button" key={theme.preset} className={`theme-choice ${preset === theme.preset ? "active" : ""}`} onClick={() => setPreset(theme.preset)}><span className="theme-swatch" style={{ background: theme.background }}><span style={{ background: theme.buttonColor }} /><span style={{ background: theme.buttonColor }} /><span style={{ background: theme.buttonColor }} /></span><strong>{theme.preset}</strong>{preset === theme.preset && <span className="theme-check"><Check size={12} /></span>}</button>)}</div></section>
      <section className="settings-card"><div className="settings-title"><div><h2>Social icons</h2><p>Let people find you everywhere.</p></div></div><div className="social-fields">{["INSTAGRAM", "TIKTOK", "YOUTUBE", "EMAIL"].map((platform) => <label key={platform}>{platform === "EMAIL" ? "Email" : platform.charAt(0) + platform.slice(1).toLowerCase()}<input value={(socials[platform] ?? "").replace(platform === "EMAIL" ? /^mailto:/ : /$^/, "")} onChange={(event) => setSocials({ ...socials, [platform]: event.target.value })} placeholder={platform === "EMAIL" ? "hello@example.com" : `https://${platform.toLowerCase()}.com/...`} /></label>)}</div></section>
      {error && <div className="form-error">{error}</div>}<div className="settings-save"><span>Updates will appear in your live preview.</span><button className="primary-button" type="submit" disabled={busy}>{busy ? "Saving..." : "Save appearance"}</button></div>
    </form>
  </div>;
}

export function AnalyticsView({ data, onEditLinks }: { data: DashboardData; onEditLinks: () => void }) {
  const { stats, links } = data;
  const max = Math.max(...stats.series.map((day) => day.views), 1);
  const points = stats.series.map((day, index) => ({ x: 12 + index * 112, y: 160 - day.views / max * 130 }));
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = `${line} L ${points[points.length - 1].x} 175 L 12 175 Z`;
  const sorted = [...links].filter((link) => !["HEADER", "TEXT_BLOCK"].includes(link.type)).sort((a, b) => b.clicks - a.clicks);
  return <div className="view-content analytics-view"><div className="page-heading"><div><div className="eyebrow">THE BIG PICTURE</div><h1>Analytics</h1><p>Little numbers, big possibilities.</p></div><span className="date-pill">Last 7 days <span>⌄</span></span></div>
    <div className="analytics-note"><span className="live-pip" /> Demo workspace · includes sample activity and real visits.</div>
    <div className="stat-grid"><div className="stat-card"><div><span>Views</span><Eye size={17} /></div><strong>{number(stats.views)}</strong><small>Page visits in the last 7 days</small></div><div className="stat-card"><div><span>Clicks</span><MousePointer2 size={17} /></div><strong>{number(stats.clicks)}</strong><small>Link taps in the last 7 days</small></div><div className="stat-card"><div><span>Click-through rate</span><ArrowUpRight size={17} /></div><strong>{stats.ctr}%</strong><small>Clicks divided by page views</small></div></div>
    <section className="settings-card chart-card"><div className="settings-title"><div><h2>Views over time</h2><p>How your page is doing this week.</p></div><span className="chart-legend"><i /> Views</span></div><div className="chart-plot"><svg viewBox="0 0 700 185" preserveAspectRatio="none" role="img" aria-label="Views over the last seven days"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c4df70" stopOpacity="0.48" /><stop offset="100%" stopColor="#c4df70" stopOpacity="0.02" /></linearGradient></defs><path d="M 12 30 H 684 M 12 75 H 684 M 12 120 H 684 M 12 175 H 684" stroke="#eeefea" strokeWidth="1" fill="none" /><path d={area} fill="url(#chartFill)" /><path d={line} fill="none" stroke="#87a943" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />{points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="4" fill="#fff" stroke="#87a943" strokeWidth="2" vectorEffect="non-scaling-stroke" />)}</svg><div className="chart-labels">{stats.series.map((day, index) => <span key={index}>{day.label}</span>)}</div></div></section>
    <section className="settings-card top-links-card"><div className="settings-title"><div><h2>Top performing links</h2><p>What your visitors are loving.</p></div><button className="text-button" onClick={onEditLinks}>Manage links <ArrowUpRight size={14} /></button></div><div className="analytics-links">{sorted.length ? sorted.map((link) => <div className="analytics-link-row" key={link.id}>{link.thumbnailUrl ? <img src={link.thumbnailUrl} alt="" /> : <span className="analytics-link-placeholder"><Link2 size={16} /></span>}<div><strong>{link.title}</strong><span><i style={{ width: `${stats.clicks ? Math.max(3, link.clicks / stats.clicks * 100) : 0}%` }} /></span></div><b>{number(link.clicks)} <small>clicks</small></b></div>) : <p className="empty-text">Your link activity will show up here.</p>}</div></section>
  </div>;
}

export function AudienceView({ data }: { data: DashboardData }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => data.subscribers.filter((person) => `${person.fullName ?? ""} ${person.email ?? ""}`.toLowerCase().includes(query.toLowerCase())), [data.subscribers, query]);
  function exportCsv() {
    const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [["Name", "Email", "Joined"], ...filtered.map((person) => [person.fullName ?? "", person.email ?? "", person.createdAt.slice(0, 10)])].map((row) => row.map(quote).join(",")).join("\n");
    const objectUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = objectUrl; anchor.download = "linkspace-audience.csv"; anchor.click(); URL.revokeObjectURL(objectUrl);
  }
  return <div className="view-content audience-view"><div className="page-heading"><div><div className="eyebrow">YOUR PEOPLE</div><h1>Audience</h1><p>Get to know the people in your corner.</p></div><button className="secondary-button" onClick={exportCsv}><ArrowDownToLine size={16} /> Export CSV</button></div>
    <div className="audience-highlight"><div className="audience-highlight-icon"><UsersRound size={23} /></div><div><span>YOUR COMMUNITY</span><strong>{number(data.stats.subscribers)} subscribers</strong><p>Every connection starts somewhere good.</p></div><Sparkles className="audience-sparkle" size={52} strokeWidth={1} /></div>
    <section className="settings-card audience-card"><div className="settings-title"><div><h2>Your subscribers</h2><p>People who signed up through your Linkspace.</p></div></div><div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your audience" aria-label="Search your audience" /></div><div className="audience-table"><div className="audience-table-head"><span>CONTACT</span><span>EMAIL</span><span>JOINED</span></div>{filtered.map((person) => <div className="audience-row" key={person.id}><div><span className="contact-avatar">{(person.fullName || person.email || "?").charAt(0).toUpperCase()}</span><strong>{person.fullName || "Subscriber"}</strong></div><span>{person.email || "—"}</span><span>{new Date(person.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div>)}{!filtered.length && <div className="audience-empty">No subscribers found. Add an email signup block to start growing your audience.</div>}</div><div className="table-foot">Showing {filtered.length} of {data.subscribers.length} subscribers <span>Demo workspace includes sample contacts.</span></div></section>
  </div>;
}

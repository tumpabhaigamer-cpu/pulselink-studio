import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { analyticsEvents, crmSubscribers, links, profiles, users } from "@/db/schema";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import { THEME_PRESETS, type DashboardData, type DashboardLink, type DashboardProfile, type LockConfig, type PublicProfileData } from "@/lib/types";
import { sanitizeYoutubeSettings } from "@/lib/youtube-common";
import { resolveYoutube } from "@/lib/youtube";
import { defaultPulseWidget } from "@/lib/widget-schema";

const pendingWorkspaces = new Map<string, Promise<typeof profiles.$inferSelect>>();

async function createDemoProfile(tokenHash: string) {
  const demoEmail = `demo+${tokenHash}@linkspace.example`;
  await db.insert(users).values({ email: demoEmail }).onConflictDoNothing({ target: users.email });
  const [user] = await db.select().from(users).where(eq(users.email, demoEmail)).limit(1);
  if (!user) throw new Error("Could not create demo workspace");
  const [owned] = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  if (owned) return owned;
  const base = {
    userId: user.id,
    tier: "FREE",
    displayName: "Maya Chen",
    bio: "Designer, creator & collector of little moments.\nMaking space for good ideas ✨",
    avatarUrl: "/images/maya-portrait.jpg",
    coverUrl: "/images/studio-cover.jpg",
    themeConfig: { ...THEME_PRESETS[3], preset: "Pulse Dark", background: "#101116", textColor: "#f5f7ed", buttonColor: "#252731", buttonTextColor: "#ffffff", layoutMode: "EASY_OS" as const, motion: true, glow: true },
    socialLinks: [
      { platform: "INSTAGRAM", url: "https://instagram.com/", position: 0 },
      { platform: "TIKTOK", url: "https://tiktok.com/", position: 1 },
      { platform: "YOUTUBE", url: "https://youtube.com/", position: 2 },
      { platform: "EMAIL", url: "mailto:hello@example.com", position: 3 },
    ],
  };
  let [created] = await db.insert(profiles).values({ ...base, username: "mayastudio" }).onConflictDoNothing({ target: profiles.username }).returning();
  if (!created) [created] = await db.insert(profiles).values({ ...base, username: `mayastudio-${tokenHash.slice(0, 8)}` }).onConflictDoNothing({ target: profiles.username }).returning();
  const profile = created ?? (await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1))[0];
  if (!profile) throw new Error("Could not load demo workspace");
  if (created) {
    const neonId = randomUUID();
    const starterDock = defaultPulseWidget("TASKBAR_DOCK");
    if (starterDock.type === "TASKBAR_DOCK") starterDock.content.items = starterDock.content.items.map((item) => item.id === "chat" ? { ...item, action: { kind: "OPEN_WIDGET", value: neonId, label: "WhatsApp" } } : item);
    const inserted = await db.insert(links).values([
      { profileId: profile.id, type: "OS_WINDOW_CARD", title: "Selected work", thumbnailUrl: "/images/demo-creator.jpg", position: 0, layoutSize: "FEATURED", animation: "REVEAL", contextPayload: { pulseWidget: defaultPulseWidget("OS_WINDOW_CARD") } },
      { profileId: profile.id, type: "VERTICAL_VIDEO_REEL", title: "Watch the studio reel", thumbnailUrl: "/images/demo-creator.jpg", position: 1, animation: "REVEAL", contextPayload: { pulseWidget: defaultPulseWidget("VERTICAL_VIDEO_REEL") } },
      { id: neonId, profileId: profile.id, type: "NEON_ACTION_BUTTON", title: "Let’s connect", position: 2, animation: "PULSE", contextPayload: { pulseWidget: defaultPulseWidget("NEON_ACTION_BUTTON") } },
      { profileId: profile.id, type: "BENTO_SHOWCASE_GRID", title: "Selected projects", thumbnailUrl: "/images/demo-creator.jpg", position: 3, layoutSize: "FEATURED", animation: "REVEAL", contextPayload: { pulseWidget: defaultPulseWidget("BENTO_SHOWCASE_GRID") } },
      { profileId: profile.id, type: "TASKBAR_DOCK", title: "Quick actions", position: 4, animation: "REVEAL", contextPayload: { pulseWidget: starterDock } },
      { profileId: profile.id, type: "BOOKING_CALENDAR", title: "Book a discovery call", url: "https://example.com/work-with-me", thumbnailUrl: "/images/studio-cover.jpg", position: 5, animation: "FLOAT", contextPayload: { widget: { kind: "BOOKING", subtitle: "Let’s make something good.", accent: "#c9ff69" } } },
      { profileId: profile.id, type: "CALCULATOR", title: "Scope calculator", position: 6, contextPayload: { calculator: { currency: "USD", items: [{ name: "Landing page", price: 1200 }, { name: "Brand identity", price: 800 }, { name: "Motion & interactions", price: 600 }] }, widget: { kind: "CALCULATOR", subtitle: "Get a quick project estimate.", accent: "#b7a5ff" } } },
    ]).returning();
    const viewCounts = [145, 174, 158, 203, 188, 216, 241];
    const clickCounts = [48, 57, 52, 68, 62, 78, 85];
    const events: (typeof analyticsEvents.$inferInsert)[] = [];
    const now = Date.now();
    for (let day = 0; day < 7; day++) {
      const date = new Date(now - (6 - day) * 86400000);
      date.setUTCHours(0, 0, 0, 0);
      const elapsed = Math.min(86300000, Math.max(1000, now - date.getTime()));
      for (let i = 0; i < viewCounts[day]; i++) {
        events.push({ profileId: profile.id, eventType: "PAGE_VIEW", visitorHash: `demo-view-${day}-${i}`, deviceOs: i % 3 === 0 ? "Desktop" : "iOS", countryCode: i % 5 === 0 ? "GB" : "US", createdAt: new Date(date.getTime() + Math.floor((i + 1) * elapsed / (viewCounts[day] + 1))) });
      }
      for (let i = 0; i < clickCounts[day]; i++) {
        const linkIndex = i % 10 < 4 ? 0 : i % 10 < 7 ? 1 : i % 10 < 9 ? 2 : 3;
        events.push({ profileId: profile.id, linkId: inserted[linkIndex].id, eventType: "LINK_CLICK", visitorHash: `demo-click-${day}-${i}`, deviceOs: i % 3 === 0 ? "Desktop" : "iOS", countryCode: "US", createdAt: new Date(date.getTime() + Math.floor((i + 1) * elapsed / (clickCounts[day] + 1))) });
      }
    }
    await db.insert(analyticsEvents).values(events);
    await db.insert(crmSubscribers).values([
      { profileId: profile.id, email: "alex@example.com", fullName: "Alex Morgan", createdAt: new Date(now - 86400000) },
      { profileId: profile.id, email: "jordan@example.com", fullName: "Jordan Lee", createdAt: new Date(now - 2 * 86400000) },
      { profileId: profile.id, email: "sam@example.com", fullName: "Sam Rivera", createdAt: new Date(now - 4 * 86400000) },
    ]);
  }
  return profile;
}

export async function ensureDemoProfile() {
  const token = (await cookies()).get("linkspace_workspace")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new Error("Workspace session required");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  let pending = pendingWorkspaces.get(tokenHash);
  if (!pending) { pending = createDemoProfile(tokenHash); pendingWorkspaces.set(tokenHash, pending); }
  try {
    const seeded = await pending;
    const [fresh] = await db.select().from(profiles).where(eq(profiles.id, seeded.id)).limit(1);
    return fresh ?? seeded;
  } finally { pendingWorkspaces.delete(tokenHash); }
}

export function safeLockConfig(lock: LockConfig | null | undefined): LockConfig {
  const config = lock ?? {};
  return {
    codeLock: { enabled: !!config.codeLock?.enabled, hasPasscode: !!config.codeLock?.passcodeHash },
    ageLock: { enabled: !!config.ageLock?.enabled, minAge: config.ageLock?.minAge ?? 18 },
    subscribeLock: { enabled: !!config.subscribeLock?.enabled, collectEmail: true, collectPhone: !!config.subscribeLock?.collectPhone },
    sensitiveWarning: { enabled: !!config.sensitiveWarning?.enabled },
  };
}

export function isLocked(lock: LockConfig | null | undefined) {
  return !!(lock?.codeLock?.enabled || lock?.ageLock?.enabled || lock?.subscribeLock?.enabled || lock?.sensitiveWarning?.enabled);
}

export function isScheduledNow(link: typeof links.$inferSelect) {
  const now = Date.now();
  return link.isActive && !link.isArchived && (!link.scheduleStart || link.scheduleStart.getTime() <= now) && (!link.scheduleEnd || link.scheduleEnd.getTime() > now);
}

function profileForClient(profile: typeof profiles.$inferSelect): DashboardProfile {
  return { id: profile.id, username: profile.username, tier: profile.tier, displayName: profile.displayName, bio: profile.bio, avatarUrl: profile.avatarUrl, coverUrl: profile.coverUrl, themeConfig: profile.themeConfig, socialLinks: profile.socialLinks, shopEnabled: profile.shopEnabled };
}

function linkForClient(link: typeof links.$inferSelect, clicks = 0): DashboardLink {
  return { id: link.id, profileId: link.profileId, type: link.type, title: link.title, url: link.url, thumbnailUrl: link.thumbnailUrl, position: link.position, parentId: link.parentId, isArchived: link.isArchived, isActive: link.isActive, isPinned: link.isPinned, isSpotlight: link.isSpotlight, animation: link.animation, layoutSize: link.layoutSize, scheduleStart: link.scheduleStart?.toISOString() ?? null, scheduleEnd: link.scheduleEnd?.toISOString() ?? null, lockConfig: safeLockConfig(link.lockConfig), contextPayload: link.contextPayload, clicks };
}

export async function getDashboardData(): Promise<DashboardData> {
  const profile = await ensureDemoProfile();
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 6);
  const [linkRows, eventRows, subscriberRows] = await Promise.all([
    db.select().from(links).where(eq(links.profileId, profile.id)).orderBy(asc(links.position), asc(links.createdAt)),
    db.select().from(analyticsEvents).where(and(eq(analyticsEvents.profileId, profile.id), gte(analyticsEvents.createdAt, start))),
    db.select().from(crmSubscribers).where(eq(crmSubscribers.profileId, profile.id)).orderBy(desc(crmSubscribers.createdAt)),
  ]);
  const series = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start.getTime() + i * 86400000);
    const dayKey = day.toISOString().slice(0, 10);
    const dayEvents = eventRows.filter((event) => event.createdAt.toISOString().slice(0, 10) === dayKey);
    return { label: day.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }), views: dayEvents.filter((event) => event.eventType === "PAGE_VIEW").length, clicks: dayEvents.filter((event) => event.eventType === "LINK_CLICK").length };
  });
  const views = eventRows.filter((event) => event.eventType === "PAGE_VIEW").length;
  const clicks = eventRows.filter((event) => event.eventType === "LINK_CLICK").length;
  return {
    profile: profileForClient(profile),
    links: linkRows.map((link) => linkForClient(link, eventRows.filter((event) => event.eventType === "LINK_CLICK" && event.linkId === link.id).length)),
    stats: { views, clicks, ctr: views ? Math.round(clicks / views * 1000) / 10 : 0, subscribers: subscriberRows.length, windowOpens: eventRows.filter((event) => event.eventType === "WINDOW_OPEN").length, videoPlays: eventRows.filter((event) => event.eventType === "VIDEO_PLAY").length, watchSeconds: eventRows.filter((event) => event.eventType === "VIDEO_WATCH").reduce((sum, event) => sum + (event.durationSeconds ?? 0), 0), actionClicks: eventRows.filter((event) => event.eventType === "CTA_CLICK").length, whatsappClicks: eventRows.filter((event) => event.eventType === "WHATSAPP_CLICK").length, bookingOpens: eventRows.filter((event) => event.eventType === "BOOKING_OPEN").length, engagement: linkRows.map((link) => { const events = eventRows.filter((event) => event.linkId === link.id); return { linkId: link.id, title: link.title, windowOpens: events.filter((event) => event.eventType === "WINDOW_OPEN").length, videoPlays: events.filter((event) => event.eventType === "VIDEO_PLAY").length, watchSeconds: events.filter((event) => event.eventType === "VIDEO_WATCH").reduce((sum, event) => sum + (event.durationSeconds ?? 0), 0), actionClicks: events.filter((event) => event.eventType === "CTA_CLICK").length, whatsappClicks: events.filter((event) => event.eventType === "WHATSAPP_CLICK").length, bookingOpens: events.filter((event) => event.eventType === "BOOKING_OPEN").length }; }), series, sources: Object.entries(eventRows.filter((event) => event.eventType === "PAGE_VIEW").reduce<Record<string, number>>((acc, event) => { const source = event.referrerDomain || "Direct / unknown"; acc[source] = (acc[source] ?? 0) + 1; return acc; }, {})).map(([name, count]) => ({ name, views: count })).sort((a, b) => b.views - a.views).slice(0, 5) },
    subscribers: subscriberRows.map((subscriber) => ({ id: subscriber.id, email: subscriber.email, fullName: subscriber.fullName, message: typeof subscriber.customFields.message === "string" ? subscriber.customFields.message : null, createdAt: subscriber.createdAt.toISOString() })),
  };
}

export async function getPublicProfile(username: string): Promise<PublicProfileData | null> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.username, username.toLowerCase())).limit(1);
  if (!profile) return null;
  const rows = await db.select().from(links).where(eq(links.profileId, profile.id)).orderBy(asc(links.position), asc(links.createdAt));
  const active = rows.filter(isScheduledNow);
  const visibleCollections = new Set(active.filter((row) => row.type === "COLLECTION").map((row) => row.id));
  const publicLinks = await Promise.all(active.filter((row) => !row.parentId || visibleCollections.has(row.parentId)).map(async (row) => {
    const item = linkForClient(row);
    const locked = isLocked(row.lockConfig);
    let contextPayload = locked ? {} : item.contextPayload;
    if (!locked && row.type === "YOUTUBE_VIDEO" && row.url) {
      const settings = sanitizeYoutubeSettings(row.contextPayload.youtube);
      if (settings.source !== "SINGLE") {
        try {
          const feed = await resolveYoutube(row.url, settings, row.profileId);
          contextPayload = { ...contextPayload, youtube: { ...settings, videos: feed.videos, channelId: feed.channelId ?? settings.channelId }, youtubeChannel: { title: feed.channelTitle, thumbnailUrl: feed.channelThumbnail, subscriberCount: feed.subscriberCount, viewCount: feed.viewCount, videoCount: feed.videoCount } };
        } catch { contextPayload = { ...contextPayload, youtube: settings }; }
      }
    }
    return { id: item.id, type: item.type, title: item.title, url: locked ? null : item.url, thumbnailUrl: item.thumbnailUrl, position: item.position, parentId: item.parentId, isArchived: item.isArchived, isActive: item.isActive, isPinned: item.isPinned, isSpotlight: item.isSpotlight, animation: item.animation, layoutSize: item.layoutSize, scheduleStart: item.scheduleStart, scheduleEnd: item.scheduleEnd, lockConfig: item.lockConfig, contextPayload, isLocked: locked };
  }));
  return { profile: profileForClient(profile), links: publicLinks };
}

import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { links, profiles } from "@/db/schema";
import { ensureDemoProfile } from "@/lib/store";
import { getPulseTemplate } from "@/lib/pulse-templates";
import { defaultPulseWidget } from "@/lib/widget-schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const profile = await ensureDemoProfile(); const body = await request.json() as { slug?: unknown };
    const template = typeof body.slug === "string" ? getPulseTemplate(body.slug) : undefined;
    if (!template) return Response.json({ error: "Template not found." }, { status: 404 });
    const existing = await db.select({ position: links.position, type: links.type, isArchived: links.isArchived }).from(links).where(eq(links.profileId, profile.id));
    const base = existing.length ? Math.max(...existing.map((item) => item.position)) + 1 : 0;
    const isGym = template.slug === "onyx-fitness"; const isCafe = template.slug === "morrow-house"; const contactId = randomUUID(); const neonId = randomUUID();
    const os = defaultPulseWidget("OS_WINDOW_CARD"); const reel = defaultPulseWidget("VERTICAL_VIDEO_REEL"); const action = defaultPulseWidget("NEON_ACTION_BUTTON"); const bento = defaultPulseWidget("BENTO_SHOWCASE_GRID"); const dock = defaultPulseWidget("TASKBAR_DOCK");
    if (os.type !== "OS_WINDOW_CARD" || reel.type !== "VERTICAL_VIDEO_REEL" || action.type !== "NEON_ACTION_BUTTON" || bento.type !== "BENTO_SHOWCASE_GRID" || dock.type !== "TASKBAR_DOCK") throw new Error("Invalid template");
    os.appearance.accent = template.accent; os.content = { eyebrow: template.category, heading: isGym ? "A different kind of strong." : isCafe ? "A little space for good days." : "Work that moves people.", description: template.description, imageUrl: template.image, action: { kind: "OPEN_WIDGET", value: contactId, label: template.primary } };
    reel.appearance.accent = template.accent; reel.content = { ...reel.content, videoUrl: template.video, posterUrl: template.image, heading: template.headline.join(" "), subheading: template.description, action: { kind: "OPEN_WIDGET", value: contactId, label: template.primary } };
    action.appearance.accent = template.accent; action.content = { heading: template.primary, subheading: "Choose an option and start a conversation.", icon: "WHATSAPP", action: { kind: "WHATSAPP", value: "https://wa.me/?text=Hello%21", label: "Chat on WhatsApp" }, leadDrawer: { enabled: true, heading: isGym ? "What’s your goal?" : isCafe ? "How can we help?" : "What are you building?", options: isGym ? ["Personal training", "Free trial pass", "Class schedule"] : isCafe ? ["Table reservation", "Menu inquiry", "Private event"] : ["Custom website", "Brand identity", "Motion design"], messageTemplate: "Hi! I’m {name} and I’m interested in {option}. Could you share more details?" } };
    bento.appearance.accent = template.accent; bento.content.heading = isGym ? "Find your fit" : isCafe ? "A taste of Morrow" : "Selected projects"; bento.content.items = template.tags.map((tag, index) => ({ id: `template-${index}`, title: tag, category: isGym ? "TRAINING" : isCafe ? "THE MENU" : "WORK", caption: template.description, imageUrl: index === 0 ? template.image : index === 1 ? "/images/studio-cover.jpg" : template.image, price: "", action: { kind: "OPEN_WIDGET", value: contactId, label: template.primary } }));
    dock.appearance.accent = template.accent; dock.content.items = [ { id: "home", label: "Home", icon: "HOME", action: { kind: "NONE", value: "", label: "Home" } }, { id: "contact", label: template.primary, icon: "CALENDAR", action: { kind: "OPEN_WIDGET", value: contactId, label: template.primary } }, { id: "chat", label: "WhatsApp", icon: "WHATSAPP", action: { kind: "OPEN_WIDGET", value: neonId, label: "WhatsApp" } } ];
    const items: (typeof links.$inferInsert)[] = [
      { profileId: profile.id, type: os.type, title: isGym ? "Inside the studio" : isCafe ? "Welcome to Morrow" : "Selected work", thumbnailUrl: template.image, position: base, layoutSize: "FEATURED", animation: "REVEAL", contextPayload: { pulseWidget: os } },
      { profileId: profile.id, type: reel.type, title: isGym ? "Studio tour" : isCafe ? "A moment at Morrow" : "Studio reel", thumbnailUrl: template.image, position: base + 1, animation: "REVEAL", contextPayload: { pulseWidget: reel } },
      { id: neonId, profileId: profile.id, type: action.type, title: template.primary, position: base + 2, animation: "PULSE", contextPayload: { pulseWidget: action } },
      { profileId: profile.id, type: bento.type, title: bento.content.heading, thumbnailUrl: template.image, position: base + 3, layoutSize: "FEATURED", animation: "REVEAL", contextPayload: { pulseWidget: bento } },
      { id: contactId, profileId: profile.id, type: "CONTACT_FORM", title: template.primary, position: base + 4, contextPayload: { contact: { collectName: true, collectMessage: true, consentText: "Your details will only be used to respond to your inquiry." }, widget: { kind: "CONTACT", subtitle: "Let’s make something happen.", accent: template.accent } } },
      isGym ? { profileId: profile.id, type: "PRICING", title: "Explore the programs", position: base + 5, contextPayload: { pricing: { items: [{ name: "The intro", price: "Free trial", description: "Meet your coach and explore the studio." }, { name: "Unlimited", price: "Ask for pricing", description: "Classes, strength, and community." }] } } } : isCafe ? { profileId: profile.id, type: "PRICING", title: "Explore the menu", position: base + 5, contextPayload: { pricing: { items: [{ name: "House flat white", price: "$6", description: "Made just the way you like it." }, { name: "Morrow breakfast", price: "$19", description: "Seasonal greens, sourdough, eggs." }] } } } : { profileId: profile.id, type: "CALCULATOR", title: "Scope calculator", position: base + 5, contextPayload: { calculator: { currency: "USD", items: [{ name: "Landing page", price: 1200 }, { name: "Brand identity", price: 800 }, { name: "Motion & interactions", price: 600 }] } } },
    ];
    if (!existing.some((item) => item.type === "TASKBAR_DOCK" && !item.isArchived)) items.push({ profileId: profile.id, type: dock.type, title: "Quick actions", position: base + 6, animation: "REVEAL", contextPayload: { pulseWidget: dock } });
    await db.transaction(async (tx) => { await tx.insert(links).values(items); await tx.update(profiles).set({ themeConfig: { ...profile.themeConfig, layoutMode: template.mode, motion: true, glow: true, accentColor: template.accent, motionPreset: template.mode === "EASY_OS" ? "GLASS_OS" : "NEON_CYBER" }, coverUrl: template.image, updatedAt: new Date() }).where(eq(profiles.id, profile.id)); });
    return Response.json({ ok: true, added: items.length });
  } catch { return Response.json({ error: "Couldn’t apply that template." }, { status: 400 }); }
}

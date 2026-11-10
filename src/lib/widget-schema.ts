import { z } from "zod";

export const PULSE_WIDGET_TYPES = ["OS_WINDOW_CARD", "VERTICAL_VIDEO_REEL", "NEON_ACTION_BUTTON", "BENTO_SHOWCASE_GRID", "TASKBAR_DOCK"] as const;
export type PulseWidgetType = typeof PULSE_WIDGET_TYPES[number];
export const isPulseWidgetType = (value: string): value is PulseWidgetType => (PULSE_WIDGET_TYPES as readonly string[]).includes(value);

const shortText = z.string().max(200);
const mediaUrl = z.string().max(2048);
export const ActionSchema = z.object({ kind: z.enum(["NONE", "EXTERNAL", "WHATSAPP", "MAPS", "CALL", "EMAIL", "OPEN_WIDGET"]), value: z.string().max(2048), label: z.string().max(80) });
const AppearanceSchema = z.object({ accent: z.string().regex(/^#[0-9a-fA-F]{6}$/), surface: z.enum(["GLASS", "SOLID"]), animation: z.enum(["NONE", "REVEAL", "FLOAT", "PULSE"]) });
const base = { schemaVersion: z.literal(1), appearance: AppearanceSchema };
export const OSWindowCardSchema = z.object({ ...base, type: z.literal("OS_WINDOW_CARD"), content: z.object({ eyebrow: z.string().max(80), heading: shortText, description: z.string().max(1000), imageUrl: mediaUrl, action: ActionSchema }) });
export const VerticalVideoReelSchema = z.object({ ...base, type: z.literal("VERTICAL_VIDEO_REEL"), content: z.object({ videoUrl: mediaUrl, posterUrl: mediaUrl, heading: shortText, subheading: z.string().max(300), autoplay: z.boolean(), muted: z.boolean(), loop: z.boolean(), action: ActionSchema }) });
export const LeadDrawerSchema = z.object({ enabled: z.boolean(), heading: z.string().max(120), options: z.array(z.string().min(1).max(80)).min(1).max(8), messageTemplate: z.string().min(1).max(500) });
export type LeadDrawerConfig = z.infer<typeof LeadDrawerSchema>;
export const NeonActionButtonSchema = z.object({ ...base, type: z.literal("NEON_ACTION_BUTTON"), content: z.object({ heading: shortText, subheading: z.string().max(300), icon: z.enum(["ARROW", "WHATSAPP", "CALENDAR", "MAP", "PHONE", "MAIL"]), action: ActionSchema, leadDrawer: LeadDrawerSchema.optional() }) });
export const BentoShowcaseGridSchema = z.object({ ...base, type: z.literal("BENTO_SHOWCASE_GRID"), content: z.object({ heading: shortText, layout: z.enum(["GRID", "CAROUSEL"]), filterEnabled: z.boolean(), items: z.array(z.object({ id: z.string().min(1).max(40), title: shortText, category: z.string().max(60), caption: z.string().max(300), imageUrl: mediaUrl, price: z.string().max(40), action: ActionSchema })).max(8) }) });
export const TaskbarDockSchema = z.object({ ...base, type: z.literal("TASKBAR_DOCK"), content: z.object({ position: z.literal("BOTTOM"), showBranding: z.boolean(), items: z.array(z.object({ id: z.string().min(1).max(40), label: z.string().max(40), icon: z.enum(["HOME", "LINK", "WHATSAPP", "CALENDAR", "MAP", "MAIL", "PHONE", "PLAY"]), action: ActionSchema })).max(5) }) });
export const PulseWidgetSchema = z.discriminatedUnion("type", [OSWindowCardSchema, VerticalVideoReelSchema, NeonActionButtonSchema, BentoShowcaseGridSchema, TaskbarDockSchema]);
export type PulseWidget = z.infer<typeof PulseWidgetSchema>;
export type PulseAction = z.infer<typeof ActionSchema>;

export const ThemeStateSchema = z.object({ preset: z.string(), background: z.string(), textColor: z.string(), buttonColor: z.string(), buttonTextColor: z.string(), buttonRadius: z.string(), showLogo: z.boolean(), fontFamily: z.enum(["DM Sans", "Manrope", "Georgia"]).optional(), buttonShadow: z.enum(["none", "soft", "hard"]).optional(), gradientEnd: z.string().optional(), layoutMode: z.enum(["EASY_OS", "NEON_FUNNEL"]).optional(), motion: z.boolean().optional(), glow: z.boolean().optional(), accentColor: z.string().optional(), motionPreset: z.enum(["NEON_CYBER", "GLASS_OS", "KINETIC_MINIMAL"]).optional() });
export const PageStateSchema = z.object({ version: z.literal("1.0.0"), profile: z.object({ id: z.uuid(), username: z.string(), displayName: z.string(), bio: z.string(), avatarUrl: z.string().nullable(), coverUrl: z.string().nullable(), tier: z.string(), shopEnabled: z.boolean(), socialLinks: z.array(z.object({ platform: z.string(), url: z.string(), position: z.number().int() })), mode: z.enum(["EASY_OS", "NEON_FUNNEL"]), theme: ThemeStateSchema }), grid: z.object({ desktopColumns: z.literal(2), mobileColumns: z.literal(1), snap: z.literal(true) }), widgets: z.array(z.object({ id: z.uuid(), type: z.string(), title: z.string(), url: z.string().nullable(), thumbnailUrl: z.string().nullable(), parentId: z.uuid().nullable(), position: z.number().int(), layout: z.object({ size: z.enum(["STANDARD", "FEATURED"]) }), enabled: z.boolean(), archived: z.boolean(), animation: z.string(), schedule: z.object({ start: z.string().nullable(), end: z.string().nullable() }), gates: z.object({ codeLock: z.object({ enabled: z.boolean(), hasPasscode: z.boolean() }), ageLock: z.object({ enabled: z.boolean(), minAge: z.number() }), subscribeLock: z.object({ enabled: z.boolean(), collectEmail: z.boolean() }), sensitiveWarning: z.object({ enabled: z.boolean() }) }), config: PulseWidgetSchema.nullable(), legacyContext: z.record(z.string(), z.unknown()).nullable() })) });

const appearance = { accent: "#c9ff67", surface: "GLASS" as const, animation: "REVEAL" as const };
const noAction: PulseAction = { kind: "NONE", value: "", label: "Explore" };
const defaults: Record<PulseWidgetType, PulseWidget> = {
  OS_WINDOW_CARD: { schemaVersion: 1, type: "OS_WINDOW_CARD", appearance, content: { eyebrow: "SELECTED WORK / 01", heading: "A window into my world", description: "A little look at the ideas, projects, and stories behind the work.", imageUrl: "/images/demo-creator.jpg", action: { kind: "EXTERNAL", value: "https://example.com/portfolio", label: "Explore the project" } } },
  VERTICAL_VIDEO_REEL: { schemaVersion: 1, type: "VERTICAL_VIDEO_REEL", appearance: { ...appearance, accent: "#bba6ff" }, content: { videoUrl: "https://videos.pexels.com/video-files/39645503/16901721_1080_1920_30fps.mp4", posterUrl: "/images/demo-creator.jpg", heading: "A little behind the scenes", subheading: "A closer look, right here.", autoplay: true, muted: true, loop: true, action: { kind: "EXTERNAL", value: "https://example.com", label: "Explore more" } } },
  NEON_ACTION_BUTTON: { schemaVersion: 1, type: "NEON_ACTION_BUTTON", appearance: { ...appearance, animation: "PULSE" }, content: { heading: "Let’s make something happen", subheading: "One tap to start a conversation.", icon: "WHATSAPP", action: { kind: "WHATSAPP", value: "https://wa.me/?text=Hello%21", label: "Chat on WhatsApp" }, leadDrawer: { enabled: true, heading: "What can we help with?", options: ["Personal training", "Table reservation", "Custom website"], messageTemplate: "Hi! I’m {name} and I’m interested in {option}. Could you share more details?" } } },
  BENTO_SHOWCASE_GRID: { schemaVersion: 1, type: "BENTO_SHOWCASE_GRID", appearance, content: { heading: "A few favorite things", layout: "GRID", filterEnabled: true, items: [ { id: "item-1", title: "Digital experiences", category: "WORK", caption: "Thoughtful experiences, made to move.", imageUrl: "/images/demo-creator.jpg", price: "", action: noAction }, { id: "item-2", title: "The daily ritual", category: "LIFESTYLE", caption: "A little space for the good stuff.", imageUrl: "/images/demo-cafe.jpg", price: "", action: noAction }, { id: "item-3", title: "Built for more", category: "WORK", caption: "Movement and energy in every detail.", imageUrl: "/images/demo-gym.jpg", price: "", action: noAction }, { id: "item-4", title: "Behind the scenes", category: "LIFESTYLE", caption: "The process behind the pixels.", imageUrl: "/images/studio-cover.jpg", price: "", action: noAction } ] } },
  TASKBAR_DOCK: { schemaVersion: 1, type: "TASKBAR_DOCK", appearance, content: { position: "BOTTOM", showBranding: true, items: [ { id: "home", label: "Home", icon: "HOME", action: { kind: "NONE", value: "", label: "Home" } }, { id: "chat", label: "WhatsApp", icon: "WHATSAPP", action: { kind: "WHATSAPP", value: "https://wa.me/?text=Hello%21", label: "WhatsApp" } }, { id: "email", label: "Email", icon: "MAIL", action: { kind: "EMAIL", value: "mailto:hello@example.com", label: "Email" } } ] } },
};
export function defaultPulseWidget(type: PulseWidgetType): PulseWidget { return structuredClone(defaults[type]); }

function safeMedia(value: string) { if (!value) return true; if (value.startsWith("/images/") && !value.includes("..")) return true; try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password; } catch { return false; } }
export function safeAction(action: PulseAction) {
  if (action.kind === "NONE") return action.value === "";
  if (action.kind === "OPEN_WIDGET") return /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(action.value);
  if (action.kind === "CALL") return /^tel:\+?[\d(). -]{6,30}$/i.test(action.value);
  if (action.kind === "EMAIL") return /^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+(?:\?[^\s]*)?$/i.test(action.value);
  try { const url = new URL(action.value); if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return false; if (action.kind === "WHATSAPP") return ["wa.me", "api.whatsapp.com"].includes(url.hostname.toLowerCase()); if (action.kind === "MAPS") return url.hostname === "maps.google.com" || url.hostname === "google.com" || url.hostname.endsWith(".google.com") || url.hostname === "maps.app.goo.gl"; return true; } catch { return false; }
}
export function validatePulseWidget(input: unknown) {
  const result = PulseWidgetSchema.safeParse(input);
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid widget configuration." };
  const widget = result.data; const actions: PulseAction[] = []; const media: string[] = [];
  if (widget.type === "OS_WINDOW_CARD") { actions.push(widget.content.action); media.push(widget.content.imageUrl); }
  if (widget.type === "VERTICAL_VIDEO_REEL") { actions.push(widget.content.action); media.push(widget.content.videoUrl, widget.content.posterUrl); if (!widget.content.videoUrl) return { error: "Add a video URL." }; if (widget.content.autoplay && !widget.content.muted) return { error: "Autoplay video must be muted." }; }
  if (widget.type === "NEON_ACTION_BUTTON") { actions.push(widget.content.action); if (widget.content.leadDrawer?.enabled && widget.content.action.kind !== "WHATSAPP") return { error: "Choose a WhatsApp action for the lead drawer, or turn the drawer off." }; }
  if (widget.type === "BENTO_SHOWCASE_GRID") { for (const item of widget.content.items) { actions.push(item.action); media.push(item.imageUrl); } if (!widget.content.items.length) return { error: "Add at least one showcase item." }; }
  if (widget.type === "TASKBAR_DOCK") { for (const item of widget.content.items) actions.push(item.action); if (!widget.content.items.length) return { error: "Add at least one dock shortcut." }; }
  if (actions.some((action) => !safeAction(action))) return { error: "Check the action destination. Use a valid URL, phone, email, or widget ID for its action type." };
  if (media.some((url) => !safeMedia(url))) return { error: "Media must use a valid HTTP(S) URL or a local image path." };
  return { widget };
}

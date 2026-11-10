import type { links } from "@/db/schema";
import { buildGate, normalizeHttpUrl, normalizeImageUrl } from "@/lib/security";
import { sanitizeYoutubeSettings, youtubeVideoId } from "@/lib/youtube-common";
import { isPulseWidgetType } from "@/lib/widget-schema";

const allowedTypes = ["CLASSIC_LINK", "HEADER", "TEXT_BLOCK", "COLLECTION", "YOUTUBE_VIDEO", "VIDEO_TOUR", "PRICING", "CALCULATOR", "MUSIC_SMART_LINK", "DIGITAL_PRODUCT", "BOOKING_CALENDAR", "EMAIL_SIGNUP", "CONTACT_FORM", "TIP_JAR", "PROMO_CODE", "OS_WINDOW_CARD", "VERTICAL_VIDEO_REEL", "NEON_ACTION_BUTTON", "BENTO_SHOWCASE_GRID", "TASKBAR_DOCK"];
const noUrlTypes = ["HEADER", "TEXT_BLOCK", "COLLECTION", "EMAIL_SIGNUP", "CONTACT_FORM", "PRICING", "CALCULATOR", "OS_WINDOW_CARD", "VERTICAL_VIDEO_REEL", "NEON_ACTION_BUTTON", "BENTO_SHOWCASE_GRID", "TASKBAR_DOCK"];
type ExistingLink = typeof links.$inferSelect;

export function parseLinkInput(input: unknown, existing?: ExistingLink) {
  if (!input || typeof input !== "object") return { error: "Invalid link data." };
  const body = input as Record<string, unknown>;
  const type = typeof body.type === "string" ? body.type : existing?.type ?? "CLASSIC_LINK";
  if (!allowedTypes.includes(type)) return { error: "Unsupported link type." };
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : existing?.title ?? "";
  if (!title) return { error: "Please add a title." };
  const rawUrl = body.url !== undefined ? body.url : existing?.url;
  const url = noUrlTypes.includes(type) ? null : normalizeHttpUrl(rawUrl);
  if (!noUrlTypes.includes(type) && !url) return { error: "Enter a valid http or https URL." };
  const rawThumbnail = body.thumbnailUrl !== undefined ? body.thumbnailUrl : existing?.thumbnailUrl;
  const thumbnailUrl = rawThumbnail ? normalizeImageUrl(rawThumbnail) : null;
  if (rawThumbnail && !thumbnailUrl) return { error: "Enter a valid image URL." };
  const parseDate = (value: unknown, fallback: Date | null | undefined) => {
    if (value === undefined) return fallback ?? null;
    if (value === null || value === "") return null;
    if (typeof value !== "string") return "invalid" as const;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "invalid" as const : date;
  };
  const scheduleStart = parseDate(body.scheduleStart, existing?.scheduleStart);
  const scheduleEnd = parseDate(body.scheduleEnd, existing?.scheduleEnd);
  if (scheduleStart === "invalid" || scheduleEnd === "invalid") return { error: "Please enter valid schedule dates." };
  if (scheduleStart && scheduleEnd && scheduleStart >= scheduleEnd) return { error: "The end date must be after the start date." };
  const gate = buildGate(body.gate, existing?.lockConfig ?? {});
  if (gate.error) return { error: gate.error };
  const parentId = body.parentId === null || body.parentId === "" ? null : typeof body.parentId === "string" ? body.parentId : existing?.parentId ?? null;
  if (parentId && !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(parentId)) return { error: "Invalid collection." };
  if (type === "COLLECTION" && parentId) return { error: "Collections can’t be nested." };
  let contextPayload = existing?.contextPayload ?? {};
  if (body.contextPayload && typeof body.contextPayload === "object") {
    const context = body.contextPayload as Record<string, unknown>;
    const platforms = Array.isArray(context.platforms) ? context.platforms.slice(0, 20).flatMap((item: unknown) => {
      if (!item || typeof item !== "object") return [];
      const platform = item as Record<string, unknown>; const platformUrl = normalizeHttpUrl(platform.url);
      return typeof platform.name === "string" && platformUrl ? [{ name: platform.name.slice(0, 50), url: platformUrl }] : [];
    }) : [];
    const product = context.product && typeof context.product === "object" ? context.product as Record<string, unknown> : {};
    const contact = context.contact && typeof context.contact === "object" ? context.contact as Record<string, unknown> : {};
    const calculator = context.calculator && typeof context.calculator === "object" ? context.calculator as Record<string, unknown> : {};
    const pricing = context.pricing && typeof context.pricing === "object" ? context.pricing as Record<string, unknown> : {};
    const calculatorItems = Array.isArray(calculator.items) ? calculator.items.slice(0, 12).flatMap((item: unknown) => { if (!item || typeof item !== "object") return []; const entry = item as Record<string, unknown>; const price = Number(entry.price); return typeof entry.name === "string" && entry.name.trim() && Number.isFinite(price) && price >= 0 && price <= 10000000 ? [{ name: entry.name.trim().slice(0, 80), price }] : []; }) : [];
    const pricingItems = Array.isArray(pricing.items) ? pricing.items.slice(0, 8).flatMap((item: unknown) => { if (!item || typeof item !== "object") return []; const entry = item as Record<string, unknown>; return typeof entry.name === "string" && entry.name.trim() ? [{ name: entry.name.trim().slice(0, 80), price: typeof entry.price === "string" ? entry.price.slice(0, 40) : "", description: typeof entry.description === "string" ? entry.description.slice(0, 180) : "" }] : []; }) : [];
    contextPayload = {
      ...existing?.contextPayload,
      platforms,
      youtube: sanitizeYoutubeSettings(context.youtube),
      product: { price: typeof product.price === "string" ? product.price.slice(0, 30) : "", description: typeof product.description === "string" ? product.description.slice(0, 300) : "" },
      contact: { collectName: contact.collectName !== false, collectMessage: contact.collectMessage !== false, consentText: typeof contact.consentText === "string" ? contact.consentText.slice(0, 250) : "" },
      calculator: { items: calculatorItems, currency: typeof calculator.currency === "string" && ["USD", "INR", "SGD", "AED"].includes(calculator.currency) ? calculator.currency : "USD" },
      pricing: { items: pricingItems },
    };
  }
  if (isPulseWidgetType(type) && typeof body.animation === "string" && ["NONE", "REVEAL", "FLOAT", "PULSE"].includes(body.animation) && contextPayload.pulseWidget && typeof contextPayload.pulseWidget === "object") {
    const widget = contextPayload.pulseWidget as Record<string, unknown>;
    const appearance = widget.appearance && typeof widget.appearance === "object" ? widget.appearance as Record<string, unknown> : {};
    contextPayload = { ...contextPayload, pulseWidget: { ...widget, appearance: { ...appearance, animation: body.animation } } };
  }
  if (type === "YOUTUBE_VIDEO" && url && (body.url !== undefined || !existing)) {
    try { const host = new URL(url).hostname; if (!(host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com"))) return { error: "Enter a valid YouTube URL." }; } catch { return { error: "Enter a valid YouTube URL." }; }
    const settings = sanitizeYoutubeSettings(contextPayload.youtube);
    if (settings.source === "SINGLE" && !youtubeVideoId(url)) return { error: "Use a YouTube video URL for the single-video layout." };
  }
  return { values: {
    type, title, url, thumbnailUrl, scheduleStart, scheduleEnd, parentId,
    isActive: typeof body.isActive === "boolean" ? body.isActive : existing?.isActive ?? true,
    isArchived: typeof body.isArchived === "boolean" ? body.isArchived : existing?.isArchived ?? false,
    isSpotlight: typeof body.isSpotlight === "boolean" ? body.isSpotlight : existing?.isSpotlight ?? false,
    animation: typeof body.animation === "string" && ["NONE", "REVEAL", "FLOAT", "PULSE"].includes(body.animation) ? body.animation : existing?.animation ?? "REVEAL",
    layoutSize: body.layoutSize === "FEATURED" ? "FEATURED" : body.layoutSize === "STANDARD" ? "STANDARD" : existing?.layoutSize ?? "STANDARD",
    lockConfig: noUrlTypes.includes(type) ? {} : gate.lock,
    contextPayload,
    updatedAt: new Date(),
  } };
}

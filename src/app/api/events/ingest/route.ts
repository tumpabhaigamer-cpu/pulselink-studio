import { db } from "@/db";
import { links, profiles } from "@/db/schema";
import { recordEvent } from "@/lib/analytics";
import { and, eq } from "drizzle-orm";

const uuid = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;

export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 10000) return new Response(null, { status: 413 });
    const body = JSON.parse(text) as Record<string, unknown>;
    if (typeof body.profileId !== "string" || !uuid.test(body.profileId) || typeof body.eventType !== "string" || !["PAGE_VIEW", "LINK_CLICK", "WINDOW_OPEN", "VIDEO_PLAY", "VIDEO_WATCH", "CTA_CLICK", "WHATSAPP_CLICK", "BOOKING_OPEN", "QR_SCAN", "CHECKOUT_START"].includes(body.eventType)) return new Response(null, { status: 400 });
    const [profile] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, body.profileId)).limit(1);
    if (!profile) return new Response(null, { status: 404 });
    let linkId: string | undefined;
    if (body.linkId !== undefined && body.linkId !== null) {
      if (typeof body.linkId !== "string" || !uuid.test(body.linkId)) return new Response(null, { status: 400 });
      const [link] = await db.select({ id: links.id }).from(links).where(and(eq(links.id, body.linkId), eq(links.profileId, profile.id))).limit(1);
      if (!link) return new Response(null, { status: 404 });
      linkId = link.id;
    }
    if (["WINDOW_OPEN", "VIDEO_PLAY", "VIDEO_WATCH", "CTA_CLICK", "WHATSAPP_CLICK", "BOOKING_OPEN"].includes(body.eventType) && !linkId) return new Response(null, { status: 400 });
    const durationSeconds = typeof body.durationSeconds === "number" && Number.isFinite(body.durationSeconds) ? Math.max(0, Math.min(3600, Math.round(body.durationSeconds))) : undefined;
    if (body.eventType === "VIDEO_WATCH" && !durationSeconds) return new Response(null, { status: 400 });
    await recordEvent(request, { profileId: profile.id, linkId, eventType: body.eventType, durationSeconds: body.eventType === "VIDEO_WATCH" ? durationSeconds : undefined, referrer: typeof body.referrer === "string" ? body.referrer : undefined, utmSource: typeof body.utmSource === "string" ? body.utmSource : undefined, utmMedium: typeof body.utmMedium === "string" ? body.utmMedium : undefined, utmCampaign: typeof body.utmCampaign === "string" ? body.utmCampaign : undefined });
    return new Response(null, { status: 204 });
  } catch { return new Response(null, { status: 400 }); }
}

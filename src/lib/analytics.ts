import { createHash, randomBytes } from "node:crypto";
import { db } from "@/db";
import { analyticsEvents } from "@/db/schema";

const localSalt = randomBytes(32).toString("hex");

export async function recordEvent(request: Request, input: { profileId: string; linkId?: string | null; eventType: string; referrer?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string; durationSeconds?: number }) {
  const agent = (request.headers.get("user-agent") ?? "").slice(0, 500);
  const ip = (request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim();
  const day = new Date().toISOString().slice(0, 10);
  const visitorHash = createHash("sha256").update(`${process.env.ANALYTICS_SALT ?? localSalt}:${day}:${ip}:${agent}`).digest("hex");
  let referrerDomain: string | null = null;
  try { if (input.referrer) referrerDomain = new URL(input.referrer).hostname.slice(0, 255); } catch { /* ignore invalid referrers */ }
  const deviceOs = /iPhone|iPad|iPod/i.test(agent) ? "iOS" : /Android/i.test(agent) ? "Android" : /Windows/i.test(agent) ? "Windows" : /Macintosh/i.test(agent) ? "macOS" : "Other";
  await db.insert(analyticsEvents).values({
    profileId: input.profileId,
    linkId: input.linkId ?? null,
    eventType: input.eventType,
    durationSeconds: input.durationSeconds ?? null,
    visitorHash,
    referrerDomain,
    utmSource: input.utmSource?.slice(0, 200) ?? null,
    utmMedium: input.utmMedium?.slice(0, 200) ?? null,
    utmCampaign: input.utmCampaign?.slice(0, 200) ?? null,
    deviceOs,
    countryCode: request.headers.get("cf-ipcountry")?.slice(0, 5) ?? null,
    city: request.headers.get("cf-ipcity")?.slice(0, 100) ?? null,
  });
}

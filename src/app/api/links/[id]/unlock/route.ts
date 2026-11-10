import { createHash } from "node:crypto";
import { db } from "@/db";
import { crmSubscribers, links } from "@/db/schema";
import { recordEvent } from "@/lib/analytics";
import { destinationForRequest, verifyPasscode } from "@/lib/security";
import { isLocked } from "@/lib/store";
import { isPublicLinkVisible } from "@/lib/collections";
import { eq } from "drizzle-orm";

const attempts = new Map<string, { count: number; expires: number }>();

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) return Response.json({ error: "Link not found." }, { status: 404 });
    const [link] = await db.select().from(links).where(eq(links.id, id)).limit(1);
    if (!link || !(await isPublicLinkVisible(link)) || !isLocked(link.lockConfig)) return Response.json({ error: "Link not found." }, { status: 404 });
    const ip = (request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim();
    const key = createHash("sha256").update(`${id}:${ip}`).digest("hex");
    const now = Date.now();
    if (attempts.size > 2000) for (const [entryKey, entry] of attempts) if (entry.expires < now) attempts.delete(entryKey);
    const current = attempts.get(key);
    if (current && current.expires > now && current.count >= 10) return Response.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    attempts.set(key, current && current.expires > now ? { ...current, count: current.count + 1 } : { count: 1, expires: now + 10 * 60 * 1000 });
    const body = await request.json() as Record<string, unknown>;
    const lock = link.lockConfig;
    if (lock.codeLock?.enabled && (typeof body.pin !== "string" || !verifyPasscode(body.pin, lock.codeLock.passcodeHash))) return Response.json({ error: "That passcode isn’t quite right." }, { status: 403 });
    if (lock.ageLock?.enabled && body.ageConfirmed !== true) return Response.json({ error: `Please confirm you are at least ${lock.ageLock.minAge} years old.` }, { status: 403 });
    if (lock.sensitiveWarning?.enabled && body.acknowledged !== true) return Response.json({ error: "Please confirm you want to continue." }, { status: 403 });
    if (lock.subscribeLock?.enabled) {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 320) : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
      await db.insert(crmSubscribers).values({ profileId: link.profileId, sourceLinkId: link.id, email, ipCountry: request.headers.get("cf-ipcountry")?.slice(0, 5) ?? null });
    }
    const destination = destinationForRequest(link.url, link.routingRules, request);
    if (!destination) return Response.json({ error: "Destination unavailable." }, { status: 404 });
    attempts.delete(key);
    try {
      await Promise.all([recordEvent(request, { profileId: link.profileId, linkId: link.id, eventType: "LOCK_UNLOCK" }), recordEvent(request, { profileId: link.profileId, linkId: link.id, eventType: "LINK_CLICK" })]);
    } catch { /* unlocking should not depend on analytics */ }
    return Response.json({ destinationUrl: destination }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Unable to unlock this link." }, { status: 400 }); }
}

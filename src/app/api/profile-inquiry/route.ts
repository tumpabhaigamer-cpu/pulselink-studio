import { db } from "@/db";
import { crmSubscribers, links } from "@/db/schema";
import { isPublicLinkVisible } from "@/lib/collections";
import { isLocked } from "@/lib/store";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.linkId !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(body.linkId)) return Response.json({ error: "Widget not found." }, { status: 404 });
    const [link] = await db.select().from(links).where(eq(links.id, body.linkId)).limit(1);
    if (!link || link.type !== "BOOKING_CALENDAR" || isLocked(link.lockConfig) || !(await isPublicLinkVisible(link))) return Response.json({ error: "Widget not found." }, { status: 404 });
    const fullName = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 320) : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
    if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Enter your name and a valid email." }, { status: 400 });
    await db.insert(crmSubscribers).values({ profileId: link.profileId, sourceLinkId: link.id, fullName, email, customFields: { message, kind: "booking inquiry" } });
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Couldn’t send your inquiry." }, { status: 400 }); }
}

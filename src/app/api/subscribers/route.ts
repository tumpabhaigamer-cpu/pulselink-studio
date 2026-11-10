import { db } from "@/db";
import { crmSubscribers, links } from "@/db/schema";
import { isPublicLinkVisible } from "@/lib/collections";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.linkId !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(body.linkId)) return Response.json({ error: "Form not found." }, { status: 404 });
    const [link] = await db.select().from(links).where(eq(links.id, body.linkId)).limit(1);
    if (!link || !["EMAIL_SIGNUP", "CONTACT_FORM"].includes(link.type) || !(await isPublicLinkVisible(link))) return Response.json({ error: "Form not found." }, { status: 404 });
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 320) : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
    const contact = link.contextPayload.contact && typeof link.contextPayload.contact === "object" ? link.contextPayload.contact as Record<string, unknown> : {};
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
    if (link.type === "CONTACT_FORM" && contact.collectName !== false && !name) return Response.json({ error: "Please enter your name." }, { status: 400 });
    if (link.type === "CONTACT_FORM" && contact.collectMessage !== false && !message) return Response.json({ error: "Please add a message." }, { status: 400 });
    await db.insert(crmSubscribers).values({ profileId: link.profileId, sourceLinkId: link.id, email, fullName: name || null, customFields: message ? { message } : {}, ipCountry: request.headers.get("cf-ipcountry")?.slice(0, 5) ?? null });
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Could not submit right now." }, { status: 400 }); }
}

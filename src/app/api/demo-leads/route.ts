import { db } from "@/db";
import { pulseDemoLeads } from "@/db/schema";
import { getPulseTemplate } from "@/lib/pulse-templates";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const slug = typeof body.demoSlug === "string" ? body.demoSlug : "";
    if (!getPulseTemplate(slug)) return Response.json({ error: "Demo not found." }, { status: 404 });
    const fullName = typeof body.fullName === "string" ? body.fullName.trim().slice(0, 120) : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 320) : "";
    const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 40) : "";
    const interest = typeof body.interest === "string" ? body.interest.trim().slice(0, 120) : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
    if (!fullName || (!email && !phone)) return Response.json({ error: "Add your name and an email or phone number." }, { status: 400 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    if (phone && !/^[\d+() .-]{6,40}$/.test(phone)) return Response.json({ error: "Enter a valid phone number." }, { status: 400 });
    await db.insert(pulseDemoLeads).values({ demoSlug: slug, fullName, email: email || null, phone: phone || null, interest: interest || null, message: message || null });
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Couldn’t send your inquiry right now." }, { status: 400 }); }
}

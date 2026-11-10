import { db } from "@/db";
import { instagramAutomations } from "@/db/schema";
import { instagramConfigured } from "@/lib/instagram";
import { ensureDemoProfile } from "@/lib/store";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const profile = await ensureDemoProfile();
    const [rule] = await db.select().from(instagramAutomations).where(eq(instagramAutomations.profileId, profile.id)).limit(1);
    return Response.json({ configured: instagramConfigured(profile.username), rule: rule ? { scope: rule.scope, mediaId: rule.mediaId, nextMediaId: rule.nextMediaId, triggerType: rule.triggerType, keyword: rule.keyword, message: rule.message, enabled: rule.enabled } : { scope: "ALL", mediaId: "", triggerType: "KEYWORD", keyword: "LINK", message: "Thanks for reaching out! Here’s the link: {link}", enabled: false } });
  } catch { return Response.json({ error: "Workspace session required." }, { status: 401 }); }
}

export async function PUT(request: Request) {
  try {
    const profile = await ensureDemoProfile(); const body = await request.json() as Record<string, unknown>;
    const scope = typeof body.scope === "string" && ["ALL", "SPECIFIC", "NEXT"].includes(body.scope) ? body.scope : "ALL";
    const triggerType = body.triggerType === "ANY" ? "ANY" : "KEYWORD";
    const keyword = typeof body.keyword === "string" ? body.keyword.trim().slice(0, 80) : "";
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 1000) : "";
    const mediaId = typeof body.mediaId === "string" ? body.mediaId.trim() : "";
    const enabled = body.enabled === true;
    if (!message) return Response.json({ error: "Add a message for your reply." }, { status: 400 });
    if (triggerType === "KEYWORD" && !keyword) return Response.json({ error: "Add a trigger keyword." }, { status: 400 });
    if (scope === "SPECIFIC" && !/^\d{5,40}$/.test(mediaId)) return Response.json({ error: "Enter a valid Instagram media ID." }, { status: 400 });
    if (enabled && !instagramConfigured(profile.username)) return Response.json({ error: "Connect and configure the Meta app before enabling replies." }, { status: 400 });
    const [existing] = await db.select().from(instagramAutomations).where(eq(instagramAutomations.profileId, profile.id)).limit(1);
    const values = { profileId: profile.id, scope, mediaId: scope === "SPECIFIC" ? mediaId : null, nextMediaId: scope === "NEXT" && existing?.scope === "NEXT" && existing.enabled && enabled ? existing.nextMediaId : null, triggerType, keyword, message, enabled, updatedAt: new Date() };
    await db.insert(instagramAutomations).values(values).onConflictDoUpdate({ target: instagramAutomations.profileId, set: values });
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Could not save this automation." }, { status: 400 }); }
}

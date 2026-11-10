import { db } from "@/db";
import { links } from "@/db/schema";
import { ensureDemoProfile } from "@/lib/store";
import { isPulseWidgetType, validatePulseWidget } from "@/lib/widget-schema";
import { and, eq } from "drizzle-orm";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params; if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) return Response.json({ error: "Widget not found." }, { status: 404 });
    const profile = await ensureDemoProfile(); const [existing] = await db.select().from(links).where(and(eq(links.id, id), eq(links.profileId, profile.id))).limit(1);
    if (!existing || !isPulseWidgetType(existing.type)) return Response.json({ error: "Widget not found." }, { status: 404 });
    const body = await request.json() as Record<string, unknown>; const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : existing.title;
    if (!title) return Response.json({ error: "Please add a widget title." }, { status: 400 });
    const parsed = validatePulseWidget(body.config); if (!parsed.widget || parsed.widget.type !== existing.type) return Response.json({ error: parsed.error ?? "Widget type cannot be changed." }, { status: 400 });
    const widget = parsed.widget; const thumbnailUrl = widget.type === "OS_WINDOW_CARD" ? widget.content.imageUrl : widget.type === "VERTICAL_VIDEO_REEL" ? widget.content.posterUrl : widget.type === "BENTO_SHOWCASE_GRID" ? widget.content.items[0]?.imageUrl : null;
    await db.update(links).set({ title, thumbnailUrl: thumbnailUrl || null, animation: widget.appearance.animation, contextPayload: { ...existing.contextPayload, pulseWidget: widget }, updatedAt: new Date() }).where(eq(links.id, id));
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Couldn’t update the widget." }, { status: 400 }); }
}

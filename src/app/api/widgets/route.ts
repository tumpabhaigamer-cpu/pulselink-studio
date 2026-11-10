import { db } from "@/db";
import { links } from "@/db/schema";
import { ensureDemoProfile } from "@/lib/store";
import { validatePulseWidget } from "@/lib/widget-schema";
import { and, eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const profile = await ensureDemoProfile(); const body = await request.json() as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
    if (!title) return Response.json({ error: "Please add a widget title." }, { status: 400 });
    const parsed = validatePulseWidget(body.config); if (!parsed.widget) return Response.json({ error: parsed.error }, { status: 400 });
    const widget = parsed.widget;
    if (widget.type === "TASKBAR_DOCK") { const existing = await db.select({ id: links.id }).from(links).where(and(eq(links.profileId, profile.id), eq(links.type, "TASKBAR_DOCK"), eq(links.isArchived, false))).limit(1); if (existing.length) return Response.json({ error: "You already have a taskbar. Edit or archive it first." }, { status: 400 }); }
    const existing = await db.select({ position: links.position }).from(links).where(eq(links.profileId, profile.id));
    const position = existing.length ? Math.max(...existing.map((link) => link.position)) + 1 : 0;
    const thumbnailUrl = widget.type === "OS_WINDOW_CARD" ? widget.content.imageUrl : widget.type === "VERTICAL_VIDEO_REEL" ? widget.content.posterUrl : widget.type === "BENTO_SHOWCASE_GRID" ? widget.content.items[0]?.imageUrl : null;
    const [created] = await db.insert(links).values({ profileId: profile.id, type: widget.type, title, url: null, thumbnailUrl: thumbnailUrl || null, position, layoutSize: body.layoutSize === "FEATURED" ? "FEATURED" : "STANDARD", animation: widget.appearance.animation, contextPayload: { pulseWidget: widget } }).returning({ id: links.id });
    return Response.json({ ok: true, id: created.id }, { status: 201 });
  } catch { return Response.json({ error: "Couldn’t create the widget." }, { status: 400 }); }
}

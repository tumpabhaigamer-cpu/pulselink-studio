import { db } from "@/db";
import { links } from "@/db/schema";
import { parseLinkInput } from "@/lib/link-input";
import { validateCollection } from "@/lib/collections";
import { ensureDemoProfile } from "@/lib/store";
import { and, eq, ne } from "drizzle-orm";
import { isPulseWidgetType } from "@/lib/widget-schema";

const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id);

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!validId(id)) return Response.json({ error: "Link not found." }, { status: 404 });
    const profile = await ensureDemoProfile();
    const [existing] = await db.select().from(links).where(and(eq(links.id, id), eq(links.profileId, profile.id))).limit(1);
    if (!existing) return Response.json({ error: "Link not found." }, { status: 404 });
    const body = await request.json() as Record<string, unknown>;
    if (isPulseWidgetType(existing.type) && (body.contextPayload !== undefined || (typeof body.type === "string" && body.type !== existing.type))) return Response.json({ error: "Use the widget editor to change its configuration." }, { status: 400 });
    const parsed = parseLinkInput(body, existing);
    if (!parsed.values) return Response.json({ error: parsed.error }, { status: 400 });
    if (body.quickSave === true) {
      const update: Partial<typeof links.$inferInsert> = { updatedAt: new Date() };
      if (typeof body.title === "string") update.title = parsed.values.title;
      if (body.url !== undefined) update.url = parsed.values.url;
      await db.update(links).set(update).where(eq(links.id, id));
      return Response.json({ ok: true });
    }
    if (existing.type === "TASKBAR_DOCK" && existing.isArchived && !parsed.values.isArchived) {
      const other = await db.select({ id: links.id }).from(links).where(and(eq(links.profileId, profile.id), eq(links.type, "TASKBAR_DOCK"), eq(links.isArchived, false), ne(links.id, id))).limit(1);
      if (other.length) return Response.json({ error: "Archive the current taskbar before restoring this one." }, { status: 400 });
    }
    const collectionError = await validateCollection(profile.id, parsed.values.parentId, parsed.values.type, id, existing.type);
    if (collectionError) return Response.json({ error: collectionError }, { status: 400 });
    await db.update(links).set(parsed.values).where(eq(links.id, id));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not update this link." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!validId(id)) return Response.json({ error: "Link not found." }, { status: 404 });
    const profile = await ensureDemoProfile();
    const deleted = await db.delete(links).where(and(eq(links.id, id), eq(links.profileId, profile.id))).returning({ id: links.id });
    return deleted.length ? Response.json({ ok: true }) : Response.json({ error: "Link not found." }, { status: 404 });
  } catch {
    return Response.json({ error: "Could not delete this link." }, { status: 400 });
  }
}

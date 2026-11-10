import { db } from "@/db";
import { links } from "@/db/schema";
import { ensureDemoProfile } from "@/lib/store";
import { parseLinkInput } from "@/lib/link-input";
import { isPulseWidgetType } from "@/lib/widget-schema";
import { validateCollection } from "@/lib/collections";
import { asc, eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const profile = await ensureDemoProfile();
    const parsed = parseLinkInput(await request.json());
    if (!parsed.values) return Response.json({ error: parsed.error }, { status: 400 });
    if (isPulseWidgetType(parsed.values.type)) return Response.json({ error: "Use the widget editor for this type." }, { status: 400 });
    const collectionError = await validateCollection(profile.id, parsed.values.parentId, parsed.values.type);
    if (collectionError) return Response.json({ error: collectionError }, { status: 400 });
    const existing = await db.select({ position: links.position }).from(links).where(eq(links.profileId, profile.id));
    const position = existing.length ? Math.max(...existing.map((link) => link.position)) + 1 : 0;
    const [created] = await db.insert(links).values({ ...parsed.values, profileId: profile.id, position }).returning({ id: links.id });
    return Response.json({ ok: true, id: created.id }, { status: 201 });
  } catch {
    return Response.json({ error: "Could not create this link." }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const profile = await ensureDemoProfile();
    const body = await request.json() as { ids?: unknown };
    if (!Array.isArray(body.ids) || body.ids.some((id) => typeof id !== "string")) return Response.json({ error: "Invalid order." }, { status: 400 });
    const existing = await db.select({ id: links.id }).from(links).where(eq(links.profileId, profile.id)).orderBy(asc(links.position));
    const ids = body.ids as string[];
    if (ids.length !== existing.length || new Set(ids).size !== existing.length || existing.some((link) => !ids.includes(link.id))) return Response.json({ error: "Invalid order." }, { status: 400 });
    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) await tx.update(links).set({ position: i, updatedAt: new Date() }).where(eq(links.id, ids[i]));
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not reorder links." }, { status: 400 });
  }
}

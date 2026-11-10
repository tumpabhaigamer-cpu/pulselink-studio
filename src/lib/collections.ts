import { db } from "@/db";
import { links } from "@/db/schema";
import { isScheduledNow } from "@/lib/store";
import { and, eq } from "drizzle-orm";

export async function validateCollection(profileId: string, parentId: string | null, type: string, linkId?: string, previousType?: string) {
  if (parentId) {
    if (parentId === linkId || type === "COLLECTION") return "Collections can’t be nested.";
    const [parent] = await db.select().from(links).where(and(eq(links.id, parentId), eq(links.profileId, profileId))).limit(1);
    if (!parent || parent.type !== "COLLECTION" || parent.isArchived) return "Choose an available collection.";
  }
  if (linkId && previousType === "COLLECTION" && type !== "COLLECTION") {
    const children = await db.select({ id: links.id }).from(links).where(and(eq(links.parentId, linkId), eq(links.profileId, profileId))).limit(1);
    if (children.length) return "Move the links out of this collection before changing its type.";
  }
  return null;
}

export async function isPublicLinkVisible(link: typeof links.$inferSelect) {
  if (!isScheduledNow(link)) return false;
  if (!link.parentId) return true;
  const [parent] = await db.select().from(links).where(and(eq(links.id, link.parentId), eq(links.profileId, link.profileId))).limit(1);
  return !!parent && parent.type === "COLLECTION" && isScheduledNow(parent);
}

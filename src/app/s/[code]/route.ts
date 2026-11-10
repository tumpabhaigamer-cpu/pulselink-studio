import { db } from "@/db";
import { links, profiles } from "@/db/schema";
import { isPublicLinkVisible } from "@/lib/collections";
import { idFromShortCode } from "@/lib/shortcode";
import { isLocked } from "@/lib/store";
import { eq } from "drizzle-orm";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const id = idFromShortCode((await context.params).code);
  if (!id) return new Response("Link not found", { status: 404 });
  const [link] = await db.select().from(links).where(eq(links.id, id)).limit(1);
  if (!link || !(await isPublicLinkVisible(link)) || !link.url) return new Response("Link not found", { status: 404 });
  if (isLocked(link.lockConfig)) {
    const [profile] = await db.select({ username: profiles.username }).from(profiles).where(eq(profiles.id, link.profileId)).limit(1);
    if (!profile) return new Response("Link not found", { status: 404 });
    return new Response(null, { status: 302, headers: { Location: `/${profile.username}?open=${link.id}`, "Cache-Control": "no-store" } });
  }
  return new Response(null, { status: 302, headers: { Location: `/api/go/${link.id}`, "Cache-Control": "no-store" } });
}

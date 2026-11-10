import { db } from "@/db";
import { links } from "@/db/schema";
import { recordEvent } from "@/lib/analytics";
import { destinationForRequest } from "@/lib/security";
import { isLocked } from "@/lib/store";
import { isPublicLinkVisible } from "@/lib/collections";
import { eq } from "drizzle-orm";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) return new Response("Link not found", { status: 404 });
  const [link] = await db.select().from(links).where(eq(links.id, id)).limit(1);
  if (!link || !(await isPublicLinkVisible(link))) return new Response("Link not found", { status: 404 });
  if (isLocked(link.lockConfig)) return new Response("This link is locked", { status: 403 });
  const destination = destinationForRequest(link.url, link.routingRules, request);
  if (!destination) return new Response("Destination unavailable", { status: 404 });
  try { await recordEvent(request, { profileId: link.profileId, linkId: link.id, eventType: "LINK_CLICK", referrer: request.headers.get("referer") ?? undefined }); } catch { /* do not block the redirect */ }
  return new Response(null, { status: 302, headers: { Location: destination, "Cache-Control": "no-store" } });
}

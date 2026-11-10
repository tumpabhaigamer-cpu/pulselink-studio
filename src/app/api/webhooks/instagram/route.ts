import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { instagramAutomations, instagramDeliveries, profiles } from "@/db/schema";
import { instagramConfigured } from "@/lib/instagram";
import { and, eq, isNull } from "drizzle-orm";

function equalSecret(a: string, b: string) { const left = Buffer.from(a); const right = Buffer.from(b); return left.length === right.length && timingSafeEqual(left, right); }

export async function GET(request: Request) {
  const url = new URL(request.url); const expected = process.env.META_VERIFY_TOKEN;
  if (!expected) return new Response("Not configured", { status: 503 });
  if (url.searchParams.get("hub.mode") === "subscribe" && equalSecret(url.searchParams.get("hub.verify_token") ?? "", expected)) return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return new Response("Not configured", { status: 503 });
  const raw = await request.text(); if (raw.length > 1000000) return new Response("Too large", { status: 413 });
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const expected = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  if (!equalSecret(signature, expected)) return new Response("Forbidden", { status: 403 });
  try {
    const body = JSON.parse(raw) as { object?: string; entry?: { id?: string; changes?: { field?: string; value?: { id?: string; comment_id?: string; text?: string; from?: { id?: string }; media?: { id?: string } } }[] }[] };
    if (body.object !== "instagram" || !Array.isArray(body.entry)) return new Response("OK");
    const username = process.env.INSTAGRAM_PROFILE_USERNAME ?? "";
    const [profile] = await db.select().from(profiles).where(eq(profiles.username, username.toLowerCase())).limit(1);
    if (!profile || !instagramConfigured(profile.username)) return new Response("OK");
    const [rule] = await db.select().from(instagramAutomations).where(and(eq(instagramAutomations.profileId, profile.id), eq(instagramAutomations.enabled, true))).limit(1);
    if (!rule) return new Response("OK");
    let failed = false;
    for (const entry of body.entry.slice(0, 100)) {
      if (entry.id !== process.env.INSTAGRAM_ACCOUNT_ID) continue;
      for (const change of (entry.changes ?? []).slice(0, 100)) {
        if (change.field !== "comments" || !change.value) continue;
        const value = change.value; const commentId = value.comment_id ?? value.id ?? ""; const mediaId = value.media?.id ?? ""; const text = value.text ?? "";
        if (!/^\d{5,40}$/.test(commentId) || !/^\d{5,40}$/.test(mediaId) || value.from?.id === process.env.INSTAGRAM_ACCOUNT_ID) continue;
        if (rule.scope === "SPECIFIC" && rule.mediaId !== mediaId) continue;
        if (rule.triggerType === "KEYWORD" && !text.toLocaleLowerCase().includes(rule.keyword.toLocaleLowerCase())) continue;
        if (rule.scope === "NEXT") {
          if (rule.nextMediaId && rule.nextMediaId !== mediaId) continue;
          if (!rule.nextMediaId) {
            const claimed = await db.update(instagramAutomations).set({ nextMediaId: mediaId }).where(and(eq(instagramAutomations.id, rule.id), isNull(instagramAutomations.nextMediaId))).returning({ nextMediaId: instagramAutomations.nextMediaId });
            if (!claimed.length) { const [fresh] = await db.select({ nextMediaId: instagramAutomations.nextMediaId }).from(instagramAutomations).where(eq(instagramAutomations.id, rule.id)).limit(1); if (fresh?.nextMediaId !== mediaId) continue; }
            rule.nextMediaId = mediaId;
          }
        }
        const [delivery] = await db.insert(instagramDeliveries).values({ automationId: rule.id, commentId }).onConflictDoNothing({ target: instagramDeliveries.commentId }).returning();
        if (!delivery) continue;
        const profileUrl = new URL(`/${profile.username}`, process.env.APP_BASE_URL!).toString();
        const message = rule.message.replace(/\{link\}/gi, profileUrl);
        const version = /^v\d{1,2}\.\d$/.test(process.env.META_GRAPH_VERSION ?? "") ? process.env.META_GRAPH_VERSION : "v25.0";
        try {
          const response = await fetch(`https://graph.facebook.com/${version}/${process.env.INSTAGRAM_PAGE_ID}/messages`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.INSTAGRAM_PAGE_ACCESS_TOKEN}` }, body: JSON.stringify({ recipient: { comment_id: commentId }, message: { text: message } }), signal: AbortSignal.timeout(10000) });
          if (!response.ok) throw new Error("Meta delivery failed");
          await db.update(instagramDeliveries).set({ status: "SENT" }).where(eq(instagramDeliveries.id, delivery.id));
        } catch { await db.delete(instagramDeliveries).where(eq(instagramDeliveries.id, delivery.id)); failed = true; }
      }
    }
    return new Response(failed ? "Delivery failed" : "OK", { status: failed ? 500 : 200 });
  } catch { return new Response("Invalid payload", { status: 400 }); }
}

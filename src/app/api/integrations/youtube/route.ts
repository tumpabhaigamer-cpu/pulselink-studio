import { db } from "@/db";
import { youtubeConnections } from "@/db/schema";
import { ensureDemoProfile } from "@/lib/store";
import { decryptToken, youtubeOAuthConfigured } from "@/lib/youtube-oauth";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const profile = await ensureDemoProfile();
    const [connection] = await db.select().from(youtubeConnections).where(eq(youtubeConnections.profileId, profile.id)).limit(1);
    return Response.json({ configured: youtubeOAuthConfigured(), connected: !!connection, channelId: connection?.channelId ?? null, channelTitle: connection?.channelTitle ?? null, thumbnailUrl: connection?.thumbnailUrl ?? null, apiKeyConfigured: !!process.env.YOUTUBE_API_KEY }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Workspace session required." }, { status: 401 }); }
}

export async function DELETE() {
  try {
    const profile = await ensureDemoProfile();
    const [connection] = await db.select().from(youtubeConnections).where(eq(youtubeConnections.profileId, profile.id)).limit(1);
    if (connection) {
      try { const token = decryptToken(connection.encryptedRefreshToken); await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST", signal: AbortSignal.timeout(5000) }); } catch { /* local disconnect still succeeds */ }
      await db.delete(youtubeConnections).where(eq(youtubeConnections.id, connection.id));
    }
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "Could not disconnect YouTube." }, { status: 400 }); }
}

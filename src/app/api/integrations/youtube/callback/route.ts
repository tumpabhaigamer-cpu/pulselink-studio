import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { youtubeConnections } from "@/db/schema";
import { ensureDemoProfile } from "@/lib/store";
import { encryptToken, youtubeOAuthConfigured } from "@/lib/youtube-oauth";

export async function GET(request: NextRequest) {
  const redirect = (status: string) => {
    const origin = process.env.GOOGLE_REDIRECT_URI ? new URL(process.env.GOOGLE_REDIRECT_URI).origin : request.nextUrl.origin;
    const response = NextResponse.redirect(new URL(`/?youtube=${status}`, origin));
    response.cookies.set("linkspace_youtube_state", "", { path: "/api/integrations/youtube", maxAge: 0 });
    return response;
  };
  try {
    if (!youtubeOAuthConfigured()) return redirect("unavailable");
    const profile = await ensureDemoProfile();
    const cookie = request.cookies.get("linkspace_youtube_state")?.value ?? "";
    const [profileId, expected] = cookie.split(".");
    const state = request.nextUrl.searchParams.get("state") ?? "";
    const code = request.nextUrl.searchParams.get("code") ?? "";
    if (profileId !== profile.id || !expected || !state || !code || expected.length !== state.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(state))) return redirect("error");
    const body = new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: process.env.GOOGLE_REDIRECT_URI!, grant_type: "authorization_code" });
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body, signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (!tokenResponse.ok) return redirect("error");
    const token = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!token.access_token || !token.refresh_token) return redirect("error");
    const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    channelUrl.searchParams.set("part", "snippet"); channelUrl.searchParams.set("mine", "true");
    const channelResponse = await fetch(channelUrl, { headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (!channelResponse.ok) return redirect("error");
    const result = await channelResponse.json() as { items?: { id?: string; snippet?: { title?: string; thumbnails?: { default?: { url?: string } } } }[] };
    const channel = result.items?.[0];
    if (!channel?.id || !/^UC[\w-]{22}$/.test(channel.id)) return redirect("no-channel");
    const values = { profileId: profile.id, channelId: channel.id, channelTitle: channel.snippet?.title?.slice(0, 200) ?? "YouTube channel", thumbnailUrl: channel.snippet?.thumbnails?.default?.url ?? null, encryptedAccessToken: encryptToken(token.access_token), encryptedRefreshToken: encryptToken(token.refresh_token), expiresAt: new Date(Date.now() + (token.expires_in ?? 3600) * 1000), updatedAt: new Date() };
    await db.insert(youtubeConnections).values(values).onConflictDoUpdate({ target: youtubeConnections.profileId, set: values });
    return redirect("connected");
  } catch { return redirect("error"); }
}

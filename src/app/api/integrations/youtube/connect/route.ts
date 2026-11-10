import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { ensureDemoProfile } from "@/lib/store";
import { youtubeOAuthConfigured } from "@/lib/youtube-oauth";

export async function GET() {
  try {
    const profile = await ensureDemoProfile();
    if (!youtubeOAuthConfigured()) return Response.json({ error: "YouTube OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI and a 32-byte INTEGRATION_ENCRYPTION_KEY." }, { status: 503 });
    const state = randomBytes(32).toString("hex");
    const endpoint = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    endpoint.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
    endpoint.searchParams.set("redirect_uri", process.env.GOOGLE_REDIRECT_URI!);
    endpoint.searchParams.set("response_type", "code");
    endpoint.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.readonly");
    endpoint.searchParams.set("access_type", "offline");
    endpoint.searchParams.set("prompt", "consent");
    endpoint.searchParams.set("state", state);
    const response = NextResponse.redirect(endpoint);
    response.cookies.set("linkspace_youtube_state", `${profile.id}.${state}`, { httpOnly: true, sameSite: "lax", secure: process.env.GOOGLE_REDIRECT_URI!.startsWith("https:"), path: "/api/integrations/youtube", maxAge: 600 });
    return response;
  } catch { return Response.json({ error: "Workspace session required." }, { status: 401 }); }
}

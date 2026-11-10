import { ensureDemoProfile } from "@/lib/store";
import { resolveYoutube } from "@/lib/youtube";

export async function POST(request: Request) {
  try {
    const profile = await ensureDemoProfile();
    const body = await request.json() as { url?: unknown; settings?: unknown };
    if (typeof body.url !== "string" || body.url.length > 2048) return Response.json({ error: "Enter a YouTube URL first." }, { status: 400 });
    const result = await resolveYoutube(body.url, body.settings, profile.id);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Could not load YouTube videos." }, { status: 400 }); }
}

import { normalizeHttpUrl } from "@/lib/security";
import { ensureDemoProfile } from "@/lib/store";

export async function POST(request: Request) {
  try {
    await ensureDemoProfile();
    const body = await request.json() as { url?: unknown };
    const url = normalizeHttpUrl(body.url);
    if (!url) return Response.json({ error: "Enter a valid music URL first." }, { status: 400 });
    const endpoint = new URL("https://api.song.link/v1-alpha.1/links");
    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("userCountry", "US");
    if (process.env.ODESLI_API_KEY) endpoint.searchParams.set("key", process.env.ODESLI_API_KEY);
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (!response.ok) return Response.json({ error: "Music matching is unavailable right now. You can still save your original link." }, { status: 502 });
    const data = await response.json() as { pageUrl?: string; entityUniqueId?: string; entitiesByUniqueId?: Record<string, { title?: string; artistName?: string; thumbnailUrl?: string }>; linksByPlatform?: Record<string, { url?: string }> };
    const entity = data.entityUniqueId ? data.entitiesByUniqueId?.[data.entityUniqueId] : undefined;
    const platforms = Object.entries(data.linksByPlatform ?? {}).flatMap(([name, item]) => {
      const safe = normalizeHttpUrl(item.url);
      return safe ? [{ name, url: safe }] : [];
    });
    return Response.json({ title: entity?.title, artist: entity?.artistName, thumbnailUrl: normalizeHttpUrl(entity?.thumbnailUrl), platforms });
  } catch { return Response.json({ error: "Music matching is unavailable right now. You can still save your original link." }, { status: 502 }); }
}

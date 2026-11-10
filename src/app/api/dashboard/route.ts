import { db } from "@/db";
import { profiles } from "@/db/schema";
import { ensureDemoProfile, getDashboardData } from "@/lib/store";
import { normalizeHttpUrl, normalizeImageUrl } from "@/lib/security";
import { THEME_PRESETS, type SocialLink } from "@/lib/types";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try { return Response.json(await getDashboardData(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Workspace session required." }, { status: 401 }); }
}

export async function PATCH(request: Request) {
  try {
    const profile = await ensureDemoProfile();
    const body = await request.json() as Record<string, unknown>;
    const update: Partial<typeof profiles.$inferInsert> = { updatedAt: new Date() };
    if (typeof body.displayName === "string") {
      const name = body.displayName.trim().slice(0, 100);
      if (!name) return Response.json({ error: "Please add a display name." }, { status: 400 });
      update.displayName = name;
    }
    if (typeof body.bio === "string") update.bio = body.bio.slice(0, 300);
    if (typeof body.shopEnabled === "boolean") update.shopEnabled = body.shopEnabled;
    if (body.avatarUrl !== undefined) {
      const url = body.avatarUrl ? normalizeImageUrl(body.avatarUrl) : null;
      if (body.avatarUrl && !url) return Response.json({ error: "Please enter a valid avatar image URL." }, { status: 400 });
      update.avatarUrl = url;
    }
    if (body.coverUrl !== undefined) {
      const url = body.coverUrl ? normalizeImageUrl(body.coverUrl) : null;
      if (body.coverUrl && !url) return Response.json({ error: "Please enter a valid cover image URL." }, { status: 400 });
      update.coverUrl = url;
    }
    if (typeof body.themePreset === "string") {
      const preset = THEME_PRESETS.find((theme) => theme.preset === body.themePreset);
      if (!preset) return Response.json({ error: "Unknown theme." }, { status: 400 });
      update.themeConfig = { ...preset, layoutMode: profile.themeConfig.layoutMode ?? "EASY_OS", motion: profile.themeConfig.motion ?? true, glow: profile.themeConfig.glow ?? true, accentColor: profile.themeConfig.accentColor, motionPreset: profile.themeConfig.motionPreset, showLogo: profile.tier === "FREE" ? true : preset.showLogo };
    }
    if (body.themeConfig && typeof body.themeConfig === "object") {
      const theme = body.themeConfig as Record<string, unknown>;
      const hex = (value: unknown) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
      if (!hex(theme.background) || !hex(theme.textColor) || !hex(theme.buttonColor) || !hex(theme.buttonTextColor) || (theme.gradientEnd && !hex(theme.gradientEnd))) return Response.json({ error: "Please use valid hex colors." }, { status: 400 });
      if (!["0px", "14px", "999px"].includes(String(theme.buttonRadius))) return Response.json({ error: "Invalid button shape." }, { status: 400 });
      const fontFamily = ["DM Sans", "Manrope", "Georgia"].includes(String(theme.fontFamily)) ? theme.fontFamily as "DM Sans" | "Manrope" | "Georgia" : "DM Sans";
      const buttonShadow = ["none", "soft", "hard"].includes(String(theme.buttonShadow)) ? theme.buttonShadow as "none" | "soft" | "hard" : "soft";
      update.themeConfig = { preset: typeof theme.preset === "string" ? theme.preset.slice(0, 40) : "Custom", background: theme.background as string, textColor: theme.textColor as string, buttonColor: theme.buttonColor as string, buttonTextColor: theme.buttonTextColor as string, buttonRadius: theme.buttonRadius as string, showLogo: profile.tier === "FREE" ? true : theme.showLogo !== false, fontFamily, buttonShadow, gradientEnd: typeof theme.gradientEnd === "string" && theme.gradientEnd ? theme.gradientEnd : undefined, layoutMode: theme.layoutMode === "NEON_FUNNEL" ? "NEON_FUNNEL" : theme.layoutMode === "EASY_OS" ? "EASY_OS" : profile.themeConfig.layoutMode ?? "EASY_OS", motion: typeof theme.motion === "boolean" ? theme.motion : profile.themeConfig.motion ?? true, glow: typeof theme.glow === "boolean" ? theme.glow : profile.themeConfig.glow ?? true, accentColor: typeof theme.accentColor === "string" && /^#[0-9a-f]{6}$/i.test(theme.accentColor) ? theme.accentColor : profile.themeConfig.accentColor, motionPreset: theme.motionPreset === "NEON_CYBER" || theme.motionPreset === "GLASS_OS" || theme.motionPreset === "KINETIC_MINIMAL" ? theme.motionPreset : profile.themeConfig.motionPreset };
    }
    if (body.layoutMode === "EASY_OS" || body.layoutMode === "NEON_FUNNEL") update.themeConfig = { ...(update.themeConfig ?? profile.themeConfig), layoutMode: body.layoutMode };
    if (typeof body.accentColor === "string" && /^#[0-9a-f]{6}$/i.test(body.accentColor)) update.themeConfig = { ...(update.themeConfig ?? profile.themeConfig), accentColor: body.accentColor };
    if (body.motionPreset === "NEON_CYBER" || body.motionPreset === "GLASS_OS" || body.motionPreset === "KINETIC_MINIMAL") update.themeConfig = { ...(update.themeConfig ?? profile.themeConfig), motionPreset: body.motionPreset };
    if (typeof body.motion === "boolean") update.themeConfig = { ...(update.themeConfig ?? profile.themeConfig), motion: body.motion };
    if (typeof body.glow === "boolean") update.themeConfig = { ...(update.themeConfig ?? profile.themeConfig), glow: body.glow };
    if (Array.isArray(body.socialLinks)) {
      const result: SocialLink[] = [];
      for (const item of body.socialLinks.slice(0, 8)) {
        if (!item || typeof item !== "object") continue;
        const social = item as Record<string, unknown>;
        if (typeof social.platform !== "string" || typeof social.url !== "string" || !social.url.trim()) continue;
        const platform = social.platform.toUpperCase();
        if (!["INSTAGRAM", "TIKTOK", "YOUTUBE", "EMAIL", "X", "LINKEDIN", "WEBSITE"].includes(platform)) continue;
        const url = platform === "EMAIL" && /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(social.url.trim()) ? social.url.trim() : normalizeHttpUrl(social.url);
        if (!url) return Response.json({ error: `Please enter a valid ${platform.toLowerCase()} URL.` }, { status: 400 });
        result.push({ platform, url, position: result.length });
      }
      update.socialLinks = result;
    }
    await db.update(profiles).set(update).where(eq(profiles.id, profile.id));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not update your profile." }, { status: 400 });
  }
}

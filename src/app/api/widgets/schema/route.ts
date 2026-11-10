import { z } from "zod";
import { ActionSchema, BentoShowcaseGridSchema, NeonActionButtonSchema, OSWindowCardSchema, PageStateSchema, PulseWidgetSchema, TaskbarDockSchema, VerticalVideoReelSchema } from "@/lib/widget-schema";

export async function GET() {
  return Response.json({ schemaVersion: "1.0.0", description: "PulseLink page state uses a responsive 2-column grid with a single-column mobile fallback. Widgets are ordered by position; FEATURED spans two columns.", pageState: z.toJSONSchema(PageStateSchema), widget: z.toJSONSchema(PulseWidgetSchema), components: { OS_WINDOW_CARD: z.toJSONSchema(OSWindowCardSchema), VERTICAL_VIDEO_REEL: z.toJSONSchema(VerticalVideoReelSchema), NEON_ACTION_BUTTON: z.toJSONSchema(NeonActionButtonSchema), BENTO_SHOWCASE_GRID: z.toJSONSchema(BentoShowcaseGridSchema), TASKBAR_DOCK: z.toJSONSchema(TaskbarDockSchema), action: z.toJSONSchema(ActionSchema) }, events: ["PAGE_VIEW", "WINDOW_OPEN", "VIDEO_PLAY", "VIDEO_WATCH", "CTA_CLICK", "WHATSAPP_CLICK", "BOOKING_OPEN", "LINK_CLICK"] }, { headers: { "Cache-Control": "public, max-age=3600" } });
}

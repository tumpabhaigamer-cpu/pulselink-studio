"use client";

import { useState } from "react";
import { Check, Sparkles, WandSparkles } from "lucide-react";
import type { ThemeConfig } from "@/lib/types";

type Preset = NonNullable<ThemeConfig["motionPreset"]>;
const presets: { id: Preset; name: string; description: string; color: string }[] = [
  { id: "NEON_CYBER", name: "Neon Cyber Glow", description: "Bold light and energetic motion", color: "#c9ff67" },
  { id: "GLASS_OS", name: "Glassmorphism OS", description: "Soft glass and floating windows", color: "#bba6ff" },
  { id: "KINETIC_MINIMAL", name: "Kinetic Minimal", description: "Clean motion, less glow", color: "#f2bc99" },
];
function hueHex(hue: number) { const s = .9, l = .68; const a = s * Math.min(l, 1 - l); const f = (n: number) => { const k = (n + hue / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, "0"); }; return `#${f(0)}${f(8)}${f(4)}`; }
export function MotionPresets({ theme, onPreset, onAccent }: { theme: ThemeConfig; onPreset: (preset: Preset, color: string) => void; onAccent: (color: string) => void }) {
  const [hue, setHue] = useState(88);
  return <details className="motion-presets"><summary><WandSparkles size={13} /> Presets <span>⌄</span></summary><div className="motion-popover"><div className="motion-popover-head"><span>LOOK & FEEL / 01</span><Sparkles size={15} /></div><strong>Make it move.</strong><p>One click, a whole new vibe.</p><div className="motion-preset-list">{presets.map((preset) => <button key={preset.id} onClick={() => onPreset(preset.id, preset.color)}><span style={{ background: preset.color }} /><div><b>{preset.name}</b><small>{preset.description}</small></div>{(theme.motionPreset ?? "GLASS_OS") === preset.id && <Check size={14} />}</button>)}</div><label>ACCENT COLOR <span style={{ background: theme.accentColor ?? "#c9ff67" }} /></label><input type="range" min="0" max="359" value={hue} aria-label="Accent color hue" onChange={(event) => setHue(Number(event.target.value))} onPointerUp={(event) => onAccent(hueHex(Number(event.currentTarget.value)))} onKeyUp={(event) => onAccent(hueHex(Number(event.currentTarget.value)))} /><small>Drag the slider to set your accent.</small></div></details>;
}

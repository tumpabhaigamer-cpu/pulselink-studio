import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { LockConfig, RoutingRule } from "@/lib/types";

export function normalizeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim() || value.length > 2048) return null;
  try {
    const raw = value.trim();
    const url = new URL(/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(raw) ? raw : `https://${raw}`);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url.toString();
  } catch { return null; }
}

export function normalizeImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  if (value.startsWith("/images/") && !value.includes("..")) return value;
  return normalizeHttpUrl(value);
}

export function hashPasscode(pin: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(pin, salt, 32).toString("hex")}`;
}

export function verifyPasscode(pin: string, stored: string | null | undefined) {
  if (!stored || pin.length > 128) return false;
  const [algorithm, salt, hash] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  try {
    const expected = Buffer.from(hash, "hex");
    const actual = scryptSync(pin, salt, 32);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch { return false; }
}

export function buildGate(input: unknown, existing: LockConfig = {}): { lock: LockConfig; error?: string } {
  if (!input || typeof input !== "object") return { lock: existing };
  const gate = input as { type?: unknown; pin?: unknown };
  if (gate.type === "PIN") {
    const pin = typeof gate.pin === "string" ? gate.pin.trim() : "";
    if (pin && (pin.length < 4 || pin.length > 64)) return { lock: existing, error: "Passcodes must be 4–64 characters." };
    const passcodeHash = pin ? hashPasscode(pin) : existing.codeLock?.passcodeHash;
    if (!passcodeHash) return { lock: existing, error: "Enter a passcode for this link." };
    return { lock: { codeLock: { enabled: true, passcodeHash } } };
  }
  if (gate.type === "EMAIL") return { lock: { subscribeLock: { enabled: true, collectEmail: true } } };
  if (gate.type === "AGE") return { lock: { ageLock: { enabled: true, minAge: 18 } } };
  if (gate.type === "SENSITIVE") return { lock: { sensitiveWarning: { enabled: true } } };
  return { lock: {} };
}

export function destinationForRequest(url: string | null, rules: RoutingRule[], request: Request) {
  const agent = request.headers.get("user-agent") ?? "";
  const country = (request.headers.get("cf-ipcountry") ?? "").toUpperCase();
  const matching = rules.find((rule) => (rule.condition === "OS_IOS" && /iPhone|iPad|iPod/i.test(agent)) || (rule.condition === "OS_ANDROID" && /Android/i.test(agent)) || (rule.condition.startsWith("COUNTRY_") && rule.condition.slice(8) === country));
  return normalizeHttpUrl(matching?.destinationUrl) ?? normalizeHttpUrl(url);
}

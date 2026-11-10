import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { db } from "@/db";
import { youtubeConnections } from "@/db/schema";
import { eq } from "drizzle-orm";

function encryptionKey() {
  const value = process.env.INTEGRATION_ENCRYPTION_KEY ?? "";
  try {
    const key = /^[a-f0-9]{64}$/i.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
    return key.length === 32 ? key : null;
  } catch { return null; }
}

export function youtubeOAuthConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI && encryptionKey());
}

export function encryptToken(token: string) {
  const key = encryptionKey(); if (!key) throw new Error("Integration encryption is not configured.");
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptToken(value: string) {
  const key = encryptionKey(); if (!key) throw new Error("Integration encryption is not configured.");
  const [iv, tag, encrypted] = value.split(".");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

export async function getYoutubeAccessToken(profileId: string): Promise<string | null> {
  if (!youtubeOAuthConfigured()) return null;
  const [connection] = await db.select().from(youtubeConnections).where(eq(youtubeConnections.profileId, profileId)).limit(1);
  if (!connection) return null;
  if (connection.expiresAt.getTime() > Date.now() + 60000) return decryptToken(connection.encryptedAccessToken);
  const body = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, refresh_token: decryptToken(connection.encryptedRefreshToken), grant_type: "refresh_token" });
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body, signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!response.ok) return null;
  const result = await response.json() as { access_token?: string; expires_in?: number };
  if (!result.access_token) return null;
  await db.update(youtubeConnections).set({ encryptedAccessToken: encryptToken(result.access_token), expiresAt: new Date(Date.now() + (result.expires_in ?? 3600) * 1000), updatedAt: new Date() }).where(eq(youtubeConnections.id, connection.id));
  return result.access_token;
}

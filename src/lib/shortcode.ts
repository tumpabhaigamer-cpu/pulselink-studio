export function shortCodeForId(id: string) {
  const hex = id.replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/i.test(hex)) return "";
  const bytes = hex.match(/.{2}/g)!.map((part) => String.fromCharCode(parseInt(part, 16))).join("");
  return btoa(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function idFromShortCode(code: string) {
  if (!/^[A-Za-z0-9_-]{22}$/.test(code)) return null;
  try {
    const hex = Buffer.from(code, "base64url").toString("hex");
    if (hex.length !== 32 || Buffer.from(hex, "hex").toString("base64url") !== code) return null;
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch { return null; }
}

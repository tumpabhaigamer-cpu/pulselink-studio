export function instagramConfigured(username: string) {
  const required = ["META_APP_SECRET", "META_VERIFY_TOKEN", "INSTAGRAM_ACCOUNT_ID", "INSTAGRAM_PAGE_ID", "INSTAGRAM_PAGE_ACCESS_TOKEN", "INSTAGRAM_PROFILE_USERNAME", "APP_BASE_URL"];
  if (!required.every((key) => !!process.env[key]) || process.env.INSTAGRAM_PROFILE_USERNAME?.toLowerCase() !== username.toLowerCase()) return false;
  if (!/^\d+$/.test(process.env.INSTAGRAM_ACCOUNT_ID!) || !/^\d+$/.test(process.env.INSTAGRAM_PAGE_ID!)) return false;
  try { return new URL(process.env.APP_BASE_URL!).protocol === "https:"; } catch { return false; }
}

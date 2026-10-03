// External URLs are untrusted: https only, no credentials, host must be on the allowlist.
const HOSTS = [/^([a-z0-9-]+\.)*dexscreener\.com$/i];

export function safeUrl(raw) {
  if (typeof raw !== 'string' || raw.length > 600) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
    if (!HOSTS.some((re) => re.test(u.hostname))) return null;
    return u.href;
  } catch {
    return null;
  }
}

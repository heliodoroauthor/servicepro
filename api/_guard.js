// Shared best-effort guards for serverless endpoints (rate limit + client IP).
// Files starting with "_" are not exposed as routes by Vercel, only importable.
const _hits = new Map();
export function rateLimited(ip, max = 10, windowMs = 60000) {
  const now = Date.now();
  const rec = _hits.get(ip) || { count: 0, reset: now + windowMs };
  if (now > rec.reset) { rec.count = 0; rec.reset = now + windowMs; }
  rec.count++; _hits.set(ip, rec);
  return rec.count > max;
}
export function clientIp(req) {
  return (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
}

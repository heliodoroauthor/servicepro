// Vercel Serverless Function — POST /api/ai-suggest
// Secure transparent proxy to the Anthropic Messages API.
// The ANTHROPIC_API_KEY stays server-side (never shipped to the browser).
// Accepts either:
//   { prompt, maxTokens }                     — simple shape
//   { model, max_tokens, system, messages }   — Anthropic shape (passed through)
// Returns the Anthropic response verbatim, so existing `data.content[0].text`
// callers keep working, plus convenience { success, text }.

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

// Best-effort in-memory rate limit (resets per serverless instance).
const _hits = new Map();
function rateLimited(ip, max = 30, windowMs = 60000) {
  const now = Date.now();
  const rec = _hits.get(ip) || { count: 0, reset: now + windowMs };
  if (now > rec.reset) { rec.count = 0; rec.reset = now + windowMs; }
  rec.count++; _hits.set(ip, rec);
  return rec.count > max;
}

function setCors(req, res) {
  const allowed = process.env.ALLOWED_ORIGIN || "*";
  if (allowed === "*") {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else {
    const list = allowed.split(",").map(s => s.trim());
    const origin = req.headers.origin || "";
    res.setHeader("Access-Control-Allow-Origin", list.includes(origin) ? origin : list[0]);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return res.status(429).json({ error: "Too many requests, slow down." });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });

  const body = req.body || {};
  let { model, max_tokens, maxTokens, system, messages, prompt } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    if (!prompt) return res.status(400).json({ error: "Provide 'messages' or 'prompt'." });
    messages = [{ role: "user", content: prompt }];
  }

  const payload = { model: model || DEFAULT_MODEL, max_tokens: max_tokens || maxTokens || 1024, messages };
  if (system) payload.system = system;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("Claude API error:", r.status, data);
      return res.status(r.status).json({ error: data?.error?.message || "Claude API error", detail: data });
    }
    const text = data?.content?.[0]?.text || "";
    return res.status(200).json({ ...data, success: true, text });
  } catch (err) {
    console.error("ai-suggest error:", err.message);
    return res.status(500).json({ error: "Server error", detail: err.message });
  }
}

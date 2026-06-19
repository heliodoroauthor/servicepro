// Vercel Serverless Function — POST /api/ai-suggest
// Secure AI proxy. Keeps the provider key server-side and returns an
// Anthropic-shaped response ({ content:[{text}] }) so every existing caller
// (which reads data.content[0].text) keeps working unchanged.
//
// Provider is chosen by which env var is set — no code change to switch:
//   GROQ_API_KEY     -> Groq (free tier, OpenAI-compatible)  [default: llama-3.3-70b-versatile]
//   ANTHROPIC_API_KEY-> Anthropic Claude (fallback / upgrade later)
//   neither          -> friendly "not configured" message (UI degrades gracefully)
//
// Accepts { prompt, maxTokens } OR { model, max_tokens, system, messages }.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-20241022";

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

// Always Anthropic-shaped so the front-end degrades gracefully on any issue.
function reply(res, text) {
  return res.status(200).json({ content: [{ type: "text", text: text }], success: true, text: text });
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return res.status(429).json({ error: "Too many requests, slow down." });

  const body = req.body || {};
  let { max_tokens, maxTokens, system, messages, prompt } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    if (!prompt) return res.status(400).json({ error: "Provide 'messages' or 'prompt'." });
    messages = [{ role: "user", content: prompt }];
  }
  const maxTok = max_tokens || maxTokens || 1024;

  const groqKey = process.env.GROQ_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  try {
    // ---- Groq (free, OpenAI-compatible) ----
    if (groqKey) {
      const msgs = system ? [{ role: "system", content: system }, ...messages] : messages;
      const r = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + groqKey },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
          messages: msgs,
          max_tokens: maxTok,
          temperature: 0.7,
        }),
      });
      const data = await r.json();
      if (!r.ok) { console.error("Groq error:", r.status, data); return reply(res, "The AI service had an issue. Please try again in a moment."); }
      return reply(res, (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "");
    }

    // ---- Anthropic Claude (fallback / future upgrade) ----
    if (anthropicKey) {
      const payload = { model: process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL, max_tokens: maxTok, messages };
      if (system) payload.system = system;
      const r = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) { console.error("Anthropic error:", r.status, data); return reply(res, "The AI service had an issue. Please try again in a moment."); }
      return reply(res, (data && data.content && data.content[0] && data.content[0].text) || "");
    }

    // ---- Nothing configured ----
    return reply(res, "AI is not configured yet. Add a free GROQ_API_KEY in the server settings to turn on AI features.");
  } catch (err) {
    console.error("ai-suggest error:", err.message);
    return reply(res, "AI is temporarily unavailable. Please try again.");
  }
}

// Vercel Serverless Function — POST /api/ai-suggest
// Secure proxy to Claude API. The ANTHROPIC_API_KEY stays server-side.

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST")
          return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey)
          return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server." });

  const { prompt, maxTokens } = req.body || {};
    if (!prompt)
          return res.status(400).json({ error: "Missing 'prompt' field in request body." });

  try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                          "Content-Type": "application/json",
                          "x-api-key": apiKey,
                          "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                          model: "claude-sonnet-4-20250514",
                          max_tokens: maxTokens || 2048,
                          messages: [{ role: "user", content: prompt }],
                }),
        });

      if (!response.ok) {
              const errBody = await response.text();
              return res.status(response.status).json({
                        error: "Claude API error",
                        status: response.status,
                        detail: errBody,
              });
      }

      const data = await response.json();
        const text = data?.content?.[0]?.text || "";
        return res.status(200).json({ success: true, text });
  } catch (err) {
        return res.status(500).json({ error: "Server error", detail: err.message });
  }
}

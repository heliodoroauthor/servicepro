// Vercel Serverless Function â POST /api/ivr-ai
// Receives caller speech/digits from the IVR webhook, sends context to Claude,
// and returns a spoken reply for Twilio <Say>.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return res.status(200).json({ reply: "The AI service is not configured yet. Please try again later." });

  // âââ Parse inputs âââ
  const intent = req.query.intent || "general";
  const from = decodeURIComponent(req.query.from || "");
  const { speech, digits, callerName } = req.body || {};

  const callerInput = speech || digits || "";
  if (!callerInput.trim()) {
    return res.status(200).json({ reply: "I didn't catch that. Could you please repeat?" });
  }

  // âââ Build Claude prompt âââ
  const systemPrompt = buildSystemPrompt(intent, from, callerName);

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
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: callerInput }],
      }),
    });

    if (!response.ok) {
      console.error("Claude API error:", response.status);
      return res.status(200).json({ reply: "I had trouble processing your request. Let me transfer you to our team." });
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text || "I could not generate a response.";

    // Trim for phone â keep under ~40 seconds of speech (~150 words)
    const trimmed = trimForSpeech(text, 150);

    return res.status(200).json({ success: true, reply: trimmed });
  } catch (err) {
    console.error("ivr-ai error:", err.message);
    return res.status(200).json({ reply: "Sorry, an error occurred. Please try again or press 0 for a live agent." });
  }
}

/* ââââââ Prompt builder ââââââ */
function buildSystemPrompt(intent, callerPhone, callerName) {
  const base = `You are a friendly, professional AI phone assistant for ServicePro, a field-service company specializing in HVAC, plumbing, and electrical work.

RULES FOR PHONE RESPONSES:
- Keep responses SHORT (2-4 sentences max). This will be read aloud via text-to-speech.
- Use simple, conversational language. No bullet points, no markdown, no special characters.
- Avoid technical jargon unless the caller uses it first.
- Be warm and helpful. Address the caller by name if known.
- If you cannot answer something, offer to transfer to a live agent.
- Never mention that you are an AI unless directly asked.
- Do not use abbreviations like "HVAC" â say "heating and cooling" instead.
- Avoid numbers with many decimals. Round prices to the nearest dollar.`;

  const callerInfo = callerName
    ? `\nThe caller's name is ${callerName}. Their phone number is ${callerPhone}.`
    : callerPhone
      ? `\nThe caller's phone number is ${callerPhone}.`
      : "";

  const intentContext = {
    appointments: `\n\nThe caller wants help with APPOINTMENTS â scheduling, rescheduling, or checking upcoming service visits. If they want to schedule, collect: their name, preferred date/time, type of service needed, and address. Confirm the details back to them. Let them know our standard service window is 8am to 5pm, Monday through Saturday.`,
    status: `\n\nThe caller wants to check JOB STATUS â the progress of an active job, an estimate, or an invoice. Ask for their name or job number. If you don't have real data, let them know you'll have a team member follow up with the details shortly, and ask if there's anything else.`,
    support: `\n\nThe caller needs TECHNICAL SUPPORT â they may have an equipment issue, emergency, or question. Listen carefully, ask clarifying questions (what equipment, when it started, any error codes). Provide basic troubleshooting if safe to do. For emergencies like gas leaks or flooding, tell them to call 911 first, then we can help with repairs.`,
    general: `\n\nThe caller has a general question. Help them with whatever they need â hours of operation, service areas, pricing estimates, etc.`,
  };

  return base + callerInfo + (intentContext[intent] || intentContext.general);
}

/* ââââââ Trim text for phone TTS ââââââ */
function trimForSpeech(text, maxWords) {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  // Find the last sentence boundary within limit
  const truncated = words.slice(0, maxWords).join(" ");
  const lastPeriod = truncated.lastIndexOf(".");
  if (lastPeriod > truncated.length * 0.5) return truncated.substring(0, lastPeriod + 1);
  return truncated + "...";
}

// Vercel Serverless Function — POST /api/make-call
// Initiates a Twilio outbound call: rings the user's phone, then connects to the client
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { to } = req.body || {};

  if (!to) {
    return res.status(400).json({ error: "Missing 'to' field (client phone)" });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_PHONE_NUMBER;
  const userPhone  = process.env.TWILIO_USER_PHONE;

  if (!accountSid || !authToken || !from) {
    return res.status(500).json({ error: "Twilio credentials not configured" });
  }

  if (!userPhone) {
    return res.status(500).json({ error: "TWILIO_USER_PHONE not configured" });
  }

  // Clean client phone number
  let toPhone = to.replace(/[^+\d]/g, "");
  if (!toPhone.startsWith("+")) {
    toPhone = toPhone.length === 10 ? "+1" + toPhone : "+" + toPhone;
  }

  try {
    // Build TwiML callback URL using request host
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const twimlUrl = `https://${host}/api/call-twiml?to=${encodeURIComponent(toPhone)}`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    // Step 1: Call the USER's phone
    // Step 2: When user answers, Twilio fetches twimlUrl which dials the client
    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: userPhone,
        From: from,
        Url: twimlUrl,
      }).toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Twilio call error:", data);
      return res.status(response.status).json({
        error: data.message || "Twilio API error",
        code: data.code,
      });
    }

    return res.status(200).json({
      success: true,
      sid: data.sid,
      status: data.status,
    });
  } catch (err) {
    console.error("Make call error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

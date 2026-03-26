// Vercel Serverless Function — POST /api/send-sms
// Uses Twilio REST API directly (no SDK needed)
export default async function handler(req, res) {
  // CORS headers for the SPA
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { to, body } = req.body || {};

  if (!to || !body) {
    return res.status(400).json({ error: "Missing 'to' or 'body' field" });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    return res.status(500).json({ error: "Twilio credentials not configured" });
  }

  // Clean up the phone number — ensure it has country code
  let toPhone = to.replace(/[^+\d]/g, "");
  if (!toPhone.startsWith("+")) {
    // Assume US number if no country code
    toPhone = toPhone.length === 10 ? "+1" + toPhone : "+" + toPhone;
  }

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toPhone, From: from, Body: body }).toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Twilio error:", data);
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
    console.error("Send SMS error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
      }

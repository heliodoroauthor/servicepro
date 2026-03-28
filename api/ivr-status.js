// Vercel Serverless Function â POST /api/ivr-status
// Twilio status callback for IVR calls.
// Logs call events (completed, failed, busy, no-answer, transfer).

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const {
    CallSid,
    CallStatus,
    From,
    To,
    Direction,
    Duration,
    CallerName,
    Timestamp,
  } = req.body || {};

  const event = req.query.event || "status";

  // Log for Vercel function logs (visible in Vercel dashboard â Logs)
  console.log(JSON.stringify({
    type: "ivr-call-event",
    event,
    callSid: CallSid,
    status: CallStatus,
    from: From,
    to: To,
    direction: Direction,
    duration: Duration,
    callerName: CallerName,
    timestamp: Timestamp || new Date().toISOString(),
  }));

  // Return TwiML only if this is a Twilio action callback (e.g., after transfer)
  if (event === "transfer") {
    if (CallStatus === "completed") {
      res.setHeader("Content-Type", "text/xml");
      return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you for calling ServicePro. Goodbye!</Say>
</Response>`);
    }
    // Transfer failed (busy/no-answer)
    res.setHeader("Content-Type", "text/xml");
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Sorry, the agent was not available. Please try calling back during business hours, 8 AM to 5 PM, Monday through Saturday. Goodbye.</Say>
</Response>`);
  }

  // For standard status callbacks, just acknowledge
  return res.status(200).json({ received: true, callSid: CallSid, status: CallStatus });
}

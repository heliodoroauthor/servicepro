// Vercel Serverless Function â POST /api/ivr-webhook
// Main Twilio Voice webhook. Handles incoming calls with IVR menu.
// Twilio sends POST data; we respond with TwiML XML.

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/xml");
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Twilio POST params
  const { Digits, SpeechResult, CallSid, From, CallerName, CallStatus } = req.body || {};

  // Which step in the IVR tree?
  const step = req.query.step || "greeting";

  // âââ GREETING âââ
  if (step === "greeting") {
    return res.status(200).send(twiml_greeting(From, CallerName));
  }

  // âââ MAIN MENU selection âââ
  if (step === "menu") {
    const digit = Digits || "";
    if (digit === "1") return res.status(200).send(twiml_submenu("appointments"));
    if (digit === "2") return res.status(200).send(twiml_submenu("status"));
    if (digit === "3") return res.status(200).send(twiml_submenu("support"));
    if (digit === "0") return res.status(200).send(twiml_transfer());
    // Invalid or no input â replay menu
    return res.status(200).send(twiml_greeting(From, CallerName, true));
  }

  // âââ SUB-MENU: caller speaks or enters digits âââ
  if (step === "gather-input") {
    const intent = req.query.intent || "general";
    const spoken = SpeechResult || "";
    const digits = Digits || "";
    // Forward to AI handler
    const aiUrl = `${baseUrl(req)}/api/ivr-ai?intent=${intent}&callSid=${CallSid}&from=${encodeURIComponent(From || "")}`;
    try {
      const aiRes = await fetch(aiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speech: spoken, digits, callerName: CallerName || "" }),
      });
      const aiData = await aiRes.json();
      return res.status(200).send(twiml_aiResponse(aiData.reply || "I could not process that request.", intent));
    } catch (e) {
      return res.status(200).send(twiml_aiResponse("Sorry, I encountered an error. Please try again.", intent));
    }
  }

  // âââ FALLBACK âââ
  return res.status(200).send(twiml_greeting(From, CallerName));
}

/* ââââââ TwiML generators ââââââ */

function baseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

function twiml_greeting(from, callerName, isRetry) {
  const name = callerName ? `, ${callerName}` : "";
  const retryMsg = isRetry ? "I didn't catch that. " : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${retryMsg}Thank you for calling ServicePro${name}. Our AI assistant is here to help you.</Say>
  <Gather input="dtmf speech" timeout="6" numDigits="1" action="/api/ivr-webhook?step=menu" method="POST"
         speechTimeout="auto" language="en-US" hints="appointments, status, support, agent">
    <Say voice="Polly.Joanna">Press 1 or say Appointments to schedule or check your appointments.
Press 2 or say Status to check the status of a job or estimate.
Press 3 or say Support for technical support.
Press 0 or say Agent to speak with a live person.</Say>
  </Gather>
  <Say voice="Polly.Joanna">We didn't receive any input. Goodbye.</Say>
</Response>`;
}

function twiml_submenu(intent) {
  const prompts = {
    appointments: "You selected appointments. Please tell me your name or describe what you need. For example, say 'I want to schedule a maintenance visit' or 'Check my next appointment'.",
    status: "You selected job status. Please tell me your name or job number so I can look up your information.",
    support: "You selected technical support. Please describe the issue you are experiencing. For example, say 'My AC is not cooling' or 'I have a water leak'.",
  };
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf speech" timeout="8" action="/api/ivr-webhook?step=gather-input&amp;intent=${intent}" method="POST"
         speechTimeout="auto" language="en-US">
    <Say voice="Polly.Joanna">${prompts[intent] || prompts.support}</Say>
  </Gather>
  <Say voice="Polly.Joanna">I didn't hear anything. Returning to the main menu.</Say>
  <Redirect method="POST">/api/ivr-webhook?step=greeting</Redirect>
</Response>`;
}

function twiml_aiResponse(reply, intent) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(reply)}</Say>
  <Gather input="dtmf speech" timeout="8" action="/api/ivr-webhook?step=gather-input&amp;intent=${intent}" method="POST"
         speechTimeout="auto" language="en-US">
    <Say voice="Polly.Joanna">Is there anything else I can help you with? Or press 0 to speak with a live person.</Say>
  </Gather>
  <Say voice="Polly.Joanna">Thank you for calling ServicePro. Have a great day!</Say>
</Response>`;
}

function twiml_transfer() {
  const agentPhone = process.env.TWILIO_USER_PHONE || "";
  if (!agentPhone) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I'm sorry, no agent phone number is configured. Please call back during business hours. Goodbye.</Say>
</Response>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Please hold while I connect you to an agent.</Say>
  <Dial callerId="${process.env.TWILIO_PHONE_NUMBER || ""}" timeout="30" action="/api/ivr-status?event=transfer">
    <Number>${agentPhone}</Number>
  </Dial>
  <Say voice="Polly.Joanna">Sorry, the agent is unavailable. Please try again later. Goodbye.</Say>
</Response>`;
}

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

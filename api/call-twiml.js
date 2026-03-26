// Vercel Serverless Function — GET /api/call-twiml?to=+1234567890
// Returns TwiML instructions that connect the answered call to the client's number
export default function handler(req, res) {
  const to = req.query.to || "";

  res.setHeader("Content-Type", "text/xml");

  if (!to) {
    return res.status(400).send(
      '<?xml version="1.0" encoding="UTF-8"?>\n<Response><Say language="es-MX">Error: numero de destino no proporcionado.</Say></Response>'
    );
  }

  const callerId = process.env.TWILIO_PHONE_NUMBER || "";

  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-MX">Conectando con el cliente. Por favor espere.</Say>
  <Dial callerId="${callerId}" timeout="30">
    <Number>${to}</Number>
  </Dial>
</Response>`);
}

import { readFileSync, writeFileSync } from 'fs';

// This script patches ServiceProApp.jsx to connect the existing sendSms function
// to the real Twilio API via the /api/send-sms serverless endpoint.
// Run AFTER fix-duplicates.mjs and add-csv-import.mjs in the prebuild chain.

const file = 'src/ServiceProApp.jsx';
let content = readFileSync(file, 'utf8');

// Helper: find a function body using brace-depth tracking
function findFunctionRange(src, funcName) {
  const marker = 'function ' + funcName + '(';
  const start = src.indexOf(marker);
  if (start === -1) return null;
  // Find the opening brace
  let i = src.indexOf('{', start);
  if (i === -1) return null;
  let depth = 1;
  i++;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  // Walk back to find the true start (include leading whitespace on same line)
  let lineStart = start;
  while (lineStart > 0 && src[lineStart - 1] !== '\n') lineStart--;
  return { start: lineStart, end: i };
}

// --- PATCH 1: Add SMS sending states ---
const smsStates = '  const [smsSending, setSmsSending] = useState(false);\n  const [smsError, setSmsError] = useState("");\n';

// Try to add after newSms state
const newSmsIdx = content.indexOf('const [newSms, setNewSms] = useState(');
if (newSmsIdx !== -1) {
  const eol = content.indexOf('\n', newSmsIdx);
  if (eol !== -1) {
    content = content.slice(0, eol + 1) + smsStates + content.slice(eol + 1);
    console.log('[add-twilio-sms] Injected smsSending/smsError states after newSms');
  }
} else {
  const range = findFunctionRange(content, 'sendSms');
  if (range) {
    content = content.slice(0, range.start) + smsStates + content.slice(range.start);
    console.log('[add-twilio-sms] Injected smsSending/smsError states before sendSms (fallback)');
  }
}

// --- PATCH 2: Replace the sendSms function using brace tracking ---
const newSendSms = `  async function sendSms() {
    if(!newSms.trim() || smsSending) return;
    if(!selC || !selC.phone) { setSmsError("Cliente sin numero de telefono"); return; }
    setSmsSending(true);
    setSmsError("");
    try {
      const res = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: selC.phone, body: newSms })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || "Error al enviar SMS");
      setSmsLog(p => [...p,{id:Date.now(),clientId:sel,dir:"out",msg:newSms,time:new Date().toLocaleString(),sid:data.sid}]);
      setNewSms("");
    } catch(e) {
      setSmsError(e.message);
    } finally {
      setSmsSending(false);
    }
  }`;

const range = findFunctionRange(content, 'sendSms');
if (range) {
  content = content.slice(0, range.start) + newSendSms + '\n' + content.slice(range.end);
  console.log('[add-twilio-sms] Replaced sendSms function (' + range.start + '-' + range.end + ')');
} else {
  console.error('[add-twilio-sms] ERROR: Could not find sendSms function!');
  process.exit(1);
}

// --- PATCH 3: Add disabled state to send button ---
const sendBtnPattern = /onClick=\{sendSms\}/;
if (sendBtnPattern.test(content)) {
  content = content.replace(sendBtnPattern, 'onClick={sendSms} disabled={smsSending}');
  console.log('[add-twilio-sms] Added disabled state to send button');
}

// --- PATCH 4: Add error message display before SMS log ---
const smsErrorDisplay = '{smsError && <div style={{color:"#ef4444",padding:"8px 12px",background:"#fef2f2",borderRadius:8,marginBottom:8,fontSize:13}}>{smsError}</div>}';

if (content.includes('{cSms.map(')) {
  content = content.replace('{cSms.map(', smsErrorDisplay + '\n              {cSms.map(');
  console.log('[add-twilio-sms] Added error display before SMS log');
} else if (content.includes('{smsLog.filter')) {
  content = content.replace('{smsLog.filter', smsErrorDisplay + '\n              {smsLog.filter');
  console.log('[add-twilio-sms] Added error display before SMS log (alt)');
} else {
  console.warn('[add-twilio-sms] Could not find SMS log for error display');
}

writeFileSync(file, content);
console.log('[add-twilio-sms] All Twilio SMS patches applied successfully!');

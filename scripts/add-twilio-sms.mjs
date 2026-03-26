import { readFileSync, writeFileSync } from 'fs';

// This script patches ServiceProApp.jsx to connect the existing sendSms function
// to the real Twilio API via the /api/send-sms serverless endpoint.
// Run AFTER fix-duplicates.mjs and add-csv-import.mjs in the prebuild chain.

const file = 'src/ServiceProApp.jsx';
let content = readFileSync(file, 'utf8');

// --- PATCH 1: Add SMS sending states after existing newSms state ---
const newSmsAnchor = 'const [newSms, setNewSms] = useState("");';
if (!content.includes(newSmsAnchor)) {
  const alt = "const [newSms, setNewSms] = useState('');"
  if (content.includes(alt)) {
    content = content.replace(alt, alt + `
  const [smsSending, setSmsSending] = useState(false);
  const [smsError, setSmsError] = useState("");`);
  } else {
    console.warn('[add-twilio-sms] WARNING: Could not find newSms state anchor. Trying fallback...');
    const fallbackAnchor = 'function sendSms()';
    if (content.includes(fallbackAnchor)) {
      content = content.replace(fallbackAnchor,
        `const [smsSending, setSmsSending] = useState(false);
  const [smsError, setSmsError] = useState("");
  ${fallbackAnchor}`);
    }
  }
} else {
  content = content.replace(newSmsAnchor, newSmsAnchor + `
  const [smsSending, setSmsSending] = useState(false);
  const [smsError, setSmsError] = useState("");`);
}

// --- PATCH 2: Replace the mock sendSms function with the real one ---
const oldVariants = [
  `function sendSms() {
    if(!newSms.trim()) return;
    setSmsLog(p => [...p,{id:Date.now(),clientId:sel,dir:"out",msg:newSms,time:new Date().toLocaleString()}]);
    setNewSms("");
  }`,
  `function sendSms() {
    if(!newSms.trim()) return;
    setSmsLog(p => [...p,{id:Date.now(),clientId:sel,dir:"out",msg:newSms,time:new Date().toLocaleString()}]);
    setNewSms("");
}`,
];

const newSendSms = `async function sendSms() {
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

let patched = false;
for (const variant of oldVariants) {
  if (content.includes(variant)) {
    content = content.replace(variant, newSendSms);
    patched = true;
    console.log('[add-twilio-sms] Patched sendSms function (exact match)');
    break;
  }
}

// If exact match failed, use regex to find and replace
if (!patched) {
  const sendSmsRegex = /function sendSms\(\)\s*\{[^}]*setSmsLog\([^)]*\)[^}]*setNewSms\([^)]*\)[^}]*\}/;
  if (sendSmsRegex.test(content)) {
    content = content.replace(sendSmsRegex, newSendSms);
    patched = true;
    console.log('[add-twilio-sms] Patched sendSms function (regex match)');
  }
}

if (!patched) {
  console.error('[add-twilio-sms] ERROR: Could not find sendSms function to patch!');
  const idx = content.indexOf('function sendSms()');
  if (idx !== -1) {
    console.error('  Found at index ' + idx + ', but pattern did not match.');
    console.error('  Surrounding code: "' + content.substring(idx, idx + 200) + '"');
  }
  process.exit(1);
}

// --- PATCH 3: Add error display and sending indicator to the SMS UI ---
const sendBtnPattern = /onClick=\{sendSms\}/;
if (sendBtnPattern.test(content)) {
  content = content.replace(sendBtnPattern, 'onClick={sendSms} disabled={smsSending}');
  console.log('[add-twilio-sms] Added disabled state to send button');
}

// Add error message display before the SMS log
const smsErrorDisplay = '{smsError && <div style={{color:"#ef4444",padding:"8px 12px",background:"#fef2f2",borderRadius:8,marginBottom:8,fontSize:13}}>{smsError}</div>}';

const smsLogMapPattern = /{cSms\.map\(/;
if (smsLogMapPattern.test(content)) {
  content = content.replace(smsLogMapPattern, smsErrorDisplay + '\n              {cSms.map(');
  console.log('[add-twilio-sms] Added error display before SMS log');
} else {
  const altLogPattern = /{smsLog\.filter/;
  if (altLogPattern.test(content)) {
    content = content.replace(altLogPattern, smsErrorDisplay + '\n              {smsLog.filter');
    console.log('[add-twilio-sms] Added error display before SMS log (alt pattern)');
  } else {
    console.warn('[add-twilio-sms] Could not find SMS log to add error display');
  }
}

writeFileSync(file, content);
console.log('[add-twilio-sms] All Twilio SMS patches applied successfully!');

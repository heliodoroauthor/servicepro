import { readFileSync, writeFileSync } from 'fs';

// This script patches ServiceProApp.jsx to add click-to-call functionality.
// On mobile: uses tel: protocol for native calling.
// On desktop: calls /api/make-call which triggers a Twilio callback flow.
// Run AFTER add-twilio-sms.mjs in the prebuild chain.

const file = 'src/ServiceProApp.jsx';
let content = readFileSync(file, 'utf8');

// Helper: find a function body using brace-depth tracking
function findFunctionRange(src, funcName) {
  // Try async version first
  let marker = 'async function ' + funcName + '(';
  let start = src.indexOf(marker);
  if (start === -1) {
    marker = 'function ' + funcName + '(';
    start = src.indexOf(marker);
  }
  if (start === -1) return null;
  let i = src.indexOf('{', start);
  if (i === -1) return null;
  let depth = 1;
  i++;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  let lineStart = start;
  while (lineStart > 0 && src[lineStart - 1] !== '\n') lineStart--;
  return { start: lineStart, end: i };
}

// PATCH 1: Add calling state
const callingState = '  const [calling, setCalling] = useState(false);\n';

// Insert after smsSending state (injected by add-twilio-sms.mjs)
let stateInjected = false;
const smsSendingIdx = content.indexOf('const [smsSending, setSmsSending] = useState(');
if (smsSendingIdx !== -1) {
  const eol = content.indexOf('\n', smsSendingIdx);
  if (eol !== -1) {
    content = content.slice(0, eol + 1) + callingState + content.slice(eol + 1);
    stateInjected = true;
    console.log('[add-click-to-call] Injected calling state after smsSending');
  }
}
if (!stateInjected) {
  const smsErrorIdx = content.indexOf('const [smsError, setSmsError] = useState(');
  if (smsErrorIdx !== -1) {
    const eol = content.indexOf('\n', smsErrorIdx);
    if (eol !== -1) {
      content = content.slice(0, eol + 1) + callingState + content.slice(eol + 1);
      stateInjected = true;
      console.log('[add-click-to-call] Injected calling state after smsError');
    }
  }
}
if (!stateInjected) {
  const range = findFunctionRange(content, 'sendSms');
  if (range) {
    content = content.slice(0, range.start) + callingState + content.slice(range.start);
    console.log('[add-click-to-call] Injected calling state before sendSms (last resort)');
  } else {
    console.warn('[add-click-to-call] WARNING: Could not find location for calling state');
  }
}

// PATCH 2: Add callClient function after sendSms
const callClientFn = `  async function callClient(phone) {
    if(!phone || calling) return;
    // Mobile: use native tel: protocol
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if(isMobile) {
      let p = phone.replace(/[^+\\d]/g,"");
      if(!p.startsWith("+")) p = p.length===10 ? "+1"+p : "+"+p;
      window.location.href = "tel:" + p;
      return;
    }
    // Desktop: Twilio callback — rings your phone, then connects to client
    setCalling(true);
    try {
      const res = await fetch("/api/make-call", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({to:phone})
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error||"Error al iniciar llamada");
      alert("Llamada iniciada — revisa tu telefono para contestar.");
    } catch(e) {
      alert("Error: "+e.message);
    } finally {
      setCalling(false);
    }
  }`;

const sendSmsRange = findFunctionRange(content, 'sendSms');
if (sendSmsRange) {
  content = content.slice(0, sendSmsRange.end) + '\n' + callClientFn + '\n' + content.slice(sendSmsRange.end);
  console.log('[add-click-to-call] Injected callClient function after sendSms (' + sendSmsRange.end + ')');
} else {
  console.error('[add-click-to-call] ERROR: Could not find sendSms function!');
  process.exit(1);
}

// PATCH 3: Wire up the Call button
// The button is: <button className="client-qa-btn">\u{1F4DE} Call</button>
const callBtnText = '\u{1F4DE} Call</button>';
const btnTextIdx = content.indexOf(callBtnText);
if (btnTextIdx !== -1) {
  let openTag = content.lastIndexOf('<button', btnTextIdx);
  if (openTag !== -1) {
    const fullBtn = content.slice(openTag, btnTextIdx + callBtnText.length);
    const closingBracket = fullBtn.indexOf('>');
    if (closingBracket !== -1) {
      const beforeClose = fullBtn.slice(0, closingBracket);
      const newBtn = beforeClose
        + ' onClick={()=>callClient(selC?.phone)} disabled={calling}'
        + '>{calling?"\u23F3 Llamando...":"\u{1F4DE} Call"}</button>';
      content = content.slice(0, openTag) + newBtn + content.slice(openTag + fullBtn.length);
      console.log('[add-click-to-call] Wired up Call button with onClick handler');
    }
  }
} else {
  console.warn('[add-click-to-call] WARNING: Could not find Call button');
}

writeFileSync(file, content);
console.log('[add-click-to-call] All click-to-call patches applied successfully!');

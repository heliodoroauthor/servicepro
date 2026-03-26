import { readFileSync, writeFileSync } from 'fs';

// This script patches ServiceProApp.jsx to add click-to-call functionality.
// On mobile: uses tel: protocol for native calling.
// On desktop: calls /api/make-call which triggers a Twilio callback flow.
// Run AFTER add-twilio-sms.mjs in the prebuild chain.

const file = 'src/ServiceProApp.jsx';
let content = readFileSync(file, 'utf8');

// âââ Helper: find a function body using brace-depth tracking âââ
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

// âââ PATCH 1: Add calling state âââ
const callingState = `  const [calling, setCalling] = useState(false);\n`;

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
  // Fallback: insert after smsError state
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
  // Last resort: before sendSms function
  const range = findFunctionRange(content, 'sendSms');
  if (range) {
    content = content.slice(0, range.start) + callingState + content.slice(range.start);
    console.log('[add-click-to-call] Injected calling state before sendSms (last resort)');
  } else {
    console.warn('[add-click-to-call] WARNING: Could not find location for calling state');
  }
}

// âââ PATCH 2: Add callClient function after sendSms âââ
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
    // Desktop: Twilio callback â rings your phone, then connects to client
    setCalling(true);
    try {
      const res = await fetch("/api/make-call", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({to:phone})
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error||"Error al iniciar llamada");
      alert("Llamada iniciada â revisa tu telefono para contestar.");
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

// âââ PATCH 3: Wire up the Call button âââ
// The Call button is multiline in the JSX source:
//   <button className="client-qa-btn">
//   ð Call
//   </button>
// Strategy: find each 'client-qa-btn' occurrence, check if "Call" appears
// nearby but NOT "Invoice", "Text", "Editar", then replace the whole button.
let callBtnFixed = false;
let callSearchPos = 0;
while (!callBtnFixed) {
  const classIdx = content.indexOf('client-qa-btn', callSearchPos);
  if (classIdx === -1) break;
  // Scope the snippet to this button's </button> â not a fixed 200 chars
  const btnCloseIdx = content.indexOf('</button>', classIdx);
  if (btnCloseIdx === -1) { callSearchPos = classIdx + 1; continue; }
  const snippet = content.slice(classIdx, btnCloseIdx);
  // Check if this button contains "Call" (within its own bounds only)
  if (snippet.indexOf('Call') !== -1 && snippet.indexOf('Invoice') === -1) {
    const btnStart = content.lastIndexOf('<button', classIdx);
    if (btnStart !== -1) {
      const closeBtn = btnCloseIdx;
      if (closeBtn !== -1) {
        const fullBtn = content.slice(btnStart, closeBtn + '</button>'.length);
        const newCallBtn = '<button className="client-qa-btn" onClick={()=>callClient(selC?.phone)} disabled={calling}>\n{calling?"\\u23F3 Llamando...":"\\u{1F4DE} Call"}\n</button>';
        content = content.slice(0, btnStart) + newCallBtn + content.slice(btnStart + fullBtn.length);
        callBtnFixed = true;
        console.log('[add-click-to-call] PATCH 3: Wired up Call button with onClick handler');
      }
    }
  }
  callSearchPos = classIdx + 1;
}
if (!callBtnFixed) {
  console.warn('[add-click-to-call] WARNING: Could not find Call button with client-qa-btn class');
}

writeFileSync(file, content);
console.log('[add-click-to-call] All click-to-call patches applied successfully!');

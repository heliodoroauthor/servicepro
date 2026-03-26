import { readFileSync, writeFileSync } from 'fs';

// This script patches ServiceProApp.jsx to:
// 1. Replace the alert-based callClient with a custom call modal overlay
// 2. Change the Text button to open the SMS tab (Twilio) instead of native sms:
// Run AFTER add-click-to-call.mjs (and add-client-edit.mjs) in the prebuild chain.

const file = 'src/ServiceProApp.jsx';
let content = readFileSync(file, 'utf8');

// âââ Helper: find a function body using brace-depth tracking âââ
function findFunctionRange(src, funcName) {
  let marker = 'async function ' + funcName + '(';
  let start = src.indexOf(marker);
  if (start === -1) {
    marker = 'function ' + funcName + '(';
    start = src.indexOf(marker);
  }
  if (start === -1) return null;
  let i = src.indexOf('{', start);
  if (i === -1) return null;
  let depth = 1; i++;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  let lineStart = start;
  while (lineStart > 0 && src[lineStart - 1] !== '\n') lineStart--;
  return { start: lineStart, end: i };
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// PATCH 1: Add call modal states after the existing 'calling' state
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const callModalStates = `  const [callModal, setCallModal] = useState(null);
  const [callStatus, setCallStatus] = useState("");\n`;

const callingIdx = content.indexOf('const [calling, setCalling] = useState(');
if (callingIdx !== -1) {
  const eol = content.indexOf('\n', callingIdx);
  if (eol !== -1) {
    content = content.slice(0, eol + 1) + callModalStates + content.slice(eol + 1);
    console.log('[add-call-sms-ui] PATCH 1: Injected callModal/callStatus states');
  }
} else {
  console.warn('[add-call-sms-ui] WARNING: Could not find calling state');
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// PATCH 2: Replace callClient with modal-based version
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const newCallClient = `  async function callClient(phone) {
    if(!phone || calling) return;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    // Clean phone
    let p = phone.replace(/[^+\\d]/g,"");
    if(!p.startsWith("+")) p = p.length===10 ? "+1"+p : "+"+p;
    if(isMobile) {
      // Mobile: show modal briefly then launch native dialer
      setCallModal({phone:p, name:selC?.name||"Cliente"});
      setCallStatus("Abriendo tel\\u00E9fono...");
      setTimeout(()=>{ window.location.href="tel:"+p; },400);
      setTimeout(()=>{ setCallModal(null); setCallStatus(""); },3000);
      return;
    }
    // Desktop: Twilio call bridge with live modal
    setCallModal({phone:p, name:selC?.name||"Cliente"});
    setCallStatus("Iniciando llamada...");
    setCalling(true);
    try {
      const res = await fetch("/api/make-call",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({to:phone})
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error||"Error al iniciar llamada");
      setCallStatus("\\u260E\\uFE0F Revisa tu tel\\u00E9fono para contestar");
      // Auto-close after 15 seconds
      setTimeout(()=>{ setCallModal(null); setCallStatus(""); },15000);
    } catch(e) {
      setCallStatus("\\u274C Error: "+e.message);
      setTimeout(()=>{ setCallModal(null); setCallStatus(""); },5000);
    } finally {
      setCalling(false);
    }
  }`;

const callClientRange = findFunctionRange(content, 'callClient');
if (callClientRange) {
  content = content.slice(0, callClientRange.start) + newCallClient + '\n' + content.slice(callClientRange.end);
  console.log('[add-call-sms-ui] PATCH 2: Replaced callClient with modal version');
} else {
  console.error('[add-call-sms-ui] ERROR: Could not find callClient function!');
  process.exit(1);
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// PATCH 3: Add call modal overlay JSX before the pets tab marker
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const callModalJSX = `{callModal && <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>{setCallModal(null);setCallStatus("");}}>
              <div style={{background:"var(--s2,#1e293b)",borderRadius:16,padding:"32px 40px",minWidth:320,maxWidth:400,textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",border:"1px solid var(--border,#334155)"}} onClick={e=>e.stopPropagation()}>
                <div style={{width:64,height:64,borderRadius:"50%",background:"linear-gradient(135deg,#22c55e,#16a34a)",margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>{calling?"\\u{1F4DE}":"\\u260E\\uFE0F"}</div>
                <div style={{fontSize:20,fontWeight:700,color:"#f8fafc",marginBottom:4}}>{callModal.name}</div>
                <div style={{fontSize:14,color:"var(--muted,#94a3b8)",marginBottom:20,fontFamily:"monospace"}}>{callModal.phone}</div>
                {calling && <div style={{marginBottom:16}}><div style={{width:40,height:40,border:"3px solid #22c55e",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto"}}></div></div>}
                <div style={{fontSize:15,color:callStatus.includes("Error")?"#ef4444":"#22c55e",marginBottom:20,minHeight:22}}>{callStatus}</div>
                <button onClick={()=>{setCallModal(null);setCallStatus("");}} style={{background:calling?"#ef4444":"var(--s3,#334155)",color:"#f8fafc",border:"none",borderRadius:12,padding:"12px 32px",fontSize:15,fontWeight:600,cursor:"pointer",transition:"background 0.2s"}}>{calling?"\\u{1F4F5} Cancelar":"Cerrar"}</button>
              </div>
            </div>}
            `;

// Add a spin keyframe animation if not already present
if (!content.includes('@keyframes spin')) {
  const styleIdx = content.indexOf('<style>');
  if (styleIdx !== -1) {
    const afterStyleTag = styleIdx + '<style>'.length;
    content = content.slice(0, afterStyleTag) + '\n@keyframes spin{to{transform:rotate(360deg)}}\n' + content.slice(afterStyleTag);
    console.log('[add-call-sms-ui] Added @keyframes spin');
  } else {
    console.warn('[add-call-sms-ui] WARNING: Could not find <style> tag for spin animation');
  }
}

// Insert the call modal before the pets tab marker (same approach as add-client-edit.mjs)
const petsMarker = 'ctab==="pets"';
const petsIdx = content.indexOf(petsMarker);
if (petsIdx !== -1) {
  let j = petsIdx - 1;
  while (j >= 0 && content[j] !== '{') j--;
  if (j >= 0) {
    content = content.slice(0, j) + callModalJSX + content.slice(j);
    console.log('[add-call-sms-ui] PATCH 3: Added call modal overlay JSX');
  }
} else {
  console.warn('[add-call-sms-ui] WARNING: Could not find pets tab marker for modal placement');
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// PATCH 4: Change Text button from native sms: to SMS tab
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// The Text button is multiline:
//   <button className="client-qa-btn" onClick={()=>selC.phone&&window.open("sms:" + (selC.phone))}>
//   ð¬ Text
//   </button>
// Strategy: find 'client-qa-btn' near "Text" and replace the onClick
let textBtnFixed = false;
let searchPos = 0;
while (!textBtnFixed) {
  const classIdx = content.indexOf('client-qa-btn', searchPos);
  if (classIdx === -1) break;
  const snippet = content.slice(classIdx, classIdx + 200);
  // Check if this button contains "Text" but NOT "Invoice", "Call", "Editar"
  if (snippet.indexOf('Text') !== -1 && snippet.indexOf('sms:') !== -1) {
    // Found the Text button with sms: protocol â replace its onClick
    const btnStart = content.lastIndexOf('<button', classIdx);
    if (btnStart !== -1) {
      // Find the closing </button> after this point
      const textPos = classIdx + snippet.indexOf('Text');
      const closeBtn = content.indexOf('</button>', textPos);
      if (closeBtn !== -1) {
        const fullBtn = content.slice(btnStart, closeBtn + '</button>'.length);
        const newTextBtn = '<button className="client-qa-btn" onClick={()=>setCtab("sms")}>\n\u{1F4AC} Text\n</button>';
        content = content.slice(0, btnStart) + newTextBtn + content.slice(btnStart + fullBtn.length);
        textBtnFixed = true;
        console.log('[add-call-sms-ui] PATCH 4: Changed Text button to open SMS tab');
      }
    }
  }
  searchPos = classIdx + 1;
}
if (!textBtnFixed) {
  console.warn('[add-call-sms-ui] WARNING: Could not find Text button with sms: protocol');
}

writeFileSync(file, content);
console.log('[add-call-sms-ui] All call/SMS UI patches applied successfully!');

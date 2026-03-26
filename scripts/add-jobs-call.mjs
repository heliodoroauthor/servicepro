import { readFileSync, writeFileSync } from 'fs';

// This script patches ServiceProApp.jsx to add Twilio click-to-call inside JobsPage.
// JobsPage is a separate function component from the main App, so it needs its own
// calling state, callClient function, and call modal overlay.
// Run AFTER add-call-sms-ui.mjs in the prebuild chain.

const file = 'src/ServiceProApp.jsx';
let content = readFileSync(file, 'utf8');

// ─── Helper: find a function body using brace-depth tracking ───
// Handles destructured parameters like function Foo({a,b,c}) { ... }
function findFunctionRange(src, funcName) {
  let marker = 'async function ' + funcName + '(';
  let start = src.indexOf(marker);
  if (start === -1) {
    marker = 'function ' + funcName + '(';
    start = src.indexOf(marker);
  }
  if (start === -1) return null;
  // First, skip past the parameter list by finding the matching ')' for '('
  let parenStart = src.indexOf('(', start);
  if (parenStart === -1) return null;
  let parenDepth = 1;
  let p = parenStart + 1;
  while (p < src.length && parenDepth > 0) {
    if (src[p] === '(') parenDepth++;
    else if (src[p] === ')') parenDepth--;
    p++;
  }
  // Now find the opening '{' of the function body (after the closing ')')
  let i = src.indexOf('{', p);
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

// ═══════════════════════════════════════════════════════════════
// PATCH 1: Add calling/callModal/callStatus states inside JobsPage
// ═══════════════════════════════════════════════════════════════
// Insert after the first useState inside JobsPage — find "function JobsPage" then
// find the first useState line after it.

const jobsPageRange = findFunctionRange(content, 'JobsPage');
if (!jobsPageRange) {
  console.error('[add-jobs-call] ERROR: Could not find JobsPage function!');
  process.exit(1);
}

// Find a good anchor: the "selJob" state line inside JobsPage
const selJobIdx = content.indexOf('const [selJob, setSelJob] = useState(', jobsPageRange.start);
if (selJobIdx === -1 || selJobIdx > jobsPageRange.end) {
  console.error('[add-jobs-call] ERROR: Could not find selJob state inside JobsPage!');
  process.exit(1);
}

const selJobEol = content.indexOf('\n', selJobIdx);
const jobsCallStates = `  const [jobCalling, setJobCalling] = useState(false);
  const [jobCallModal, setJobCallModal] = useState(null);
  const [jobCallStatus, setJobCallStatus] = useState("");\n`;

content = content.slice(0, selJobEol + 1) + jobsCallStates + content.slice(selJobEol + 1);
console.log('[add-jobs-call] PATCH 1: Injected jobCalling/jobCallModal/jobCallStatus states');

// ═══════════════════════════════════════════════════════════════
// PATCH 2: Add callClientFromJob function inside JobsPage
// ═══════════════════════════════════════════════════════════════
// Insert after the "cancelModal" function inside JobsPage (which is defined after openEdit)

const callClientFromJobFn = `  async function callClientFromJob(phone, clientName) {
    if(!phone || jobCalling) return;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    let p = phone.replace(/[^+\\d]/g,"");
    if(!p.startsWith("+")) p = p.length===10 ? "+1"+p : "+"+p;
    if(isMobile) {
      setJobCallModal({phone:p, name:clientName||"Cliente"});
      setJobCallStatus("Abriendo tel\\u00E9fono...");
      setTimeout(()=>{ window.location.href="tel:"+p; },400);
      setTimeout(()=>{ setJobCallModal(null); setJobCallStatus(""); },3000);
      return;
    }
    setJobCallModal({phone:p, name:clientName||"Cliente"});
    setJobCallStatus("Iniciando llamada...");
    setJobCalling(true);
    try {
      const res = await fetch("/api/make-call",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({to:phone})
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error||"Error al iniciar llamada");
      setJobCallStatus("\\u260E\\uFE0F Revisa tu tel\\u00E9fono para contestar");
      setTimeout(()=>{ setJobCallModal(null); setJobCallStatus(""); },15000);
    } catch(e) {
      setJobCallStatus("\\u274C Error: "+e.message);
      setTimeout(()=>{ setJobCallModal(null); setJobCallStatus(""); },5000);
    } finally {
      setJobCalling(false);
    }
  }`;

// Find cancelModal inside JobsPage
const cancelModalIdx = content.indexOf('function cancelModal()', jobsPageRange.start);
if (cancelModalIdx !== -1 && cancelModalIdx < jobsPageRange.end + 500) {
  // Find the end of cancelModal — it's a one-liner typically: function cancelModal() { ... }
  let braceStart = content.indexOf('{', cancelModalIdx);
  if (braceStart !== -1) {
    let depth = 1;
    let ci = braceStart + 1;
    while (ci < content.length && depth > 0) {
      if (content[ci] === '{') depth++;
      else if (content[ci] === '}') depth--;
      ci++;
    }
    content = content.slice(0, ci) + '\n' + callClientFromJobFn + '\n' + content.slice(ci);
    console.log('[add-jobs-call] PATCH 2: Injected callClientFromJob function after cancelModal');
  }
} else {
  console.error('[add-jobs-call] ERROR: Could not find cancelModal inside JobsPage!');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
// PATCH 3: Replace the Jobs phone button (tel:) with callClientFromJob
// ═══════════════════════════════════════════════════════════════
// The Jobs phone button pattern:
//   <button className="client-qa-btn" style={{background:"var(--s2)"}} onClick={()=>cl?.phone&&window.open("tel:" + (cl?.phone))}>
//   <span> </span>{cl?.phone}
//   </button>
// Strategy: Find 'window.open("tel:"' inside the JobsPage range, then replace that button.

// Re-calculate JobsPage range since we've inserted content
const jobsPageRange2 = findFunctionRange(content, 'JobsPage');

let jobPhoneFixed = false;
let searchPos = jobsPageRange2.start;
while (!jobPhoneFixed) {
  const telIdx = content.indexOf('window.open("tel:"', searchPos);
  if (telIdx === -1 || telIdx > jobsPageRange2.end) break;

  // This is within JobsPage — find the enclosing button
  const btnStart = content.lastIndexOf('<button', telIdx);
  if (btnStart === -1 || btnStart < jobsPageRange2.start) { searchPos = telIdx + 1; continue; }

  const btnCloseIdx = content.indexOf('</button>', telIdx);
  if (btnCloseIdx === -1) { searchPos = telIdx + 1; continue; }

  const fullBtn = content.slice(btnStart, btnCloseIdx + '</button>'.length);

  // Verify this button has cl?.phone (Jobs pattern) not selC?.phone (Clients pattern)
  if (fullBtn.includes('cl?.phone')) {
    const newPhoneBtn = '<button className="client-qa-btn" style={{background:"var(--s2)"}} onClick={()=>callClientFromJob(cl?.phone, cl?.name)} disabled={jobCalling}>\n{jobCalling?"\\u23F3 Llamando...":"\\u{1F4DE} "+(cl?.phone||"No phone")}\n</button>';
    content = content.slice(0, btnStart) + newPhoneBtn + content.slice(btnStart + fullBtn.length);
    jobPhoneFixed = true;
    console.log('[add-jobs-call] PATCH 3: Replaced Jobs phone button with callClientFromJob');
  }
  searchPos = telIdx + 1;
}
if (!jobPhoneFixed) {
  console.warn('[add-jobs-call] WARNING: Could not find Jobs phone button with tel: protocol');
}

// ═══════════════════════════════════════════════════════════════
// PATCH 4: Replace the Jobs message button (sms:) with Twilio SMS
// ═══════════════════════════════════════════════════════════════
// The Jobs message button pattern:
//   <button className="client-qa-btn" style={{background:"var(--s2)"}} onClick={()=>cl?.phone&&window.open("sms:" + (cl?.phone))}>
//   <span> </span>Message
//   </button>

const jobsPageRange3 = findFunctionRange(content, 'JobsPage');

let jobMsgFixed = false;
let msgSearchPos = jobsPageRange3.start;
while (!jobMsgFixed) {
  const smsIdx = content.indexOf('window.open("sms:"', msgSearchPos);
  if (smsIdx === -1 || smsIdx > jobsPageRange3.end) break;

  const btnStart = content.lastIndexOf('<button', smsIdx);
  if (btnStart === -1 || btnStart < jobsPageRange3.start) { msgSearchPos = smsIdx + 1; continue; }

  const btnCloseIdx = content.indexOf('</button>', smsIdx);
  if (btnCloseIdx === -1) { msgSearchPos = smsIdx + 1; continue; }

  const fullBtn = content.slice(btnStart, btnCloseIdx + '</button>'.length);

  if (fullBtn.includes('cl?.phone') && fullBtn.includes('Message')) {
    // Replace with a button that sends an SMS via Twilio (opens a prompt for the message)
    const newMsgBtn = '<button className="client-qa-btn" style={{background:"var(--s2)"}} onClick={()=>{if(!cl?.phone)return;const msg=prompt("Mensaje para "+cl.name+":");if(msg)fetch("/api/send-sms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:cl.phone,body:msg})}).then(r=>r.json()).then(d=>{if(d.error)alert("Error: "+d.error);else alert("SMS enviado \\u2705")}).catch(e=>alert("Error: "+e.message))}}>\n\\u{1F4AC} Message\n</button>';
    content = content.slice(0, btnStart) + newMsgBtn + content.slice(btnStart + fullBtn.length);
    jobMsgFixed = true;
    console.log('[add-jobs-call] PATCH 4: Replaced Jobs message button with Twilio SMS');
  }
  msgSearchPos = smsIdx + 1;
}
if (!jobMsgFixed) {
  console.warn('[add-jobs-call] WARNING: Could not find Jobs message button with sms: protocol');
}

// ═══════════════════════════════════════════════════════════════
// PATCH 5: Add call modal overlay JSX inside JobsPage
// ═══════════════════════════════════════════════════════════════
// Insert before {/* SCHEDULE */} comment inside JobsPage's job detail view
// which comes right after the client section

const jobCallModalJSX = `{jobCallModal && <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.7)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>{setJobCallModal(null);setJobCallStatus("");}}>
              <div style={{background:"var(--s2,#1e293b)",borderRadius:16,padding:"32px 40px",minWidth:320,maxWidth:400,textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.5)",border:"1px solid var(--border,#334155)"}} onClick={e=>e.stopPropagation()}>
                <div style={{width:64,height:64,borderRadius:"50%",background:"linear-gradient(135deg,#22c55e,#16a34a)",margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>{jobCalling?"\\u{1F4DE}":"\\u260E\\uFE0F"}</div>
                <div style={{fontSize:20,fontWeight:700,color:"#f8fafc",marginBottom:4}}>{jobCallModal.name}</div>
                <div style={{fontSize:14,color:"var(--muted,#94a3b8)",marginBottom:20,fontFamily:"monospace"}}>{jobCallModal.phone}</div>
                {jobCalling && <div style={{marginBottom:16}}><div style={{width:40,height:40,border:"3px solid #22c55e",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite",margin:"0 auto"}}></div></div>}
                <div style={{fontSize:15,color:jobCallStatus.includes("Error")?"#ef4444":"#22c55e",marginBottom:20,minHeight:22}}>{jobCallStatus}</div>
                <button onClick={()=>{setJobCallModal(null);setJobCallStatus("");}} style={{background:jobCalling?"#ef4444":"var(--s3,#334155)",color:"#f8fafc",border:"none",borderRadius:12,padding:"12px 32px",fontSize:15,fontWeight:600,cursor:"pointer",transition:"background 0.2s"}}>{jobCalling?"\\u{1F4F5} Cancelar":"Cerrar"}</button>
              </div>
            </div>}
`;

// Find the {/* SCHEDULE */} comment inside JobsPage
const jobsPageRange4 = findFunctionRange(content, 'JobsPage');
const scheduleComment = '{/* SCHEDULE */}';
const scheduleIdx = content.indexOf(scheduleComment, jobsPageRange4.start);
if (scheduleIdx !== -1 && scheduleIdx < jobsPageRange4.end) {
  content = content.slice(0, scheduleIdx) + jobCallModalJSX + content.slice(scheduleIdx);
  console.log('[add-jobs-call] PATCH 5: Added call modal overlay JSX before SCHEDULE section');
} else {
  console.warn('[add-jobs-call] WARNING: Could not find SCHEDULE comment for modal placement');
}

// ═══════════════════════════════════════════════════════════════
// PATCH 6: Also fix the "View client details" modal phone link
// ═══════════════════════════════════════════════════════════════
// The job-view-client modal has: <a href={"tel:" + (cl?.phone)} ...>
// Replace with a button that calls callClientFromJob

const jobsPageRange5 = findFunctionRange(content, 'JobsPage');
const viewClientModalMarker = 'modal==="job-view-client"';
const viewClientIdx = content.indexOf(viewClientModalMarker, jobsPageRange5.start);
if (viewClientIdx !== -1 && viewClientIdx < jobsPageRange5.end) {
  // Find the tel: link inside this modal
  const telLinkIdx = content.indexOf('href={"tel:"', viewClientIdx);
  if (telLinkIdx !== -1 && telLinkIdx < viewClientIdx + 600) {
    // Find the enclosing <a> tag
    const aStart = content.lastIndexOf('<a', telLinkIdx);
    const aEnd = content.indexOf('</a>', telLinkIdx);
    if (aStart !== -1 && aEnd !== -1) {
      const fullLink = content.slice(aStart, aEnd + '</a>'.length);
      const newPhoneLink = '<button onClick={()=>callClientFromJob(cl?.phone, cl?.name)} disabled={jobCalling} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"var(--s2)",border:"1px solid var(--border)",borderRadius:10,color:"var(--text)",fontWeight:600,fontSize:13,cursor:"pointer",width:"100%"}}>\n\\u{1F4DE} {cl?.phone}\n</button>';
      content = content.slice(0, aStart) + newPhoneLink + content.slice(aStart + fullLink.length);
      console.log('[add-jobs-call] PATCH 6: Replaced tel: link in job-view-client modal');
    }
  }
}

writeFileSync(file, content);
console.log('[add-jobs-call] All Jobs call patches applied successfully!');

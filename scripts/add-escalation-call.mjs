import { readFileSync, writeFileSync } from 'fs';

// This script patches ServiceProApp.jsx to add escalation support to both:
//   - callClient (Clients module) — inside the main App component
//   - callClientFromJob (Jobs module) — inside JobsPage component
//
// Escalation logic (client-side, Phase 1):
//   1. Reads escalation config from localStorage (sp_app_settings_v1 → escalation)
//   2. If enabled + module active + chain defined: loops through the chain
//   3. Calls /api/make-call with {to: clientPhone, escalation: true, target: chain[step].phone}
//   4. After timeoutSeconds + 5s buffer: assumes no answer, advances to step+1
//   5. Modal shows live progress: "Calling Rafael (1/3)..." → "No answer. Calling Tom (2/3)..."
//   6. When chain is exhausted: "No one in the escalation chain answered."
//
// When escalation is disabled, calls behave exactly as before (backward compatible).
//
// Run AFTER add-jobs-call.mjs in the prebuild chain.

const file = 'src/ServiceProApp.jsx';
let content = readFileSync(file, 'utf8');

// ─── Helper: find a function body using brace-depth tracking ───
function findFunctionRange(src, funcName) {
  let marker = 'async function ' + funcName + '(';
  let start = src.indexOf(marker);
  if (start === -1) {
    marker = 'function ' + funcName + '(';
    start = src.indexOf(marker);
  }
  if (start === -1) return null;
  let parenStart = src.indexOf('(', start);
  if (parenStart === -1) return null;
  let parenDepth = 1;
  let p = parenStart + 1;
  while (p < src.length && parenDepth > 0) {
    if (src[p] === '(') parenDepth++;
    else if (src[p] === ')') parenDepth--;
    p++;
  }
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
// PATCH 1: Add escalation state to the Clients module (main App)
// ═══════════════════════════════════════════════════════════════
// Insert after callStatus state: const [callStatus, setCallStatus] = useState("");
const callStatusMarker = 'const [callStatus, setCallStatus] = useState(';
const callStatusIdx = content.indexOf(callStatusMarker);
if (callStatusIdx !== -1) {
  const eol = content.indexOf('\n', callStatusIdx);
  const escStates = `  const [escStep, setEscStep] = useState(0);
  const [escTotal, setEscTotal] = useState(0);
  const [escTarget, setEscTarget] = useState("");\n`;
  content = content.slice(0, eol + 1) + escStates + content.slice(eol + 1);
  console.log('[add-escalation-call] PATCH 1: Added escalation states to Clients module');
} else {
  console.warn('[add-escalation-call] WARNING: Could not find callStatus state for Clients');
}

// ═══════════════════════════════════════════════════════════════
// PATCH 2: Replace callClient with escalation-aware version
// ═══════════════════════════════════════════════════════════════
const newCallClient = `  async function callClient(phone) {
    if(!phone || calling) return;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    let p = phone.replace(/[^+\\d]/g,"");
    if(!p.startsWith("+")) p = p.length===10 ? "+1"+p : "+"+p;
    if(isMobile) {
      setCallModal({phone:p, name:selC?.name||"Cliente"});
      setCallStatus("Abriendo tel\\u00E9fono...");
      setTimeout(()=>{ window.location.href="tel:"+p; },400);
      setTimeout(()=>{ setCallModal(null); setCallStatus(""); },3000);
      return;
    }
    // Read escalation config
    let esc;
    try { esc = JSON.parse(localStorage.getItem("sp_app_settings_v1")||"{}").escalation; } catch(e){}
    const useEsc = esc && esc.enabled && esc.modules?.clients !== false && esc.chain?.length > 0;
    if(useEsc) {
      // Escalation mode: loop through chain
      setCallModal({phone:p, name:selC?.name||"Cliente"});
      setCalling(true);
      const chain = esc.chain;
      const timeout = (esc.timeoutSeconds || 30);
      setEscTotal(chain.length);
      for(let step=0; step<chain.length; step++) {
        setEscStep(step);
        setEscTarget(chain[step].name);
        setCallStatus("\\u{1F4DE} Llamando a " + chain[step].name + " (" + (step+1) + "/" + chain.length + ")...");
        try {
          const res = await fetch("/api/make-call",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({to:phone, escalation:true, target:chain[step].phone, step:step, totalSteps:chain.length, timeoutSeconds:timeout})
          });
          const data = await res.json();
          if(!res.ok) throw new Error(data.error||"Error al iniciar llamada");
          // Wait for timeout + buffer to see if call was answered
          await new Promise(r=>setTimeout(r,(timeout+5)*1000));
          // If this is the last step, show exhaustion message
          if(step === chain.length - 1) {
            setCallStatus("\\u274C Nadie en la cadena contest\\u00F3.");
            setTimeout(()=>{ setCallModal(null); setCallStatus(""); setEscStep(0); setEscTotal(0); setEscTarget(""); },6000);
          } else {
            setCallStatus("Sin respuesta. Escalando...");
            await new Promise(r=>setTimeout(r,1500));
          }
        } catch(e) {
          setCallStatus("\\u274C Error: "+e.message);
          setTimeout(()=>{ setCallModal(null); setCallStatus(""); setEscStep(0); setEscTotal(0); setEscTarget(""); },5000);
          break;
        }
      }
      setCalling(false);
    } else {
      // Non-escalation: original behavior
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
        setTimeout(()=>{ setCallModal(null); setCallStatus(""); },15000);
      } catch(e) {
        setCallStatus("\\u274C Error: "+e.message);
        setTimeout(()=>{ setCallModal(null); setCallStatus(""); },5000);
      } finally {
        setCalling(false);
      }
    }
  }`;

const callClientRange = findFunctionRange(content, 'callClient');
if (callClientRange) {
  content = content.slice(0, callClientRange.start) + newCallClient + '\n' + content.slice(callClientRange.end);
  console.log('[add-escalation-call] PATCH 2: Replaced callClient with escalation version');
} else {
  console.error('[add-escalation-call] ERROR: Could not find callClient function!');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
// PATCH 3: Add escalation states inside JobsPage
// ═══════════════════════════════════════════════════════════════
// Find jobCallStatus state, add escalation states after it
const jobCallStatusMarker = 'const [jobCallStatus, setJobCallStatus] = useState(';
const jobCallStatusIdx = content.indexOf(jobCallStatusMarker);
if (jobCallStatusIdx !== -1) {
  const eol = content.indexOf('\n', jobCallStatusIdx);
  const jobEscStates = `  const [jobEscStep, setJobEscStep] = useState(0);
  const [jobEscTotal, setJobEscTotal] = useState(0);
  const [jobEscTarget, setJobEscTarget] = useState("");\n`;
  content = content.slice(0, eol + 1) + jobEscStates + content.slice(eol + 1);
  console.log('[add-escalation-call] PATCH 3: Added escalation states to JobsPage');
} else {
  console.warn('[add-escalation-call] WARNING: Could not find jobCallStatus state');
}

// ═══════════════════════════════════════════════════════════════
// PATCH 4: Replace callClientFromJob with escalation-aware version
// ═══════════════════════════════════════════════════════════════
const newCallClientFromJob = `  async function callClientFromJob(phone, clientName) {
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
    // Read escalation config
    let esc;
    try { esc = JSON.parse(localStorage.getItem("sp_app_settings_v1")||"{}").escalation; } catch(e){}
    const useEsc = esc && esc.enabled && esc.modules?.jobs !== false && esc.chain?.length > 0;
    if(useEsc) {
      setJobCallModal({phone:p, name:clientName||"Cliente"});
      setJobCalling(true);
      const chain = esc.chain;
      const timeout = (esc.timeoutSeconds || 30);
      setJobEscTotal(chain.length);
      for(let step=0; step<chain.length; step++) {
        setJobEscStep(step);
        setJobEscTarget(chain[step].name);
        setJobCallStatus("\\u{1F4DE} Llamando a " + chain[step].name + " (" + (step+1) + "/" + chain.length + ")...");
        try {
          const res = await fetch("/api/make-call",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({to:phone, escalation:true, target:chain[step].phone, step:step, totalSteps:chain.length, timeoutSeconds:timeout})
          });
          const data = await res.json();
          if(!res.ok) throw new Error(data.error||"Error al iniciar llamada");
          await new Promise(r=>setTimeout(r,(timeout+5)*1000));
          if(step === chain.length - 1) {
            setJobCallStatus("\\u274C Nadie en la cadena contest\\u00F3.");
            setTimeout(()=>{ setJobCallModal(null); setJobCallStatus(""); setJobEscStep(0); setJobEscTotal(0); setJobEscTarget(""); },6000);
          } else {
            setJobCallStatus("Sin respuesta. Escalando...");
            await new Promise(r=>setTimeout(r,1500));
          }
        } catch(e) {
          setJobCallStatus("\\u274C Error: "+e.message);
          setTimeout(()=>{ setJobCallModal(null); setJobCallStatus(""); setJobEscStep(0); setJobEscTotal(0); setJobEscTarget(""); },5000);
          break;
        }
      }
      setJobCalling(false);
    } else {
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
    }
  }`;

const callFromJobRange = findFunctionRange(content, 'callClientFromJob');
if (callFromJobRange) {
  content = content.slice(0, callFromJobRange.start) + newCallClientFromJob + '\n' + content.slice(callFromJobRange.end);
  console.log('[add-escalation-call] PATCH 4: Replaced callClientFromJob with escalation version');
} else {
  console.error('[add-escalation-call] ERROR: Could not find callClientFromJob function!');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
// PATCH 5: Update the Clients call modal to show escalation progress
// ═══════════════════════════════════════════════════════════════
// Find the Clients call modal and add an escalation progress bar below the status text
// Look for the callModal overlay div and enhance it
const clientsModalMarker = '{callModal && <div style={{position:"fixed"';
const clientsModalIdx = content.indexOf(clientsModalMarker);
if (clientsModalIdx !== -1) {
  // Find the closing of this modal overlay (the matching </div>} pattern)
  let depth = 0;
  let mi = clientsModalIdx;
  let foundStart = false;
  // Find the end of the entire callModal conditional: }
  // Strategy: find the pattern "Cancelar":"Cerrar"}</button> then find the closing </div></div>}
  const cancelCerrarClients = content.indexOf('Cancelar":"Cerrar"}', clientsModalIdx);
  if (cancelCerrarClients !== -1) {
    const closeBtnEnd = content.indexOf('</button>', cancelCerrarClients);
    if (closeBtnEnd !== -1) {
      // Insert escalation progress before the close button
      const escProgressClients = `
                {escTotal > 0 && <div style={{marginBottom:16}}>
                  <div style={{fontSize:12,color:"var(--muted,#94a3b8)",marginBottom:6}}>Escalation: {escStep+1} of {escTotal}</div>
                  <div style={{height:4,borderRadius:2,background:"var(--border,#334155)",overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:2,background:"var(--orange,#f97316)",transition:"width .5s",width:((escStep+1)/escTotal*100)+"%"}}></div>
                  </div>
                  {escTarget && <div style={{fontSize:11,color:"var(--muted,#94a3b8)",marginTop:4}}>Target: {escTarget}</div>}
                </div>}
`;
      // Insert before the close button
      const closeBtnStart = content.lastIndexOf('<button', closeBtnEnd);
      if (closeBtnStart !== -1 && closeBtnStart > clientsModalIdx) {
        content = content.slice(0, closeBtnStart) + escProgressClients + '                ' + content.slice(closeBtnStart);
        console.log('[add-escalation-call] PATCH 5: Added escalation progress to Clients modal');
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// PATCH 6: Update the Jobs call modal to show escalation progress
// ═══════════════════════════════════════════════════════════════
const jobsModalMarker = '{jobCallModal && <div style={{position:"fixed"';
const jobsModalIdx = content.indexOf(jobsModalMarker);
if (jobsModalIdx !== -1) {
  const cancelCerrarJobs = content.indexOf('Cancelar":"Cerrar"}', jobsModalIdx);
  if (cancelCerrarJobs !== -1) {
    const closeBtnEnd = content.indexOf('</button>', cancelCerrarJobs);
    if (closeBtnEnd !== -1) {
      const escProgressJobs = `
                {jobEscTotal > 0 && <div style={{marginBottom:16}}>
                  <div style={{fontSize:12,color:"var(--muted,#94a3b8)",marginBottom:6}}>Escalation: {jobEscStep+1} of {jobEscTotal}</div>
                  <div style={{height:4,borderRadius:2,background:"var(--border,#334155)",overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:2,background:"var(--orange,#f97316)",transition:"width .5s",width:((jobEscStep+1)/jobEscTotal*100)+"%"}}></div>
                  </div>
                  {jobEscTarget && <div style={{fontSize:11,color:"var(--muted,#94a3b8)",marginTop:4}}>Target: {jobEscTarget}</div>}
                </div>}
`;
      const closeBtnStart = content.lastIndexOf('<button', closeBtnEnd);
      if (closeBtnStart !== -1 && closeBtnStart > jobsModalIdx) {
        content = content.slice(0, closeBtnStart) + escProgressJobs + '                ' + content.slice(closeBtnStart);
        console.log('[add-escalation-call] PATCH 6: Added escalation progress to Jobs modal');
      }
    }
  }
}

writeFileSync(file, content);
console.log('[add-escalation-call] All escalation call patches applied successfully!');

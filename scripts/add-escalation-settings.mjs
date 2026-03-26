import { readFileSync, writeFileSync } from 'fs';

// Patches SettingsPage in src/ServiceProApp.jsx to add an "Escalation" tab.
// Adds escalation chain config with drag-to-reorder, module toggles, timeout settings.
// Run AFTER all other patches that touch ServiceProApp.jsx.

const file = 'src/ServiceProApp.jsx';
let content = readFileSync(file, 'utf8');

// ═══════════════════════════════════════════════════════════════
// PATCH 1: Add "Escalation" tab to STABS array
// ═══════════════════════════════════════════════════════════════
const syncTabEntry = '{id:"sync", label:"Sync", icon:"\uD83D\uDD04"}';
const syncTabIdx = content.indexOf(syncTabEntry);
if (syncTabIdx === -1) {
  const altSync = 'id:"sync"';
  const altIdx = content.indexOf(altSync);
  if (altIdx === -1) {
    console.error('[add-escalation-settings] ERROR: Could not find Sync tab in STABS array');
    process.exit(1);
  }
  let bi = content.indexOf('}', altIdx);
  if (bi !== -1) {
    const afterSync = bi + 1;
    const commaAndNewTab = ',\n{id:"escalation", label:"Escalation", icon:"\uD83D\uDCDE"}';
    content = content.slice(0, afterSync) + commaAndNewTab + content.slice(afterSync);
    console.log('[add-escalation-settings] PATCH 1: Added Escalation tab (alt method)');
  }
} else {
  const afterSync = syncTabIdx + syncTabEntry.length;
  const newTab = ',\n{id:"escalation", label:"Escalation", icon:"\uD83D\uDCDE"}';
  content = content.slice(0, afterSync) + newTab + content.slice(afterSync);
  console.log('[add-escalation-settings] PATCH 1: Added Escalation tab to STABS');
}

// ═══════════════════════════════════════════════════════════════
// PATCH 2: Add escalation states + helper functions after saved state
// ═══════════════════════════════════════════════════════════════
const savedStateMarker = 'var [saved, setSaved] = React.useState(false);';
let savedIdx = content.indexOf(savedStateMarker);
if (savedIdx === -1) {
  // Try const style
  const altMarker = 'const [saved, setSaved] = useState(false);';
  savedIdx = content.indexOf(altMarker);
}
if (savedIdx === -1) {
  console.error('[add-escalation-settings] ERROR: Could not find saved state');
  process.exit(1);
}
const savedEol = content.indexOf('\n', savedIdx);

const escalationCode = `
var escConfig = settings.escalation || {enabled:false, modules:{clients:true,jobs:true}, chain:[], timeoutSeconds:30, clientTimeoutMs:35000};
var [escChain, setEscChain] = React.useState(escConfig.chain || []);
var [escDragIdx, setEscDragIdx] = React.useState(null);
var [escNewName, setEscNewName] = React.useState("");
var [escNewPhone, setEscNewPhone] = React.useState("");
function saveEscalation(patch) {
  var curr = settings.escalation || {enabled:false, modules:{clients:true,jobs:true}, chain:[], timeoutSeconds:30, clientTimeoutMs:35000};
  var next = Object.assign({}, curr, patch);
  save({escalation: next});
}
function addEscPerson() {
  if (!escNewName.trim() || !escNewPhone.trim()) return;
  var newChain = escChain.concat([{id: Date.now().toString(), name: escNewName.trim(), phone: escNewPhone.trim()}]);
  setEscChain(newChain);
  saveEscalation({chain: newChain});
  setEscNewName("");
  setEscNewPhone("");
}
function removeEscPerson(idx) {
  var newChain = escChain.filter(function(_,i){ return i !== idx; });
  setEscChain(newChain);
  saveEscalation({chain: newChain});
}
function escDragStart(idx) { setEscDragIdx(idx); }
function escDragOver(e, idx) {
  e.preventDefault();
  if (escDragIdx === null || escDragIdx === idx) return;
  var arr = escChain.slice();
  var item = arr.splice(escDragIdx, 1)[0];
  arr.splice(idx, 0, item);
  setEscChain(arr);
  setEscDragIdx(idx);
}
function escDragEnd() {
  setEscDragIdx(null);
  saveEscalation({chain: escChain});
}`;

content = content.slice(0, savedEol + 1) + escalationCode + '\n' + content.slice(savedEol + 1);
console.log('[add-escalation-settings] PATCH 2: Added escalation states + helpers');

// ═══════════════════════════════════════════════════════════════
// PATCH 3: Add the escalation tab panel JSX
// ═══════════════════════════════════════════════════════════════
const syncCommentMarker = '{/* -- SYNC & OFFLINE -- */}';
const syncCommentIdx = content.indexOf(syncCommentMarker);
if (syncCommentIdx === -1) {
  console.error('[add-escalation-settings] ERROR: Could not find SYNC comment');
  process.exit(1);
}

const escalationPanel = `{/* -- ESCALATION -- */}
{stab === "escalation" && (
<div style={{paddingTop:8}}>
{/* Master toggle */}
<Row label="Enable Call Escalation" sub="Automatically route unanswered calls to the next person">
<Toggle value={escConfig.enabled} patch={{escalation: Object.assign({}, escConfig, {enabled: !escConfig.enabled})}}/>
</Row>

{escConfig.enabled && (<div>
{/* Module toggles */}
<div style={{padding:"14px 0",borderBottom:"1px solid var(--border)"}}>
<div style={{fontWeight:800,fontSize:11,color:"var(--muted)",letterSpacing:.5,marginBottom:10}}>ACTIVE MODULES</div>
<div style={{display:"flex",gap:12}}>
<label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13}}>
<input type="checkbox" checked={escConfig.modules?.clients !== false} onChange={function(){
  var mods = Object.assign({}, escConfig.modules || {});
  mods.clients = !mods.clients;
  saveEscalation({modules: mods});
}} style={{accentColor:"var(--orange)"}}/>
<span>Clients</span>
</label>
<label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13}}>
<input type="checkbox" checked={escConfig.modules?.jobs !== false} onChange={function(){
  var mods = Object.assign({}, escConfig.modules || {});
  mods.jobs = !mods.jobs;
  saveEscalation({modules: mods});
}} style={{accentColor:"var(--orange)"}}/>
<span>Jobs</span>
</label>
</div>
</div>

{/* Timeout setting */}
<div style={{padding:"14px 0",borderBottom:"1px solid var(--border)"}}>
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
<div>
<div style={{fontWeight:600,fontSize:13}}>Ring Timeout</div>
<div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>Seconds to wait before trying next person</div>
</div>
<div style={{display:"flex",alignItems:"center",gap:6}}>
<input type="number" className="inp" min="10" max="120" value={escConfig.timeoutSeconds || 30} onChange={function(e){
  var v = parseInt(e.target.value) || 30;
  saveEscalation({timeoutSeconds: v, clientTimeoutMs: (v + 5) * 1000});
}} style={{width:60,fontSize:13,padding:"6px 8px",textAlign:"center"}}/>
<span style={{fontSize:12,color:"var(--muted)"}}>sec</span>
</div>
</div>
</div>

{/* Escalation Chain */}
<div style={{padding:"14px 0"}}>
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
<div style={{fontWeight:800,fontSize:11,color:"var(--muted)",letterSpacing:.5}}>ESCALATION CHAIN</div>
<div style={{fontSize:11,color:"var(--muted)"}}>{escChain.length} {escChain.length===1?"person":"people"}</div>
</div>

{escChain.length === 0 && (
<div style={{padding:"20px",textAlign:"center",color:"var(--muted)",fontSize:12,border:"1px dashed var(--border)",borderRadius:10,marginBottom:12}}>
No escalation chain configured. Add people below.
</div>
)}
{escChain.map(function(person, idx){
return (
<div key={person.id} draggable onDragStart={function(){escDragStart(idx);}} onDragOver={function(e){escDragOver(e,idx);}} onDragEnd={escDragEnd}
  style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",marginBottom:4,
  borderRadius:10,border:"1px solid",cursor:"grab",transition:"all .15s",
  borderColor:escDragIdx===idx?"var(--orange)":"var(--border)",
  background:escDragIdx===idx?"rgba(249,115,22,.08)":"var(--s2)"}}>
<div style={{fontSize:16,cursor:"grab",color:"var(--muted)",flexShrink:0}}>{"\u2261"}</div>
<div style={{width:24,height:24,borderRadius:12,background:"var(--orange)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{idx+1}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{person.name}</div>
<div style={{fontSize:11,color:"var(--muted)",fontFamily:"var(--font-mono)"}}>{person.phone}</div>
</div>
<button onClick={function(){removeEscPerson(idx);}} style={{width:28,height:28,borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"#ef4444",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}} title="Remove">{"\u2715"}</button>
</div>
);
})}

{/* Add person form */}
<div style={{marginTop:12,padding:"12px",borderRadius:10,border:"1px solid var(--border)",background:"var(--s2)"}}>
<div style={{fontSize:11,fontWeight:700,color:"var(--muted)",marginBottom:8}}>ADD PERSON</div>
<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
<input className="inp" placeholder="Name (e.g. Rafael)" value={escNewName} onChange={function(e){setEscNewName(e.target.value);}} style={{flex:1,minWidth:120,fontSize:12,padding:"8px 10px"}}/>
<input className="inp" placeholder="Phone (+1...)" value={escNewPhone} onChange={function(e){setEscNewPhone(e.target.value);}} style={{flex:1,minWidth:120,fontSize:12,padding:"8px 10px"}}/>
<button onClick={addEscPerson} disabled={!escNewName.trim()||!escNewPhone.trim()} style={{padding:"8px 16px",borderRadius:8,border:"none",background:(!escNewName.trim()||!escNewPhone.trim())?"var(--border)":"var(--orange)",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>+ Add</button>
</div>
</div>

{escChain.length > 1 && (
<div style={{fontSize:11,color:"var(--muted)",marginTop:8,textAlign:"center"}}>
Drag the {"\u2261"} handle to reorder. Calls go from #1 down.
</div>
)}
</div>
</div>)}
</div>
)}
`;

content = content.slice(0, syncCommentIdx) + escalationPanel + content.slice(syncCommentIdx);
console.log('[add-escalation-settings] PATCH 3: Added escalation tab panel JSX');

writeFileSync(file, content);
console.log('[add-escalation-settings] All escalation settings patches applied successfully!');

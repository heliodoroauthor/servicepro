import { readFileSync, writeFileSync } from 'fs';

// This script patches ServiceProApp.jsx to add an Equipment Location Log
// module on both Client profile and Job detail views.
// Equipment items (controller, valve, backflow, etc.) are stored per-client
// in localStorage, with photo uploads via Cloudinary.

const file = 'src/ServiceProApp.jsx';
let content = readFileSync(file, 'utf8');

// ─── Helper: brace-depth tracking ───
function findBlockEnd(src, startIdx) {
  let i = src.indexOf('{', startIdx);
  if (i === -1) return -1;
  let depth = 1;
  i++;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') depth--;
    i++;
  }
  return i;
}

function findConditionalBlockEnd(src, marker) {
  const idx = src.indexOf(marker);
  if (idx === -1) return -1;
  // The marker ends with '(' — track from that paren directly
  const parenStart = idx + marker.length - 1;
  if (src[parenStart] !== '(') return -1;
  let depth = 1;
  let i = parenStart + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')') depth--;
    i++;
  }
  // Now we're at the closing ), skip the }
  while (i < src.length && src[i] !== '}') i++;
  if (src[i] === '}') i++;
  return i;
}

// ════════════════════════════════════════════
// PATCH 1: Add "Equipment" tab to Client tabs
// ════════════════════════════════════════════
const clientTabMarker = '["subscription","🔄 Plans"]]';
if (content.includes(clientTabMarker)) {
  content = content.replace(
    clientTabMarker,
    '["subscription","🔄 Plans"],["equipment","🔧 Equipment"]]'
  );
  console.log('[add-equipment] PATCH 1: Added Equipment tab to Client tabs');
} else {
  console.error('[add-equipment] ERROR: Could not find Client tab array marker');
  process.exit(1);
}

// ════════════════════════════════════════════
// PATCH 2: Add equipment state + helpers in ClientsPage
// ════════════════════════════════════════════
const ctabMarker = 'const [ctab, setCtab] = useState("profile");';
const ctabIdx = content.indexOf(ctabMarker);
if (ctabIdx === -1) {
  console.error('[add-equipment] ERROR: Could not find ctab state marker');
  process.exit(1);
}
const ctabEol = content.indexOf('\n', ctabIdx);

const equipmentState = `
  // ── Equipment Location Log state ──
  var EQ_PRESETS = [
    {id:"controller",name:"Controller",icon:"🎛"},{id:"backflow",name:"Backflow Preventer",icon:"🔄"},
    {id:"valve",name:"Valve",icon:"🔧"},{id:"timer",name:"Timer",icon:"⏱"},
    {id:"pump",name:"Pump",icon:"⛽"},{id:"filter",name:"Filter",icon:"🧹"},
    {id:"meter",name:"Meter",icon:"📊"},{id:"sprinkler",name:"Sprinkler Head",icon:"💧"},
    {id:"drain",name:"Drain",icon:"🕳"},{id:"pipe",name:"Pipe / Fitting",icon:"🔩"},
    {id:"sensor",name:"Sensor",icon:"📡"},{id:"custom",name:"Custom",icon:"✏️"}
  ];
  var EQ_STORAGE_KEY = "sp_client_equipment_v1";
  function loadAllEquip() { try { return JSON.parse(localStorage.getItem(EQ_STORAGE_KEY)||"{}"); } catch(e){ return {}; } }
  function saveAllEquip(d) { try { localStorage.setItem(EQ_STORAGE_KEY, JSON.stringify(d)); } catch(e){} }
  var [allEquip, setAllEquip] = React.useState(loadAllEquip);
  var [eqForm, setEqForm] = React.useState({name:"",category:"",description:"",location:""});
  var [eqPhotos, setEqPhotos] = React.useState([]);
  var [eqUploading, setEqUploading] = React.useState(false);
  var [eqEditId, setEqEditId] = React.useState(null);
  var [eqExpanded, setEqExpanded] = React.useState(null);
  var eqFileRef = React.useRef();

  function getClientEquip(clientId) { return (allEquip[clientId] || []); }

  function saveEquipItem(clientId) {
    if (!eqForm.name.trim()) return;
    var items = getClientEquip(clientId).slice();
    if (eqEditId) {
      items = items.map(function(it){ return it.id === eqEditId ? Object.assign({}, it, eqForm, {photos: eqPhotos}) : it; });
    } else {
      items.push({id:"eq_"+Date.now(), name:eqForm.name, category:eqForm.category, description:eqForm.description, location:eqForm.location, photos:eqPhotos, addedDate:new Date().toISOString().slice(0,10)});
    }
    var next = Object.assign({}, allEquip, {[clientId]: items});
    setAllEquip(next);
    saveAllEquip(next);
    setEqForm({name:"",category:"",description:"",location:""});
    setEqPhotos([]);
    setEqEditId(null);
  }

  function deleteEquipItem(clientId, itemId) {
    var items = getClientEquip(clientId).filter(function(it){ return it.id !== itemId; });
    var next = Object.assign({}, allEquip, {[clientId]: items});
    setAllEquip(next);
    saveAllEquip(next);
    if (eqEditId === itemId) { setEqEditId(null); setEqForm({name:"",category:"",description:"",location:""}); setEqPhotos([]); }
  }

  function startEditEquip(item) {
    setEqEditId(item.id);
    setEqForm({name:item.name, category:item.category||"", description:item.description||"", location:item.location||""});
    setEqPhotos(item.photos||[]);
  }

  function cancelEditEquip() {
    setEqEditId(null);
    setEqForm({name:"",category:"",description:"",location:""});
    setEqPhotos([]);
  }

  async function uploadEqPhoto(e) {
    var f = e.target.files[0];
    if (!f) return;
    e.target.value = "";
    setEqUploading(true);
    try {
      var reader = new FileReader();
      var dataUrl = await new Promise(function(resolve, reject) {
        reader.onload = function(){ resolve(reader.result); };
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
      var res = await fetch("/api/upload-photo", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({image: dataUrl})
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setEqPhotos(function(p){ return p.concat([data.url]); });
    } catch(err) {
      alert("Photo upload error: " + err.message);
    } finally {
      setEqUploading(false);
    }
  }

  function removeEqPhoto(idx) {
    setEqPhotos(function(p){ return p.filter(function(_,i){ return i !== idx; }); });
  }

  function selectPreset(preset) {
    setEqForm(function(p){ return Object.assign({}, p, {name: preset.name, category: preset.id}); });
  }
`;

content = content.slice(0, ctabEol + 1) + equipmentState + content.slice(ctabEol + 1);
console.log('[add-equipment] PATCH 2: Injected equipment state + helpers after ctab');

// ════════════════════════════════════════════
// PATCH 3: Add Equipment tab content in Client detail
// ════════════════════════════════════════════
// Find the end of the subscription tab conditional block
const subMarker = '{ctab==="subscription" && (';
const subBlockEnd = findConditionalBlockEnd(content, subMarker);
if (subBlockEnd === -1) {
  console.error('[add-equipment] ERROR: Could not find subscription tab block end');
  process.exit(1);
}

const clientEquipContent = `
{ctab==="equipment" && (
<div>
<div style={{fontSize:9,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Equipment Location Log</div>
<div style={{fontSize:12,color:"var(--muted)",marginBottom:14}}>Document installed equipment, components, and their locations at this property.</div>

{/* PRESET QUICK-ADD */}
<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
{EQ_PRESETS.map(function(pr){return(
<button key={pr.id} onClick={function(){selectPreset(pr);}} style={{background:eqForm.category===pr.id?"var(--orange)":"var(--s2)",color:eqForm.category===pr.id?"#fff":"var(--muted)",border:"1px solid "+(eqForm.category===pr.id?"var(--orange)":"var(--border)"),borderRadius:20,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
<span>{pr.icon}</span>{pr.name}
</button>
);})}
</div>

{/* ADD / EDIT FORM */}
<div style={{background:"var(--s2)",border:"1px solid var(--border)",borderRadius:10,padding:14,marginBottom:16}}>
<div style={{fontSize:11,fontWeight:700,color:"var(--text)",marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>{eqEditId ? "Edit Item" : "Add Equipment"}</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
<input className="inp" value={eqForm.name} onChange={function(e){setEqForm(function(p){return Object.assign({},p,{name:e.target.value});});}} placeholder="Name (e.g. Controller)" style={{fontSize:12}}/>
<input className="inp" value={eqForm.location} onChange={function(e){setEqForm(function(p){return Object.assign({},p,{location:e.target.value});});}} placeholder="Location (e.g. North wall)" style={{fontSize:12}}/>
</div>
<textarea className="inp" value={eqForm.description} onChange={function(e){setEqForm(function(p){return Object.assign({},p,{description:e.target.value});});}} placeholder="Description, model, brand, serial number..." rows={2} style={{fontSize:12,marginBottom:8,width:"100%",boxSizing:"border-box"}}/>

{/* PHOTO UPLOAD */}
<div style={{marginBottom:8}}>
<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
<input ref={eqFileRef} type="file" accept="image/*" style={{display:"none"}} onChange={uploadEqPhoto}/>
<button onClick={function(){eqFileRef.current.click();}} disabled={eqUploading} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,padding:"6px 14px",fontSize:11,fontWeight:700,cursor:"pointer",color:"var(--text)",opacity:eqUploading?.5:1}}>
{eqUploading ? "Uploading..." : "📷 Add Photo"}
</button>
<span style={{fontSize:10,color:"var(--muted)"}}>{eqPhotos.length} photo{eqPhotos.length!==1?"s":""}</span>
</div>
{eqPhotos.length > 0 && (
<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
{eqPhotos.map(function(url,i){return(
<div key={i} style={{position:"relative",width:60,height:60,borderRadius:8,overflow:"hidden",border:"1px solid var(--border)"}}>
<img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
<button onClick={function(){removeEqPhoto(i);}} style={{position:"absolute",top:2,right:2,background:"rgba(0,0,0,.7)",color:"#fff",border:"none",borderRadius:"50%",width:18,height:18,fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
</div>
);})}
</div>
)}
</div>

<div style={{display:"flex",gap:8}}>
<button onClick={function(){saveEquipItem(sel);}} disabled={!eqForm.name.trim()} style={{background:"var(--orange)",color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",fontSize:12,fontWeight:700,cursor:"pointer",opacity:eqForm.name.trim()?1:.5}}>
{eqEditId ? "💾 Update" : "＋ Add to List"}
</button>
{eqEditId && <button onClick={cancelEditEquip} style={{background:"var(--surface)",color:"var(--muted)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Cancel</button>}
</div>
</div>

{/* EQUIPMENT LIST */}
{getClientEquip(sel).length === 0 ? (
<div style={{textAlign:"center",padding:"30px 0",color:"var(--muted)",fontSize:12}}>No equipment logged yet. Use the form above or tap a preset to get started.</div>
) : (
<div>
{getClientEquip(sel).map(function(item, idx){
var preset = EQ_PRESETS.find(function(p){return p.id===item.category;});
var isExpanded = eqExpanded === item.id;
return(
<div key={item.id} style={{background:"var(--s2)",border:"1px solid var(--border)",borderRadius:10,marginBottom:8,overflow:"hidden"}}>
<div onClick={function(){setEqExpanded(isExpanded?null:item.id);}} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer"}}>
<div style={{background:"var(--orange)",color:"#fff",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,flexShrink:0}}>{idx+1}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontWeight:700,fontSize:13,color:"var(--text)"}}>{preset?preset.icon+" ":""}{item.name}</div>
{item.location && <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>📍 {item.location}</div>}
</div>
{item.photos && item.photos.length > 0 && <span style={{fontSize:10,color:"var(--muted)",flexShrink:0}}>📷 {item.photos.length}</span>}
<span style={{fontSize:16,color:"var(--muted)",transform:isExpanded?"rotate(180deg)":"rotate(0)",transition:"transform .2s"}}>▾</span>
</div>

{isExpanded && (
<div style={{padding:"0 14px 14px",borderTop:"1px solid var(--border)"}}>
{item.description && <div style={{fontSize:12,color:"var(--muted)",marginTop:10,lineHeight:1.5}}>{item.description}</div>}
{item.addedDate && <div style={{fontSize:10,color:"var(--muted2)",marginTop:6}}>Added: {item.addedDate}</div>}

{item.photos && item.photos.length > 0 && (
<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
{item.photos.map(function(url,pi){return(
<div key={pi} style={{width:80,height:80,borderRadius:8,overflow:"hidden",border:"1px solid var(--border)",cursor:"pointer"}} onClick={function(e){e.stopPropagation();window.open(url,"_blank");}}>
<img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
</div>
);})}
</div>
)}

<div style={{display:"flex",gap:8,marginTop:10}}>
<button onClick={function(e){e.stopPropagation();startEditEquip(item);}} style={{background:"var(--surface)",color:"var(--blue)",border:"1px solid var(--border)",borderRadius:6,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer"}}>✏️ Edit</button>
<button onClick={function(e){e.stopPropagation();if(confirm("Remove "+item.name+"?"))deleteEquipItem(sel,item.id);}} style={{background:"var(--surface)",color:"var(--red)",border:"1px solid var(--border)",borderRadius:6,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer"}}>🗑 Remove</button>
</div>
</div>
)}
</div>
);})}
<div style={{fontSize:10,color:"var(--muted2)",textAlign:"center",marginTop:8}}>{getClientEquip(sel).length} item{getClientEquip(sel).length!==1?"s":""} logged</div>
</div>
)}
</div>
)}
`;

content = content.slice(0, subBlockEnd) + '\n' + clientEquipContent + content.slice(subBlockEnd);
console.log('[add-equipment] PATCH 3: Injected Equipment tab content for Clients');

// ════════════════════════════════════════════
// PATCH 4: Add "Equipment" tab to Job tabs
// ════════════════════════════════════════════
const jobTabMarker = '["timeline","Timeline"]]';
if (content.includes(jobTabMarker)) {
  content = content.replace(
    jobTabMarker,
    '["timeline","Timeline"],["equipment","🔧 Equipment"]]'
  );
  console.log('[add-equipment] PATCH 4: Added Equipment tab to Job tabs');
} else {
  console.error('[add-equipment] ERROR: Could not find Job tab array marker');
  process.exit(1);
}

// ════════════════════════════════════════════
// PATCH 5: Add Equipment tab content in Job detail
// ════════════════════════════════════════════
// Find the timeline tab block end and inject after it
const timelineMarker = '{jobTab==="timeline" && (';
// If there's no explicit timeline marker (it might use a different pattern), try alternatives
let jobEquipInsertIdx = -1;

const timelineIdx = content.indexOf(timelineMarker);
if (timelineIdx !== -1) {
  jobEquipInsertIdx = findConditionalBlockEnd(content, timelineMarker);
} else {
  // Fallback: look for the timeline block with function syntax
  const altMarker = 'jobTab==="timeline"';
  const altIdx = content.indexOf(altMarker);
  if (altIdx !== -1) {
    jobEquipInsertIdx = findConditionalBlockEnd(content, altMarker + ' && (');
    if (jobEquipInsertIdx === -1) {
      // Try to find the closing of the detail-body div
      const detailBodyMarker = '{/* BODY */}';
      const bodyIdx = content.indexOf(detailBodyMarker);
      if (bodyIdx !== -1) {
        // Find the closing </div> of the detail-body
        const closingDiv = content.indexOf('</div>', content.lastIndexOf('}', content.indexOf('/* ===', bodyIdx + 500)));
        if (closingDiv !== -1) jobEquipInsertIdx = closingDiv;
      }
    }
  }
}

// If we still couldn't find the injection point for jobs, we'll inject before the closing of the detail-body div
// by searching for a pattern that appears after all job tab contents
if (jobEquipInsertIdx === -1) {
  // Look for the end of the last job tab content before the jobs page closing
  // Find the comment block that marks the end of job tabs
  const jobsEndComment = '/* ==========================================';
  const jobsPageStart = content.indexOf('function JobsPage(');
  if (jobsPageStart !== -1) {
    const nextSection = content.indexOf(jobsEndComment, jobsPageStart + 5000);
    // Inject before the last few closing divs before the next section
    if (nextSection !== -1) {
      // Go back to find the function's return closing
      jobEquipInsertIdx = nextSection - 20; // approximate
    }
  }
}

const jobEquipContent = `
{jobTab==="equipment" && (
<div style={{padding:16}}>
<div style={{fontSize:18,fontWeight:800,color:"var(--text)",marginBottom:4}}>Equipment at Site</div>
<div style={{fontSize:12,color:"var(--muted)",marginBottom:14}}>Equipment logged for this client. Add items from the Client profile Equipment tab.</div>

{(function(){
var clientId = sel ? (typeof sel === "object" ? sel.clientId || sel.client : sel) : null;
if (!clientId && cl) clientId = cl.id;
var cEquip = [];
try { var raw = JSON.parse(localStorage.getItem("sp_client_equipment_v1")||"{}"); cEquip = raw[clientId] || []; } catch(e){}

if (cEquip.length === 0) return (
<div style={{textAlign:"center",padding:"40px 0",color:"var(--muted)"}}>
<div style={{fontSize:28,marginBottom:8}}>🔧</div>
<div style={{fontSize:13}}>No equipment logged for this client yet.</div>
<div style={{fontSize:11,marginTop:4}}>Go to the Client profile → Equipment tab to add items.</div>
</div>
);

return (
<div>
{cEquip.map(function(item, idx){
var preset = [{id:"controller",icon:"🎛"},{id:"backflow",icon:"🔄"},{id:"valve",icon:"🔧"},{id:"timer",icon:"⏱"},{id:"pump",icon:"⛽"},{id:"filter",icon:"🧹"},{id:"meter",icon:"📊"},{id:"sprinkler",icon:"💧"},{id:"drain",icon:"🕳"},{id:"pipe",icon:"🔩"},{id:"sensor",icon:"📡"},{id:"custom",icon:"✏️"}].find(function(p){return p.id===item.category;});
return(
<div key={item.id} style={{background:"var(--s2)",border:"1px solid var(--border)",borderRadius:10,padding:14,marginBottom:8}}>
<div style={{display:"flex",alignItems:"flex-start",gap:10}}>
<div style={{background:"var(--orange)",color:"#fff",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,flexShrink:0}}>{idx+1}</div>
<div style={{flex:1}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>{preset?preset.icon+" ":""}{item.name}</div>
{item.location && <div style={{fontSize:11,color:"var(--blue)",marginTop:3}}>📍 {item.location}</div>}
{item.description && <div style={{fontSize:12,color:"var(--muted)",marginTop:4,lineHeight:1.5}}>{item.description}</div>}
{item.photos && item.photos.length > 0 && (
<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
{item.photos.map(function(url,pi){return(
<div key={pi} style={{width:64,height:64,borderRadius:6,overflow:"hidden",border:"1px solid var(--border)",cursor:"pointer"}} onClick={function(){window.open(url,"_blank");}}>
<img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
</div>
);})}
</div>
)}
</div>
</div>
</div>
);
})}
<div style={{fontSize:10,color:"var(--muted2)",textAlign:"center",marginTop:8}}>{cEquip.length} item{cEquip.length!==1?"s":""} at this site</div>
</div>
);
})()}
</div>
)}
`;

if (jobEquipInsertIdx !== -1) {
  content = content.slice(0, jobEquipInsertIdx) + '\n' + jobEquipContent + content.slice(jobEquipInsertIdx);
  console.log('[add-equipment] PATCH 5: Injected Equipment tab content for Jobs at index ' + jobEquipInsertIdx);
} else {
  console.warn('[add-equipment] WARNING: Could not inject Job equipment tab content — Job tab added but content missing');
}

// ════════════════════════════════════════════
// Write output
// ════════════════════════════════════════════
writeFileSync(file, content);
console.log('[add-equipment] All equipment patches applied successfully!');

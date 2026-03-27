import { readFileSync, writeFileSync } from 'fs';

// This script patches ServiceProApp.jsx to add an Equipment Location Log
// module on both Client profile and Job detail views.
// Optimized for field technicians: checklist workflow, brand/model fields,
// mobile-first vertical layout, photo uploads via Cloudinary.

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
  const parenStart = idx + marker.length - 1;
  if (src[parenStart] !== '(') return -1;
  let depth = 1;
  let i = parenStart + 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')') depth--;
    i++;
  }
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
  // ── Equipment Checklist state ──
  var EQ_PRESETS = [
    {id:"controller",name:"Controller",icon:"🎛",hint:"Irrigation controller / timer box"},
    {id:"backflow",name:"Backflow Preventer",icon:"🔄",hint:"RPZ, PVB, or double-check valve"},
    {id:"valve",name:"Valve",icon:"🔧",hint:"Zone valve, master valve, shut-off"},
    {id:"rain_sensor",name:"Rain Sensor",icon:"🌧",hint:"Rain or soil-moisture sensor"},
    {id:"timer",name:"Timer",icon:"⏱",hint:"Standalone timer or smart timer"},
    {id:"pump",name:"Pump",icon:"⛽",hint:"Booster pump, well pump"},
    {id:"filter",name:"Filter",icon:"🧹",hint:"Inline filter, Y-strainer, disc filter"},
    {id:"meter",name:"Meter",icon:"📊",hint:"Water meter, flow sensor"},
    {id:"sprinkler",name:"Sprinkler Head",icon:"💧",hint:"Pop-up, rotor, drip emitter"},
    {id:"drain",name:"Drain",icon:"🕳",hint:"French drain, catch basin, channel"},
    {id:"pipe",name:"Pipe / Fitting",icon:"🔩",hint:"Main line, lateral, coupling"},
    {id:"sensor",name:"Sensor",icon:"📡",hint:"Flow sensor, pressure sensor"},
    {id:"custom",name:"Custom",icon:"✏️",hint:"Other equipment not listed"}
  ];
  var EQ_STORAGE_KEY = "sp_client_equipment_v1";
  function loadAllEquip() { try { return JSON.parse(localStorage.getItem(EQ_STORAGE_KEY)||"{}"); } catch(e){ return {}; } }
  function saveAllEquip(d) { try { localStorage.setItem(EQ_STORAGE_KEY, JSON.stringify(d)); } catch(e){} }
  var [allEquip, setAllEquip] = React.useState(loadAllEquip);
  var [eqForm, setEqForm] = React.useState({name:"",category:"",description:"",location:"",brand:"",model:""});
  var [eqPhotos, setEqPhotos] = React.useState([]);
  var [eqUploading, setEqUploading] = React.useState(false);
  var [eqEditId, setEqEditId] = React.useState(null);
  var [eqExpanded, setEqExpanded] = React.useState(null);
  var [eqMode, setEqMode] = React.useState("checklist");
  var eqFileRef = React.useRef();

  function getClientEquip(clientId) { return (allEquip[clientId] || []); }

  function saveEquipItem(clientId) {
    if (!eqForm.name.trim()) return;
    var items = getClientEquip(clientId).slice();
    if (eqEditId) {
      items = items.map(function(it){ return it.id === eqEditId ? Object.assign({}, it, eqForm, {photos: eqPhotos}) : it; });
    } else {
      items.push({id:"eq_"+Date.now(), name:eqForm.name, category:eqForm.category, description:eqForm.description, location:eqForm.location, brand:eqForm.brand, model:eqForm.model, photos:eqPhotos, addedDate:new Date().toISOString().slice(0,10), status:"documented"});
    }
    var next = Object.assign({}, allEquip, {[clientId]: items});
    setAllEquip(next);
    saveAllEquip(next);
    setEqForm({name:"",category:"",description:"",location:"",brand:"",model:""});
    setEqPhotos([]);
    setEqEditId(null);
  }

  function deleteEquipItem(clientId, itemId) {
    var items = getClientEquip(clientId).filter(function(it){ return it.id !== itemId; });
    var next = Object.assign({}, allEquip, {[clientId]: items});
    setAllEquip(next);
    saveAllEquip(next);
    if (eqEditId === itemId) { setEqEditId(null); setEqForm({name:"",category:"",description:"",location:"",brand:"",model:""}); setEqPhotos([]); }
  }

  function startEditEquip(item) {
    setEqEditId(item.id);
    setEqMode("form");
    setEqForm({name:item.name, category:item.category||"", description:item.description||"", location:item.location||"", brand:item.brand||"", model:item.model||""});
    setEqPhotos(item.photos||[]);
  }

  function cancelEditEquip() {
    setEqEditId(null);
    setEqForm({name:"",category:"",description:"",location:"",brand:"",model:""});
    setEqPhotos([]);
    setEqMode("checklist");
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
    setEqMode("form");
  }
`;

content = content.slice(0, ctabEol + 1) + equipmentState + content.slice(ctabEol + 1);
console.log('[add-equipment] PATCH 2: Injected equipment state + helpers after ctab');

// ════════════════════════════════════════════
// PATCH 2b: Add equipment state + helpers in JobsPage
// ════════════════════════════════════════════
const jobTabStateMarker = 'const [jobTab, setJobTab] = useState("details");';
const jobTabStateIdx = content.indexOf(jobTabStateMarker);
if (jobTabStateIdx === -1) {
  console.error('[add-equipment] ERROR: Could not find jobTab state marker for Patch 2b');
  process.exit(1);
}
const jobTabStateEol = content.indexOf('\n', jobTabStateIdx);

content = content.slice(0, jobTabStateEol + 1) + equipmentState + content.slice(jobTabStateEol + 1);
console.log('[add-equipment] PATCH 2b: Injected equipment state + helpers in JobsPage');

// ════════════════════════════════════════════
// PATCH 3: Add Equipment tab content in Client detail
// ════════════════════════════════════════════
const subMarker = '{ctab==="subscription" && (';
const subBlockEnd = findConditionalBlockEnd(content, subMarker);
if (subBlockEnd === -1) {
  console.error('[add-equipment] ERROR: Could not find subscription tab block end');
  process.exit(1);
}

const clientEquipContent = `
{ctab==="equipment" && (
<div style={{maxWidth:540,margin:"0 auto"}}>

{/* HEADER */}
<div style={{textAlign:"center",padding:"8px 0 12px"}}>
<div style={{fontSize:22,marginBottom:2}}>🔧</div>
<div style={{fontSize:11,fontWeight:800,color:"var(--text)",textTransform:"uppercase",letterSpacing:1.5}}>Equipment Checklist</div>
<div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>Tap a category to document each piece of equipment at this property.</div>
</div>

{/* MODE TOGGLE */}
<div style={{display:"flex",gap:0,marginBottom:14,borderRadius:10,overflow:"hidden",border:"1px solid var(--border)"}}>
<button onClick={function(){setEqMode("checklist");cancelEditEquip();}} style={{flex:1,padding:"10px 0",fontSize:12,fontWeight:700,cursor:"pointer",border:"none",background:eqMode==="checklist"?"var(--orange)":"var(--s2)",color:eqMode==="checklist"?"#fff":"var(--muted)"}}>📋 Checklist</button>
<button onClick={function(){setEqMode("form");}} style={{flex:1,padding:"10px 0",fontSize:12,fontWeight:700,cursor:"pointer",border:"none",background:eqMode==="form"?"var(--orange)":"var(--s2)",color:eqMode==="form"?"#fff":"var(--muted)"}}>＋ Add Item</button>
<button onClick={function(){setEqMode("list");}} style={{flex:1,padding:"10px 0",fontSize:12,fontWeight:700,cursor:"pointer",border:"none",background:eqMode==="list"?"var(--orange)":"var(--s2)",color:eqMode==="list"?"#fff":"var(--muted)"}}>📄 Log ({getClientEquip(sel).length})</button>
</div>

{/* ── CHECKLIST MODE ── */}
{eqMode==="checklist" && (
<div>
<div style={{fontSize:10,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:1,marginBottom:8,fontWeight:700}}>Tap to document each item</div>
{EQ_PRESETS.map(function(pr){
var logged = getClientEquip(sel).filter(function(it){return it.category===pr.id;});
var hasItem = logged.length > 0;
return(
<div key={pr.id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",marginBottom:6,background:hasItem?"rgba(255,140,0,.08)":"var(--s2)",border:"1px solid "+(hasItem?"var(--orange)":"var(--border)"),borderRadius:12,cursor:"pointer"}} onClick={function(){if(!hasItem){selectPreset(pr);}else{setEqMode("list");setEqExpanded(logged[0].id);}}}>
<div style={{fontSize:24,width:36,textAlign:"center",flexShrink:0}}>{pr.icon}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>{pr.name}</div>
<div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{pr.hint}</div>
{hasItem && <div style={{fontSize:10,color:"var(--orange)",fontWeight:700,marginTop:3}}>✓ {logged.length} documented</div>}
</div>
<div style={{flexShrink:0}}>
{hasItem ? (
<div style={{background:"var(--orange)",color:"#fff",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800}}>✓</div>
) : (
<div style={{background:"var(--surface)",border:"2px dashed var(--border)",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"var(--muted)"}}>+</div>
)}
</div>
</div>
);})}

{/* PROGRESS BAR */}
{(function(){
var total = EQ_PRESETS.length;
var done = EQ_PRESETS.filter(function(pr){return getClientEquip(sel).some(function(it){return it.category===pr.id;});}).length;
var pct = total>0?Math.round((done/total)*100):0;
return(
<div style={{marginTop:14,padding:"12px 16px",background:"var(--s2)",border:"1px solid var(--border)",borderRadius:12}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
<span style={{fontSize:11,fontWeight:700,color:"var(--text)"}}>Site Survey Progress</span>
<span style={{fontSize:12,fontWeight:800,color:pct===100?"var(--green)":"var(--orange)"}}>{pct}%</span>
</div>
<div style={{height:8,background:"var(--surface)",borderRadius:4,overflow:"hidden"}}>
<div style={{height:"100%",width:pct+"%",background:pct===100?"var(--green)":"var(--orange)",borderRadius:4,transition:"width .3s"}}></div>
</div>
<div style={{fontSize:10,color:"var(--muted)",marginTop:4}}>{done} of {total} categories documented · {getClientEquip(sel).length} total items</div>
</div>
);
})()}
</div>
)}

{/* ── FORM MODE ── */}
{eqMode==="form" && (
<div>
{/* CATEGORY SELECTOR (scrollable chips) */}
<div style={{fontSize:10,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:1,marginBottom:6,fontWeight:700}}>{eqEditId ? "Editing Item" : "Select Category"}</div>
<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
{EQ_PRESETS.map(function(pr){return(
<button key={pr.id} onClick={function(){selectPreset(pr);}} style={{background:eqForm.category===pr.id?"var(--orange)":"var(--s2)",color:eqForm.category===pr.id?"#fff":"var(--muted)",border:"1px solid "+(eqForm.category===pr.id?"var(--orange)":"var(--border)"),borderRadius:20,padding:"8px 14px",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
<span>{pr.icon}</span>{pr.name}
</button>
);})}
</div>

{/* FORM FIELDS — mobile vertical stack */}
<div style={{background:"var(--s2)",border:"1px solid var(--border)",borderRadius:12,padding:16,marginBottom:14}}>
<div style={{display:"flex",flexDirection:"column",gap:10}}>
<div>
<div style={{fontSize:10,fontWeight:700,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Equipment Name *</div>
<input className="inp" value={eqForm.name} onChange={function(e){setEqForm(function(p){return Object.assign({},p,{name:e.target.value});});}} placeholder="e.g. Hunter Pro-C Controller" style={{fontSize:14,padding:"12px 14px",width:"100%",boxSizing:"border-box"}}/>
</div>

<div>
<div style={{fontSize:10,fontWeight:700,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Exact Location</div>
<input className="inp" value={eqForm.location} onChange={function(e){setEqForm(function(p){return Object.assign({},p,{location:e.target.value});});}} placeholder="e.g. Garage north wall, left side" style={{fontSize:14,padding:"12px 14px",width:"100%",boxSizing:"border-box"}}/>
</div>

<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
<div>
<div style={{fontSize:10,fontWeight:700,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Brand</div>
<input className="inp" value={eqForm.brand} onChange={function(e){setEqForm(function(p){return Object.assign({},p,{brand:e.target.value});});}} placeholder="e.g. Hunter" style={{fontSize:13,padding:"10px 12px",width:"100%",boxSizing:"border-box"}}/>
</div>
<div>
<div style={{fontSize:10,fontWeight:700,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Model</div>
<input className="inp" value={eqForm.model} onChange={function(e){setEqForm(function(p){return Object.assign({},p,{model:e.target.value});});}} placeholder="e.g. Pro-C" style={{fontSize:13,padding:"10px 12px",width:"100%",boxSizing:"border-box"}}/>
</div>
</div>

<div>
<div style={{fontSize:10,fontWeight:700,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Notes / Description</div>
<textarea className="inp" value={eqForm.description} onChange={function(e){setEqForm(function(p){return Object.assign({},p,{description:e.target.value});});}} placeholder="Serial number, condition, zones, notes..." rows={3} style={{fontSize:13,padding:"10px 12px",width:"100%",boxSizing:"border-box"}}/>
</div>
</div>
</div>

{/* PHOTO UPLOAD — large mobile-friendly button */}
<div style={{marginBottom:14}}>
<input ref={eqFileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={uploadEqPhoto}/>
<button onClick={function(){eqFileRef.current.click();}} disabled={eqUploading} style={{width:"100%",padding:"14px",background:"var(--surface)",border:"2px dashed var(--border)",borderRadius:12,fontSize:14,fontWeight:700,cursor:"pointer",color:"var(--text)",opacity:eqUploading?.5:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
{eqUploading ? "⏳ Uploading..." : "📸 Take Photo or Upload"}
</button>
{eqPhotos.length > 0 && (
<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
{eqPhotos.map(function(url,i){return(
<div key={i} style={{position:"relative",width:72,height:72,borderRadius:10,overflow:"hidden",border:"2px solid var(--border)"}}>
<img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
<button onClick={function(){removeEqPhoto(i);}} style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,.75)",color:"#fff",border:"none",borderRadius:"50%",width:22,height:22,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
</div>
);})}
<div style={{fontSize:10,color:"var(--muted)",alignSelf:"center"}}>{eqPhotos.length} photo{eqPhotos.length!==1?"s":""}</div>
</div>
)}
</div>

{/* ACTION BUTTONS — full width for mobile */}
<button onClick={function(){saveEquipItem(sel);}} disabled={!eqForm.name.trim()} style={{width:"100%",padding:"14px",background:"var(--orange)",color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:800,cursor:"pointer",opacity:eqForm.name.trim()?1:.4,marginBottom:8}}>
{eqEditId ? "💾 Update Equipment" : "✓ Save to Checklist"}
</button>
{eqEditId && <button onClick={cancelEditEquip} style={{width:"100%",padding:"12px",background:"var(--surface)",color:"var(--muted)",border:"1px solid var(--border)",borderRadius:12,fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>}
{!eqEditId && <button onClick={function(){setEqMode("checklist");setEqForm({name:"",category:"",description:"",location:"",brand:"",model:""});setEqPhotos([]);}} style={{width:"100%",padding:"12px",background:"transparent",color:"var(--muted)",border:"none",fontSize:12,cursor:"pointer"}}>← Back to Checklist</button>}
</div>
)}

{/* ── LIST MODE ── */}
{eqMode==="list" && (
<div>
{getClientEquip(sel).length === 0 ? (
<div style={{textAlign:"center",padding:"40px 0",color:"var(--muted)"}}>
<div style={{fontSize:28,marginBottom:8}}>📋</div>
<div style={{fontSize:13}}>No equipment logged yet.</div>
<div style={{fontSize:11,marginTop:4,color:"var(--muted2)"}}>Switch to Checklist mode to start documenting.</div>
</div>
) : (
<div>
{getClientEquip(sel).map(function(item, idx){
var preset = EQ_PRESETS.find(function(p){return p.id===item.category;});
var isExpanded = eqExpanded === item.id;
return(
<div key={item.id} style={{background:"var(--s2)",border:"1px solid var(--border)",borderRadius:12,marginBottom:8,overflow:"hidden"}}>
<div onClick={function(){setEqExpanded(isExpanded?null:item.id);}} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer"}}>
<div style={{background:"var(--orange)",color:"#fff",borderRadius:"50%",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,flexShrink:0}}>{idx+1}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>{preset?preset.icon+" ":""}{item.name}</div>
{item.location && <div style={{fontSize:12,color:"var(--blue)",marginTop:2}}>📍 {item.location}</div>}
{(item.brand||item.model) && <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{[item.brand,item.model].filter(Boolean).join(" · ")}</div>}
</div>
{item.photos && item.photos.length > 0 && <span style={{fontSize:11,color:"var(--muted)",flexShrink:0,background:"var(--surface)",padding:"3px 8px",borderRadius:10}}>📷 {item.photos.length}</span>}
<span style={{fontSize:18,color:"var(--muted)",transform:isExpanded?"rotate(180deg)":"rotate(0)",transition:"transform .2s",flexShrink:0}}>▾</span>
</div>

{isExpanded && (
<div style={{padding:"0 16px 16px",borderTop:"1px solid var(--border)"}}>
{item.description && <div style={{fontSize:13,color:"var(--muted)",marginTop:12,lineHeight:1.6}}>{item.description}</div>}
{(item.brand||item.model) && <div style={{fontSize:11,color:"var(--muted2)",marginTop:6}}>🏷 {[item.brand,item.model].filter(Boolean).join(" — ")}</div>}
{item.addedDate && <div style={{fontSize:10,color:"var(--muted2)",marginTop:4}}>Added: {item.addedDate}</div>}

{item.photos && item.photos.length > 0 && (
<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
{item.photos.map(function(url,pi){return(
<div key={pi} style={{width:80,height:80,borderRadius:10,overflow:"hidden",border:"1px solid var(--border)",cursor:"pointer"}} onClick={function(e){e.stopPropagation();window.open(url,"_blank");}}>
<img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
</div>
);})}
</div>
)}

<div style={{display:"flex",gap:8,marginTop:12}}>
<button onClick={function(e){e.stopPropagation();startEditEquip(item);}} style={{flex:1,padding:"10px",background:"var(--surface)",color:"var(--blue)",border:"1px solid var(--border)",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"center"}}>✏️ Edit</button>
<button onClick={function(e){e.stopPropagation();if(confirm("Remove "+item.name+"?"))deleteEquipItem(sel,item.id);}} style={{flex:1,padding:"10px",background:"var(--surface)",color:"var(--red)",border:"1px solid var(--border)",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"center"}}>🗑 Remove</button>
</div>
</div>
)}
</div>
);})}
<div style={{fontSize:10,color:"var(--muted2)",textAlign:"center",marginTop:8,padding:"8px 0"}}>{getClientEquip(sel).length} item{getClientEquip(sel).length!==1?"s":""} logged at this property</div>
</div>
)}
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
const timelineMarker = '{jobTab==="timeline" && (';
let jobEquipInsertIdx = -1;

const timelineIdx = content.indexOf(timelineMarker);
if (timelineIdx !== -1) {
  jobEquipInsertIdx = findConditionalBlockEnd(content, timelineMarker);
} else {
  const altMarker = 'jobTab==="timeline"';
  const altIdx = content.indexOf(altMarker);
  if (altIdx !== -1) {
    jobEquipInsertIdx = findConditionalBlockEnd(content, altMarker + ' && (');
    if (jobEquipInsertIdx === -1) {
      const detailBodyMarker = '{/* BODY */}';
      const bodyIdx = content.indexOf(detailBodyMarker);
      if (bodyIdx !== -1) {
        const closingDiv = content.indexOf('</div>', content.lastIndexOf('}', content.indexOf('/* ===', bodyIdx + 500)));
        if (closingDiv !== -1) jobEquipInsertIdx = closingDiv;
      }
    }
  }
}

if (jobEquipInsertIdx === -1) {
  const jobsEndComment = '/* ==========================================';
  const jobsPageStart = content.indexOf('function JobsPage(');
  if (jobsPageStart !== -1) {
    const nextSection = content.indexOf(jobsEndComment, jobsPageStart + 5000);
    if (nextSection !== -1) {
      jobEquipInsertIdx = nextSection - 20;
    }
  }
}

const jobEquipContent = `
{jobTab==="equipment" && (function(){
var eqCid = sel ? sel.clientId : null;
if (!eqCid) return (<div style={{textAlign:"center",padding:"40px 0",color:"var(--muted)"}}><div style={{fontSize:28,marginBottom:8}}>🔧</div><div style={{fontSize:13}}>No client linked to this job.</div></div>);
return (
<div style={{maxWidth:540,margin:"0 auto"}}>

{/* HEADER */}
<div style={{textAlign:"center",padding:"8px 0 12px"}}>
<div style={{fontSize:22,marginBottom:2}}>🔧</div>
<div style={{fontSize:11,fontWeight:800,color:"var(--text)",textTransform:"uppercase",letterSpacing:1.5}}>Equipment Checklist</div>
<div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>Tap a category to document each piece of equipment at this property.</div>
</div>

{/* MODE TOGGLE */}
<div style={{display:"flex",gap:0,marginBottom:14,borderRadius:10,overflow:"hidden",border:"1px solid var(--border)"}}>
<button onClick={function(){setEqMode("checklist");cancelEditEquip();}} style={{flex:1,padding:"10px 0",fontSize:12,fontWeight:700,cursor:"pointer",border:"none",background:eqMode==="checklist"?"var(--orange)":"var(--s2)",color:eqMode==="checklist"?"#fff":"var(--muted)"}}>📋 Checklist</button>
<button onClick={function(){setEqMode("form");}} style={{flex:1,padding:"10px 0",fontSize:12,fontWeight:700,cursor:"pointer",border:"none",background:eqMode==="form"?"var(--orange)":"var(--s2)",color:eqMode==="form"?"#fff":"var(--muted)"}}>＋ Add Item</button>
<button onClick={function(){setEqMode("list");}} style={{flex:1,padding:"10px 0",fontSize:12,fontWeight:700,cursor:"pointer",border:"none",background:eqMode==="list"?"var(--orange)":"var(--s2)",color:eqMode==="list"?"#fff":"var(--muted)"}}>📄 Log ({getClientEquip(eqCid).length})</button>
</div>

{/* ── CHECKLIST MODE ── */}
{eqMode==="checklist" && (
<div>
<div style={{fontSize:10,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:1,marginBottom:8,fontWeight:700}}>Tap to document each item</div>
{EQ_PRESETS.map(function(pr){
var logged = getClientEquip(eqCid).filter(function(it){return it.category===pr.id;});
var hasItem = logged.length > 0;
return(
<div key={pr.id} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",marginBottom:6,background:hasItem?"rgba(255,140,0,.08)":"var(--s2)",border:"1px solid "+(hasItem?"var(--orange)":"var(--border)"),borderRadius:12,cursor:"pointer"}} onClick={function(){if(!hasItem){selectPreset(pr);}else{setEqMode("list");setEqExpanded(logged[0].id);}}}>
<div style={{fontSize:24,width:36,textAlign:"center",flexShrink:0}}>{pr.icon}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>{pr.name}</div>
<div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{pr.hint}</div>
{hasItem && <div style={{fontSize:10,color:"var(--orange)",fontWeight:700,marginTop:3}}>✓ {logged.length} documented</div>}
</div>
<div style={{flexShrink:0}}>
{hasItem ? (
<div style={{background:"var(--orange)",color:"#fff",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800}}>✓</div>
) : (
<div style={{background:"var(--surface)",border:"2px dashed var(--border)",borderRadius:"50%",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"var(--muted)"}}>+</div>
)}
</div>
</div>
);})}

{/* PROGRESS BAR */}
{(function(){
var total = EQ_PRESETS.length;
var done = EQ_PRESETS.filter(function(pr){return getClientEquip(eqCid).some(function(it){return it.category===pr.id;});}).length;
var pct = total>0?Math.round((done/total)*100):0;
return(
<div style={{marginTop:14,padding:"12px 16px",background:"var(--s2)",border:"1px solid var(--border)",borderRadius:12}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
<span style={{fontSize:11,fontWeight:700,color:"var(--text)"}}>Site Survey Progress</span>
<span style={{fontSize:12,fontWeight:800,color:pct===100?"var(--green)":"var(--orange)"}}>{pct}%</span>
</div>
<div style={{height:8,background:"var(--surface)",borderRadius:4,overflow:"hidden"}}>
<div style={{height:"100%",width:pct+"%",background:pct===100?"var(--green)":"var(--orange)",borderRadius:4,transition:"width .3s"}}></div>
</div>
<div style={{fontSize:10,color:"var(--muted)",marginTop:4}}>{done} of {total} categories documented · {getClientEquip(eqCid).length} total items</div>
</div>
);
})()}
</div>
)}

{/* ── FORM MODE ── */}
{eqMode==="form" && (
<div>
{/* CATEGORY SELECTOR */}
<div style={{fontSize:10,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:1,marginBottom:6,fontWeight:700}}>{eqEditId ? "Editing Item" : "Select Category"}</div>
<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
{EQ_PRESETS.map(function(pr){return(
<button key={pr.id} onClick={function(){selectPreset(pr);}} style={{background:eqForm.category===pr.id?"var(--orange)":"var(--s2)",color:eqForm.category===pr.id?"#fff":"var(--muted)",border:"1px solid "+(eqForm.category===pr.id?"var(--orange)":"var(--border)"),borderRadius:20,padding:"8px 14px",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
<span>{pr.icon}</span>{pr.name}
</button>
);})}
</div>

{/* FORM FIELDS */}
<div style={{background:"var(--s2)",border:"1px solid var(--border)",borderRadius:12,padding:16,marginBottom:14}}>
<div style={{display:"flex",flexDirection:"column",gap:10}}>
<div>
<div style={{fontSize:10,fontWeight:700,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Equipment Name *</div>
<input className="inp" value={eqForm.name} onChange={function(e){setEqForm(function(p){return Object.assign({},p,{name:e.target.value});});}} placeholder="e.g. Hunter Pro-C Controller" style={{fontSize:14,padding:"12px 14px",width:"100%",boxSizing:"border-box"}}/>
</div>

<div>
<div style={{fontSize:10,fontWeight:700,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Exact Location</div>
<input className="inp" value={eqForm.location} onChange={function(e){setEqForm(function(p){return Object.assign({},p,{location:e.target.value});});}} placeholder="e.g. Garage north wall, left side" style={{fontSize:14,padding:"12px 14px",width:"100%",boxSizing:"border-box"}}/>
</div>

<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
<div>
<div style={{fontSize:10,fontWeight:700,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Brand</div>
<input className="inp" value={eqForm.brand} onChange={function(e){setEqForm(function(p){return Object.assign({},p,{brand:e.target.value});});}} placeholder="e.g. Hunter" style={{fontSize:13,padding:"10px 12px",width:"100%",boxSizing:"border-box"}}/>
</div>
<div>
<div style={{fontSize:10,fontWeight:700,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Model</div>
<input className="inp" value={eqForm.model} onChange={function(e){setEqForm(function(p){return Object.assign({},p,{model:e.target.value});});}} placeholder="e.g. Pro-C" style={{fontSize:13,padding:"10px 12px",width:"100%",boxSizing:"border-box"}}/>
</div>
</div>

<div>
<div style={{fontSize:10,fontWeight:700,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}}>Notes / Description</div>
<textarea className="inp" value={eqForm.description} onChange={function(e){setEqForm(function(p){return Object.assign({},p,{description:e.target.value});});}} placeholder="Serial number, condition, zones, notes..." rows={3} style={{fontSize:13,padding:"10px 12px",width:"100%",boxSizing:"border-box"}}/>
</div>
</div>
</div>

{/* PHOTO UPLOAD */}
<div style={{marginBottom:14}}>
<input ref={eqFileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={uploadEqPhoto}/>
<button onClick={function(){eqFileRef.current.click();}} disabled={eqUploading} style={{width:"100%",padding:"14px",background:"var(--surface)",border:"2px dashed var(--border)",borderRadius:12,fontSize:14,fontWeight:700,cursor:"pointer",color:"var(--text)",opacity:eqUploading?.5:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
{eqUploading ? "⏳ Uploading..." : "📸 Take Photo or Upload"}
</button>
{eqPhotos.length > 0 && (
<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
{eqPhotos.map(function(url,i){return(
<div key={i} style={{position:"relative",width:72,height:72,borderRadius:10,overflow:"hidden",border:"2px solid var(--border)"}}>
<img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
<button onClick={function(){removeEqPhoto(i);}} style={{position:"absolute",top:4,right:4,background:"rgba(0,0,0,.75)",color:"#fff",border:"none",borderRadius:"50%",width:22,height:22,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
</div>
);})}
<div style={{fontSize:10,color:"var(--muted)",alignSelf:"center"}}>{eqPhotos.length} photo{eqPhotos.length!==1?"s":""}</div>
</div>
)}
</div>

{/* ACTION BUTTONS */}
<button onClick={function(){saveEquipItem(eqCid);}} disabled={!eqForm.name.trim()} style={{width:"100%",padding:"14px",background:"var(--orange)",color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:800,cursor:"pointer",opacity:eqForm.name.trim()?1:.4,marginBottom:8}}>
{eqEditId ? "💾 Update Equipment" : "✓ Save to Checklist"}
</button>
{eqEditId && <button onClick={cancelEditEquip} style={{width:"100%",padding:"12px",background:"var(--surface)",color:"var(--muted)",border:"1px solid var(--border)",borderRadius:12,fontSize:13,fontWeight:600,cursor:"pointer"}}>Cancel</button>}
{!eqEditId && <button onClick={function(){setEqMode("checklist");setEqForm({name:"",category:"",description:"",location:"",brand:"",model:""});setEqPhotos([]);}} style={{width:"100%",padding:"12px",background:"transparent",color:"var(--muted)",border:"none",fontSize:12,cursor:"pointer"}}>← Back to Checklist</button>}
</div>
)}

{/* ── LIST MODE ── */}
{eqMode==="list" && (
<div>
{getClientEquip(eqCid).length === 0 ? (
<div style={{textAlign:"center",padding:"40px 0",color:"var(--muted)"}}>
<div style={{fontSize:28,marginBottom:8}}>📋</div>
<div style={{fontSize:13}}>No equipment logged yet.</div>
<div style={{fontSize:11,marginTop:4,color:"var(--muted2)"}}>Switch to Checklist mode to start documenting.</div>
</div>
) : (
<div>
{getClientEquip(eqCid).map(function(item, idx){
var preset = EQ_PRESETS.find(function(p){return p.id===item.category;});
var isExpanded = eqExpanded === item.id;
return(
<div key={item.id} style={{background:"var(--s2)",border:"1px solid var(--border)",borderRadius:12,marginBottom:8,overflow:"hidden"}}>
<div onClick={function(){setEqExpanded(isExpanded?null:item.id);}} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer"}}>
<div style={{background:"var(--orange)",color:"#fff",borderRadius:"50%",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,flexShrink:0}}>{idx+1}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{fontWeight:700,fontSize:14,color:"var(--text)"}}>{preset?preset.icon+" ":""}{item.name}</div>
{item.location && <div style={{fontSize:12,color:"var(--blue)",marginTop:2}}>📍 {item.location}</div>}
{(item.brand||item.model) && <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{[item.brand,item.model].filter(Boolean).join(" · ")}</div>}
</div>
{item.photos && item.photos.length > 0 && <span style={{fontSize:11,color:"var(--muted)",flexShrink:0,background:"var(--surface)",padding:"3px 8px",borderRadius:10}}>📷 {item.photos.length}</span>}
<span style={{fontSize:18,color:"var(--muted)",transform:isExpanded?"rotate(180deg)":"rotate(0)",transition:"transform .2s",flexShrink:0}}>▾</span>
</div>

{isExpanded && (
<div style={{padding:"0 16px 16px",borderTop:"1px solid var(--border)"}}>
{item.description && <div style={{fontSize:13,color:"var(--muted)",marginTop:12,lineHeight:1.6}}>{item.description}</div>}
{(item.brand||item.model) && <div style={{fontSize:11,color:"var(--muted2)",marginTop:6}}>🏷 {[item.brand,item.model].filter(Boolean).join(" — ")}</div>}
{item.addedDate && <div style={{fontSize:10,color:"var(--muted2)",marginTop:4}}>Added: {item.addedDate}</div>}

{item.photos && item.photos.length > 0 && (
<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
{item.photos.map(function(url,pi){return(
<div key={pi} style={{width:80,height:80,borderRadius:10,overflow:"hidden",border:"1px solid var(--border)",cursor:"pointer"}} onClick={function(e){e.stopPropagation();window.open(url,"_blank");}}>
<img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
</div>
);})}
</div>
)}

<div style={{display:"flex",gap:8,marginTop:12}}>
<button onClick={function(e){e.stopPropagation();startEditEquip(item);}} style={{flex:1,padding:"10px",background:"var(--surface)",color:"var(--blue)",border:"1px solid var(--border)",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"center"}}>✏️ Edit</button>
<button onClick={function(e){e.stopPropagation();if(confirm("Remove "+item.name+"?"))deleteEquipItem(eqCid,item.id);}} style={{flex:1,padding:"10px",background:"var(--surface)",color:"var(--red)",border:"1px solid var(--border)",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"center"}}>🗑 Remove</button>
</div>
</div>
)}
</div>
);})}
<div style={{fontSize:10,color:"var(--muted2)",textAlign:"center",marginTop:8,padding:"8px 0"}}>{getClientEquip(eqCid).length} item{getClientEquip(eqCid).length!==1?"s":""} logged at this property</div>
</div>
)}
</div>
)}

</div>
);
})()}
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

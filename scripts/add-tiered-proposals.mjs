import { readFileSync, writeFileSync } from 'fs';

// ————————————————————————————————————————————————————————————
// add-tiered-proposals.mjs
// Adds optional tiered proposal system (Good/Better/Best)
// to the Finance tab's estimate section.
// Core estimating is untouched — tiers are a separate flow.
// ————————————————————————————————————————————————————————————

const file = 'src/ServiceProApp.jsx';
let content = readFileSync(file, 'utf8');
const original = content;

// Guard: skip if already injected
if (content.includes('showTierModal')) {
  console.log('[add-tiered-proposals] Already injected, skipping.');
  process.exit(0);
}

// — STEP 1: Add state variables after estItems state —

const estItemsAnchor = '[estItems, setEstItems]';
const estItemsIdx = content.indexOf(estItemsAnchor);
if (estItemsIdx === -1) {
  console.log('[add-tiered-proposals] Could not find estItems state. Skipping.');
  process.exit(0);
}

// Find the end of the line containing estItems state
const estItemsLineEnd = content.indexOf('\n', estItemsIdx);

const tierStateCode = `
const [showTierModal, setShowTierModal] = React.useState(false);
const [tierProposals, setTierProposals] = React.useState([]);
const [activeTierProposal, setActiveTierProposal] = React.useState(null);
const [tierEditData, setTierEditData] = React.useState(null);
const [tierActivePicker, setTierActivePicker] = React.useState(null);
const [tierPickerSearch, setTierPickerSearch] = React.useState('');
const [tierCustomerView, setTierCustomerView] = React.useState(null);

const defaultTierPresets = [
{name:'Good', color:'#4ade80', icon:'\\u2714', items:[], description:'Essential service to resolve the issue.', warranty:'30-day workmanship warranty', notes:''},
{name:'Better', color:'#f59e0b', icon:'\\u2B50', items:[], description:'Enhanced service with improved parts and extended coverage.', warranty:'90-day parts & labor warranty', notes:'', recommended:true},
{name:'Best', color:'#a855f7', icon:'\\uD83D\\uDC8E', items:[], description:'Premium service with top-tier components and comprehensive coverage.', warranty:'1-year full warranty', notes:''}
];

const initTierEdit = (existingProposal) => {
if (existingProposal) {
setTierEditData(JSON.parse(JSON.stringify(existingProposal)));
} else {
setTierEditData({
id: Date.now(),
name: 'Tiered Proposal',
created: new Date().toISOString().slice(0,10),
status: 'draft',
tiers: JSON.parse(JSON.stringify(defaultTierPresets)),
activeTierIdx: 0
});
}
setShowTierModal(true);
};

const addTierToProposal = () => {
if (!tierEditData) return;
const newTier = {name:'Tier '+(tierEditData.tiers.length+1), color:'#60a5fa', icon:'\\u2795', items:[], description:'', warranty:'', notes:''};
setTierEditData({...tierEditData, tiers:[...tierEditData.tiers, newTier], activeTierIdx: tierEditData.tiers.length});
};

const removeTierFromProposal = (idx) => {
if (!tierEditData || tierEditData.tiers.length <= 2) return;
const newTiers = tierEditData.tiers.filter((_,i)=>i!==idx);
const newIdx = Math.min(tierEditData.activeTierIdx, newTiers.length-1);
setTierEditData({...tierEditData, tiers:newTiers, activeTierIdx:newIdx});
};

const updateTierField = (tierIdx, field, value) => {
if (!tierEditData) return;
const newTiers = [...tierEditData.tiers];
newTiers[tierIdx] = {...newTiers[tierIdx], [field]:value};
setTierEditData({...tierEditData, tiers:newTiers});
};

const addItemToTier = (tierIdx, item) => {
if (!tierEditData) return;
const newTiers = [...tierEditData.tiers];
const existing = newTiers[tierIdx].items.find(x=>x.name===item.name);
if (existing) {
existing.qty = (existing.qty||1)+1;
newTiers[tierIdx] = {...newTiers[tierIdx], items:[...newTiers[tierIdx].items]};
} else {
newTiers[tierIdx] = {...newTiers[tierIdx], items:[...newTiers[tierIdx].items, {...item, qty:item.qty||1}]};
}
setTierEditData({...tierEditData, tiers:newTiers});
};

const removeItemFromTier = (tierIdx, itemIdx) => {
if (!tierEditData) return;
const newTiers = [...tierEditData.tiers];
newTiers[tierIdx] = {...newTiers[tierIdx], items: newTiers[tierIdx].items.filter((_,i)=>i!==itemIdx)};
setTierEditData({...tierEditData, tiers:newTiers});
};

const updateTierItemQty = (tierIdx, itemIdx, qty) => {
if (!tierEditData) return;
const newTiers = [...tierEditData.tiers];
const newItems = [...newTiers[tierIdx].items];
newItems[itemIdx] = {...newItems[itemIdx], qty: Math.max(1, qty)};
newTiers[tierIdx] = {...newTiers[tierIdx], items: newItems};
setTierEditData({...tierEditData, tiers:newTiers});
};

const saveTierProposal = () => {
if (!tierEditData) return;
setTierProposals(prev => {
const exists = prev.find(p => p.id === tierEditData.id);
if (exists) return prev.map(p => p.id === tierEditData.id ? tierEditData : p);
return [...prev, tierEditData];
});
setShowTierModal(false);
setTierEditData(null);
};

const deleteTierProposal = (id) => {
setTierProposals(prev => prev.filter(p => p.id !== id));
};

const tierTotal = (tier) => tier.items.reduce((sum, it) => sum + (it.price||0)*(it.qty||1), 0);
`;

content = content.substring(0, estItemsLineEnd) + '\n' + tierStateCode + content.substring(estItemsLineEnd);
console.log('[add-tiered-proposals] STEP 1: Added tier state variables.');


// — STEP 2: Add "Create Tiered Proposal" button next to "+ Create Estimate" —

const createEstAnchor = '+ Create Estimate';
const createEstIdx = content.indexOf(createEstAnchor);
if (createEstIdx === -1) {
  console.log('[add-tiered-proposals] Could not find Create Estimate button. Skipping step 2.');
} else {
  // Find the end of the line containing "+ Create Estimate"
  const createEstLineEnd = content.indexOf('\n', createEstIdx);

  const tierBtnCode = `
<div onClick={()=>initTierEdit(null)} className="btn" style={{width:'100%',padding:'16px',textAlign:'center',cursor:'pointer',border:'1px dashed #a855f7',borderRadius:12,color:'#a855f7',fontWeight:600,fontSize:14,marginTop:8,background:'transparent'}}>\\u{1F4CB} Create Tiered Proposal</div>`;

  content = content.substring(0, createEstLineEnd) + '\n' + tierBtnCode + content.substring(createEstLineEnd);
  console.log('[add-tiered-proposals] STEP 2: Added Create Tiered Proposal button.');
}


// — STEP 3: Add saved tier proposals display + customer card view —
// Insert after the "Request Signature" button area, before Inventory/Price Book buttons

const reqSigAnchor = 'Request Signature';
// Find the second occurrence (first is in nav, second is in finance tab)
let reqSigIdx = content.indexOf(reqSigAnchor);
if (reqSigIdx !== -1) {
  // Find the occurrence that's near the Create Estimate button area
  const createEstPos = content.indexOf('Create Tiered Proposal');
  if (createEstPos !== -1) {
    reqSigIdx = content.indexOf(reqSigAnchor, createEstPos);
  }
}

if (reqSigIdx !== -1) {
  const reqSigLineEnd = content.indexOf('\n', reqSigIdx);

  const tierDisplayCode = `

{tierProposals.length > 0 && <div style={{marginTop:16}}>
<div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'#94a3b8',marginBottom:8,textTransform:'uppercase'}}>Tiered Proposals</div>
{tierProposals.map(tp => <div key={tp.id} className="card" style={{padding:16,marginBottom:8,border:'1px solid #334155',borderRadius:12}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
<div style={{fontWeight:700,fontSize:15}}>{tp.name}</div>
<div style={{display:'flex',gap:6,alignItems:'center'}}>
<span className="badge" style={{background:tp.status==='sent'?'#2563eb':tp.status==='approved'?'#16a34a':'#475569',color:'#fff',padding:'2px 8px',borderRadius:8,fontSize:11,textTransform:'uppercase'}}>{tp.status}</span>
<span style={{fontSize:11,color:'#64748b'}}>{tp.created}</span>
</div>
</div>
<div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
{tp.tiers.map((t,i)=><div key={i} style={{background:t.color+'18',border:'1px solid '+t.color+'44',borderRadius:8,padding:'6px 12px',fontSize:12}}>
<span style={{color:t.color,fontWeight:600}}>{t.icon} {t.name}</span>
<span style={{color:'#94a3b8',marginLeft:6}}>{window.CURRENCY||'$'}{tierTotal(t).toFixed(2)}</span>
</div>)}
</div>
<div style={{display:'flex',gap:6}}>
<div onClick={()=>initTierEdit(tp)} className="btn btn-sm" style={{flex:1,textAlign:'center',padding:'8px 0',background:'#1e293b',borderRadius:8,cursor:'pointer',fontSize:12,color:'#e2e8f0'}}>Edit</div>
<div onClick={()=>setTierCustomerView(tp)} className="btn btn-sm" style={{flex:1,textAlign:'center',padding:'8px 0',background:'#7c3aed',borderRadius:8,cursor:'pointer',fontSize:12,color:'#fff'}}>Customer Preview</div>
<div onClick={()=>{if(confirm('Delete this tiered proposal?'))deleteTierProposal(tp.id)}} className="btn btn-sm" style={{textAlign:'center',padding:'8px 12px',background:'#1e293b',borderRadius:8,cursor:'pointer',fontSize:12,color:'#ef4444'}}>\\u2715</div>
</div>
</div>)}
</div>}

{tierCustomerView && <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={e=>{if(e.target===e.currentTarget)setTierCustomerView(null)}}>
<div style={{background:'#0f172a',borderRadius:16,padding:24,maxWidth:500,width:'100%',maxHeight:'90vh',overflow:'auto',border:'1px solid #334155'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
<div style={{fontSize:18,fontWeight:700,color:'#f1f5f9'}}>Choose Your Service Package</div>
<div onClick={()=>setTierCustomerView(null)} style={{cursor:'pointer',fontSize:20,color:'#94a3b8'}}>\\u2715</div>
</div>
<div style={{display:'flex',gap:6,marginBottom:16,borderBottom:'1px solid #1e293b',paddingBottom:8}}>
{tierCustomerView.tiers.map((t,i)=><div key={i} onClick={()=>setActiveTierProposal(i)} style={{flex:1,textAlign:'center',padding:'10px 8px',borderRadius:10,cursor:'pointer',background:activeTierProposal===i?t.color+'22':'transparent',border:activeTierProposal===i?'2px solid '+t.color:'2px solid transparent',position:'relative',transition:'all 0.2s'}}>
<div style={{fontSize:16,marginBottom:2}}>{t.icon}</div>
<div style={{fontWeight:700,fontSize:13,color:t.color}}>{t.name}</div>
{t.recommended && <div style={{position:'absolute',top:-8,right:-4,background:'#f59e0b',color:'#000',fontSize:9,fontWeight:800,padding:'1px 6px',borderRadius:8,textTransform:'uppercase'}}>Best Value</div>}
</div>)}
</div>
{tierCustomerView.tiers[activeTierProposal||0] && (() => {
const t = tierCustomerView.tiers[activeTierProposal||0];
return <div>
<div style={{color:'#94a3b8',fontSize:13,marginBottom:12,lineHeight:1.5}}>{t.description}</div>
{t.items.length > 0 && <div style={{marginBottom:12}}>
{t.items.map((it,j)=><div key={j} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid #1e293b',fontSize:13}}>
<span style={{color:'#e2e8f0'}}>{it.name} {it.qty>1?'\\u00D7'+it.qty:''}</span>
<span style={{color:'#94a3b8',fontWeight:600}}>{window.CURRENCY||'$'}{((it.price||0)*(it.qty||1)).toFixed(2)}</span>
</div>)}
</div>}
<div style={{display:'flex',justifyContent:'space-between',padding:'12px 0',borderTop:'2px solid '+t.color,marginTop:4}}>
<span style={{fontWeight:700,fontSize:15,color:'#f1f5f9'}}>Total</span>
<span style={{fontWeight:700,fontSize:15,color:t.color}}>{window.CURRENCY||'$'}{tierTotal(t).toFixed(2)}</span>
</div>
{t.warranty && <div style={{marginTop:8,padding:'8px 12px',background:'#1e293b',borderRadius:8,fontSize:12,color:'#94a3b8'}}>\\u{1F6E1} {t.warranty}</div>}
{t.notes && <div style={{marginTop:6,padding:'8px 12px',background:'#1e293b',borderRadius:8,fontSize:12,color:'#94a3b8'}}>\\u{1F4DD} {t.notes}</div>}
<div onClick={()=>{setTierProposals(prev=>prev.map(p=>p.id===tierCustomerView.id?{...p,status:'approved',selectedTier:activeTierProposal||0}:p));setTierCustomerView(null)}} className="btn" style={{width:'100%',marginTop:16,padding:'14px',textAlign:'center',background:t.color,color:t.color==='#f59e0b'?'#000':'#fff',fontWeight:700,fontSize:15,borderRadius:10,cursor:'pointer'}}>Select {t.name} Package</div>
</div>;
})()}
</div>
</div>}`;

  content = content.substring(0, reqSigLineEnd) + '\n' + tierDisplayCode + content.substring(reqSigLineEnd);
  console.log('[add-tiered-proposals] STEP 3: Added tier proposals display + customer view.');
}


// — STEP 4: Add the tiered proposal editor modal —
// Insert before the closing of the component's return (find a reliable spot)
// We'll insert it right before the last occurrence of the estimate modal area

const tierModalCode = `

{showTierModal && tierEditData && <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.7)',zIndex:9998,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={e=>{if(e.target===e.currentTarget){setShowTierModal(false);setTierEditData(null)}}}>
<div style={{background:'#0f172a',borderRadius:16,padding:0,maxWidth:700,width:'100%',maxHeight:'90vh',overflow:'auto',border:'1px solid #334155'}}>
<div style={{padding:'20px 24px',borderBottom:'1px solid #1e293b',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div style={{fontSize:18,fontWeight:700,color:'#f1f5f9'}}>{tierEditData.id && tierProposals.find(p=>p.id===tierEditData.id) ? 'Edit' : 'Create'} Tiered Proposal</div>
<div onClick={()=>{setShowTierModal(false);setTierEditData(null)}} style={{cursor:'pointer',fontSize:22,color:'#94a3b8',lineHeight:1}}>\\u2715</div>
</div>

<div style={{padding:'16px 24px'}}>
<div style={{marginBottom:12}}>
<div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'#64748b',marginBottom:4,textTransform:'uppercase'}}>Proposal Name</div>
<input className="inp" value={tierEditData.name} onChange={e=>setTierEditData({...tierEditData, name:e.target.value})} style={{width:'100%',padding:'10px 12px',background:'#1e293b',border:'1px solid #334155',borderRadius:8,color:'#f1f5f9',fontSize:14}} />
</div>

<div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
{tierEditData.tiers.map((t,i)=><div key={i} onClick={()=>setTierEditData({...tierEditData,activeTierIdx:i})} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,cursor:'pointer',background:tierEditData.activeTierIdx===i?t.color+'22':'#1e293b',border:tierEditData.activeTierIdx===i?'2px solid '+t.color:'2px solid #334155',transition:'all 0.2s'}}>
<span style={{fontSize:14}}>{t.icon}</span>
<span style={{fontWeight:600,fontSize:13,color:tierEditData.activeTierIdx===i?t.color:'#94a3b8'}}>{t.name}</span>
</div>)}
{tierEditData.tiers.length < 5 && <div onClick={addTierToProposal} style={{padding:'8px 14px',borderRadius:10,cursor:'pointer',border:'2px dashed #334155',fontSize:13,color:'#64748b'}}>+ Add Tier</div>}
</div>

{(() => {
const ti = tierEditData.activeTierIdx;
const tier = tierEditData.tiers[ti];
if (!tier) return null;
return <div style={{border:'1px solid #334155',borderRadius:12,padding:16,background:'#0f172a'}}>
<div style={{display:'flex',gap:8,marginBottom:12}}>
<div style={{flex:1}}>
<div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'#64748b',marginBottom:4,textTransform:'uppercase'}}>Tier Name</div>
<input className="inp" value={tier.name} onChange={e=>updateTierField(ti,'name',e.target.value)} style={{width:'100%',padding:'8px 10px',background:'#1e293b',border:'1px solid #334155',borderRadius:6,color:'#f1f5f9',fontSize:13}} />
</div>
<div style={{width:80}}>
<div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'#64748b',marginBottom:4,textTransform:'uppercase'}}>Color</div>
<input type="color" value={tier.color} onChange={e=>updateTierField(ti,'color',e.target.value)} style={{width:'100%',height:35,padding:2,background:'#1e293b',border:'1px solid #334155',borderRadius:6,cursor:'pointer'}} />
</div>
{tierEditData.tiers.length > 2 && <div style={{display:'flex',alignItems:'flex-end',paddingBottom:2}}>
<div onClick={()=>removeTierFromProposal(ti)} style={{padding:'8px 10px',background:'#1e293b',borderRadius:6,cursor:'pointer',color:'#ef4444',fontSize:12}}>\\u2715</div>
</div>}
</div>

<div style={{marginBottom:10}}>
<div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'#64748b',marginBottom:4,textTransform:'uppercase'}}>Description</div>
<textarea className="inp" value={tier.description} onChange={e=>updateTierField(ti,'description',e.target.value)} rows={2} style={{width:'100%',padding:'8px 10px',background:'#1e293b',border:'1px solid #334155',borderRadius:6,color:'#f1f5f9',fontSize:13,resize:'vertical'}} />
</div>

<div style={{display:'flex',gap:8,marginBottom:10}}>
<div style={{flex:1}}>
<div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'#64748b',marginBottom:4,textTransform:'uppercase'}}>Warranty</div>
<input className="inp" value={tier.warranty} onChange={e=>updateTierField(ti,'warranty',e.target.value)} style={{width:'100%',padding:'8px 10px',background:'#1e293b',border:'1px solid #334155',borderRadius:6,color:'#f1f5f9',fontSize:13}} />
</div>
<div style={{flex:1}}>
<div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'#64748b',marginBottom:4,textTransform:'uppercase'}}>Notes</div>
<input className="inp" value={tier.notes} onChange={e=>updateTierField(ti,'notes',e.target.value)} style={{width:'100%',padding:'8px 10px',background:'#1e293b',border:'1px solid #334155',borderRadius:6,color:'#f1f5f9',fontSize:13}} />
</div>
</div>

<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
<input type="checkbox" checked={!!tier.recommended} onChange={e=>updateTierField(ti,'recommended',e.target.checked)} style={{accentColor:tier.color}} />
<span style={{fontSize:12,color:'#94a3b8'}}>Mark as recommended (Best Value)</span>
</div>

<div style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'#64748b',marginBottom:6,marginTop:10,textTransform:'uppercase'}}>Line Items</div>
{tier.items.length===0 && <div style={{textAlign:'center',padding:'16px',color:'#475569',fontSize:13}}>No items yet. Add from inventory or enter manually.</div>}
{tier.items.map((it,j) => <div key={j} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0',borderBottom:'1px solid #1e293b'}}>
<div style={{flex:1,fontSize:13,color:'#e2e8f0'}}>{it.name}</div>
<div style={{display:'flex',alignItems:'center',gap:4}}>
<div onClick={()=>updateTierItemQty(ti,j,(it.qty||1)-1)} style={{width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',background:'#1e293b',borderRadius:4,cursor:'pointer',color:'#94a3b8',fontSize:14}}>-</div>
<span style={{fontSize:13,color:'#e2e8f0',minWidth:20,textAlign:'center'}}>{it.qty||1}</span>
<div onClick={()=>updateTierItemQty(ti,j,(it.qty||1)+1)} style={{width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',background:'#1e293b',borderRadius:4,cursor:'pointer',color:'#94a3b8',fontSize:14}}>+</div>
</div>
<div style={{fontSize:13,color:'#94a3b8',minWidth:60,textAlign:'right'}}>{window.CURRENCY||'$'}{((it.price||0)*(it.qty||1)).toFixed(2)}</div>
<div onClick={()=>removeItemFromTier(ti,j)} style={{cursor:'pointer',color:'#ef4444',fontSize:14}}>\\u2715</div>
</div>)}

<div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderTop:'1px solid #334155',marginTop:6}}>
<span style={{fontWeight:700,fontSize:14,color:'#f1f5f9'}}>Tier Total</span>
<span style={{fontWeight:700,fontSize:14,color:tier.color}}>{window.CURRENCY||'$'}{tierTotal(tier).toFixed(2)}</span>
</div>

{!tierActivePicker && <div style={{display:'flex',gap:6,marginTop:8}}>
<div onClick={()=>setTierActivePicker('manual')} className="btn btn-sm" style={{flex:1,textAlign:'center',padding:'10px',background:'#1e293b',border:'1px solid #334155',borderRadius:8,cursor:'pointer',fontSize:12,color:'#e2e8f0'}}>+ Add Manual Item</div>
<div onClick={()=>setTierActivePicker('inventory')} className="btn btn-sm" style={{flex:1,textAlign:'center',padding:'10px',background:'#1e293b',border:'1px solid #334155',borderRadius:8,cursor:'pointer',fontSize:12,color:'#e2e8f0'}}>\\uD83D\\uDCE6 From Inventory</div>
</div>}

{tierActivePicker==='manual' && <div style={{marginTop:8,padding:12,background:'#1e293b',borderRadius:8,border:'1px solid #334155'}}>
<div style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:6,textTransform:'uppercase'}}>Add Manual Item</div>
<div style={{display:'flex',gap:6}}>
<input id="tier-item-name" className="inp" placeholder="Item name" style={{flex:2,padding:'8px',background:'#0f172a',border:'1px solid #334155',borderRadius:6,color:'#f1f5f9',fontSize:13}} />
<input id="tier-item-price" className="inp" type="number" placeholder="Price" style={{flex:1,padding:'8px',background:'#0f172a',border:'1px solid #334155',borderRadius:6,color:'#f1f5f9',fontSize:13}} />
<div onClick={()=>{
const nameEl=document.getElementById('tier-item-name');
const priceEl=document.getElementById('tier-item-price');
if(nameEl&&nameEl.value){addItemToTier(ti,{name:nameEl.value,price:parseFloat(priceEl?.value)||0,qty:1});nameEl.value='';if(priceEl)priceEl.value=''}
}} className="btn" style={{padding:'8px 14px',background:'#7c3aed',borderRadius:6,cursor:'pointer',color:'#fff',fontSize:12,fontWeight:600}}>Add</div>
</div>
<div onClick={()=>setTierActivePicker(null)} style={{textAlign:'center',marginTop:6,fontSize:11,color:'#64748b',cursor:'pointer'}}>Cancel</div>
</div>}

{tierActivePicker==='inventory' && <div style={{marginTop:8,padding:12,background:'#1e293b',borderRadius:8,border:'1px solid #334155'}}>
<div style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:6,textTransform:'uppercase'}}>Add from Inventory</div>
<input className="inp" placeholder="Search inventory..." value={tierPickerSearch} onChange={e=>setTierPickerSearch(e.target.value)} style={{width:'100%',padding:'8px',background:'#0f172a',border:'1px solid #334155',borderRadius:6,color:'#f1f5f9',fontSize:13,marginBottom:6}} />
<div style={{maxHeight:150,overflow:'auto'}}>
{(window.__inventoryItems||[
{name:'Basic Filter',price:15},{name:'Premium Filter',price:35},{name:'Capacitor',price:45},{name:'Thermostat',price:85},
{name:'Blower Motor',price:250},{name:'Compressor',price:800},{name:'Condenser Coil',price:450},{name:'Evaporator Coil',price:550},
{name:'Refrigerant (per lb)',price:75},{name:'Ductwork Section',price:120},{name:'UV Light System',price:350},{name:'Smart Thermostat',price:200}
]).filter(x=>!tierPickerSearch||x.name.toLowerCase().includes(tierPickerSearch.toLowerCase())).map((inv,k)=>
<div key={k} onClick={()=>addItemToTier(ti,{name:inv.name,price:inv.price,qty:1})} style={{display:'flex',justifyContent:'space-between',padding:'8px',cursor:'pointer',borderRadius:6,fontSize:13,color:'#e2e8f0',borderBottom:'1px solid #0f172a'}} onMouseOver={e=>e.currentTarget.style.background='#334155'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
<span>{inv.name}</span><span style={{color:'#94a3b8'}}>{window.CURRENCY||'$'}{inv.price.toFixed(2)}</span>
</div>)}
</div>
<div onClick={()=>{setTierActivePicker(null);setTierPickerSearch('')}} style={{textAlign:'center',marginTop:6,fontSize:11,color:'#64748b',cursor:'pointer'}}>Close</div>
</div>}

</div>;
})()}
</div>

<div style={{padding:'16px 24px',borderTop:'1px solid #1e293b',display:'flex',gap:8,justifyContent:'flex-end'}}>
<div onClick={()=>{setShowTierModal(false);setTierEditData(null)}} className="btn" style={{padding:'10px 20px',background:'#1e293b',borderRadius:8,cursor:'pointer',fontSize:13,color:'#94a3b8'}}>Cancel</div>
<div onClick={saveTierProposal} className="btn" style={{padding:'10px 20px',background:'#7c3aed',borderRadius:8,cursor:'pointer',fontSize:13,color:'#fff',fontWeight:600}}>Save Proposal</div>
</div>
</div>
</div>}`;

// Insert the tier modal right before the estimate modal (the "Add Estimate" heading)
const addEstimateAnchor = 'Add Estimate';
// Find the div/heading containing "Add Estimate" - it should be the modal overlay
// We need to find the modal container start. Look for the expandEst conditional rendering.
const expandEstRenderIdx = content.indexOf('expandEst', content.indexOf('expandEst') + 1);
if (expandEstRenderIdx !== -1) {
  // Go back to find the start of this line
  const lineStart = content.lastIndexOf('\n', expandEstRenderIdx);
  content = content.substring(0, lineStart) + '\n' + tierModalCode + '\n' + content.substring(lineStart);
  console.log('[add-tiered-proposals] STEP 4: Added tier modal component.');
} else {
  console.log('[add-tiered-proposals] Could not find expandEst render location. Skipping step 4.');
}


// — STEP 5: Write the modified file —

if (content !== original) {
  writeFileSync(file, content, 'utf8');
  console.log('[add-tiered-proposals] Done! File written successfully.');
} else {
  console.log('[add-tiered-proposals] No changes made.');
}


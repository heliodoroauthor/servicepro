import { readFileSync, writeFileSync } from 'fs';
const file = 'src/ServiceProApp.jsx';
let c = readFileSync(file, 'utf8');

const MARKER = '/* FINANCE_BUTTONS_WIRED */';
if (c.includes(MARKER)) {
  console.log('[wire-finance-buttons] Already patched, skipping.');
  process.exit(0);
}

// ══════════════════════════════════════════════════════════════════════
// STEP 1: Add state variables for saved estimates/invoices lists
// Find invExpand useState (added by add-invoices-section.mjs)
// ══════════════════════════════════════════════════════════════════════
const invExpandIdx = c.indexOf('var [invExpand, setInvExpand]');
if (invExpandIdx === -1) {
  console.error('[wire-finance-buttons] Cannot find invExpand useState — run add-invoices-section.mjs first');
  process.exit(1);
}
const invExpandEnd = c.indexOf(';', invExpandIdx);
const stateVars = `
${MARKER}
var [savedEstimates, setSavedEstimates] = React.useState([]);
var [savedInvoices, setSavedInvoices] = React.useState([]);
var [financeLoading, setFinanceLoading] = React.useState("");
var [viewEstimate, setViewEstimate] = React.useState(null);`;
c = c.substring(0, invExpandEnd + 1) + stateVars + c.substring(invExpandEnd + 1);
console.log('[wire-finance-buttons] STEP 1: Added state vars for estimates/invoices/viewEstimate');

// ══════════════════════════════════════════════════════════════════════
// STEP 2: Add helper functions
// Insert right after the viewEstimate state var we just added
// ══════════════════════════════════════════════════════════════════════
const viewEstEnd = c.indexOf(';', c.indexOf('var [viewEstimate, setViewEstimate]'));

const helperFunctions = `

async function sendInvoiceToAPI(estObj, clientEml) {
  setFinanceLoading("invoice");
  try {
    var invNum = "INV-" + Date.now().toString(36).toUpperCase();
    var today = new Date().toLocaleDateString("en-US");
    var due = new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString("en-US");
    var jobItems = (estObj.items || []).map(function(it) {
      return { description: it.name || it.description || "Service", qty: it.qty || 1, unitPrice: it.price || it.unitPrice || 0 };
    });
    var subtotal = jobItems.reduce(function(s,it){ return s + (it.qty * it.unitPrice); }, 0);
    var tax = subtotal * 0.0825;
    var total = subtotal + tax;
    var payload = {
      to: clientEml,
      clientName: estObj.clientName || "Customer",
      invoiceNumber: invNum,
      invoiceDate: today,
      dueDate: due,
      items: jobItems,
      subtotal: subtotal,
      tax: tax,
      total: total,
      notes: "Thank you for your business!",
      companyName: "ServicePro by TurfCure",
      status: "pending",
      jobId: estObj.jobId || ""
    };
    var resp = await fetch("/api/send-invoice", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload) });
    var result = await resp.json();
    if (result.ok) {
      setSavedInvoices(function(prev) { return [].concat(prev, [{ number: invNum, date: today, total: total, items: jobItems, clientName: estObj.clientName, jobId: estObj.jobId, url: result.cloudinary ? result.cloudinary.url : null, sent: !!result.messageId, to: clientEml, fromEstimate: estObj.number || "" }]); });
      alert("Invoice " + invNum + " created and sent to " + clientEml + "!");
    } else {
      alert("Error creating invoice: " + (result.error || "Unknown error"));
    }
  } catch(e) {
    alert("Failed to send invoice: " + e.message);
  }
  setFinanceLoading("");
}

async function sendEstimateToAPI(estObj, clientEml) {
  setFinanceLoading("estimate");
  try {
    var estNum = estObj.number || ("EST-" + Date.now().toString(36).toUpperCase());
    var today = new Date().toLocaleDateString("en-US");
    var validUntil = new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString("en-US");
    var jobItems = (estObj.items || []).map(function(it) {
      return { description: it.name || it.description || "Service", qty: it.qty || 1, unitPrice: it.price || it.unitPrice || 0 };
    });
    var subtotal = jobItems.reduce(function(s,it){ return s + (it.qty * it.unitPrice); }, 0);
    var tax = subtotal * 0.0825;
    var total = subtotal + tax;
    var payload = {
      to: clientEml,
      clientName: estObj.clientName || "Customer",
      estimateNumber: estNum,
      estimateDate: today,
      validUntil: validUntil,
      items: jobItems,
      subtotal: subtotal,
      tax: tax,
      total: total,
      notes: "This estimate is valid for 30 days.",
      companyName: "ServicePro by TurfCure",
      status: "sent",
      jobId: estObj.jobId || "",
      jobTitle: estObj.jobTitle || ""
    };
    var resp = await fetch("/api/send-estimate", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload) });
    var result = await resp.json();
    if (result.ok) {
      setSavedEstimates(function(prev) { return prev.map(function(e) { return e.number === estNum ? Object.assign({}, e, {sent: true, to: clientEml, url: result.cloudinary ? result.cloudinary.url : null}) : e; }); });
      alert("Estimate " + estNum + " sent to " + clientEml + "!");
    } else {
      alert("Error sending estimate: " + (result.error || "Unknown error"));
    }
  } catch(e) {
    alert("Failed to send estimate: " + e.message);
  }
  setFinanceLoading("");
}
`;

c = c.substring(0, viewEstEnd + 1) + helperFunctions + c.substring(viewEstEnd + 1);
console.log('[wire-finance-buttons] STEP 2: Added sendInvoiceToAPI and sendEstimateToAPI helper functions');

// ══════════════════════════════════════════════════════════════════════
// STEP 3: Wire the "Save Estimate" button
// Currently: <Btn onClick={close}>Save Estimate</Btn>
// We need: onClick that captures estItems, saves to savedEstimates, then closes
// Strategy: find "Save Estimate" text in the modal footer, walk back to onClick
// ══════════════════════════════════════════════════════════════════════
const saveEstTextIdx = c.indexOf('Save Estimate');
if (saveEstTextIdx === -1) {
  console.error('[wire-finance-buttons] Cannot find Save Estimate button text');
  process.exit(1);
}
// Find the <Btn before "Save Estimate"
let saveBtn = saveEstTextIdx;
const saveBtnLimit = Math.max(0, saveEstTextIdx - 500);
while (saveBtn > saveBtnLimit && c.substring(saveBtn, saveBtn + 4) !== '<Btn') saveBtn--;
if (c.substring(saveBtn, saveBtn + 4) !== '<Btn') {
  console.error('[wire-finance-buttons] Cannot find <Btn before Save Estimate');
  process.exit(1);
}
// Find onClick in this button
const saveOcStart = c.indexOf('onClick', saveBtn);
if (saveOcStart === -1 || saveOcStart > saveEstTextIdx) {
  console.error('[wire-finance-buttons] Cannot find onClick for Save Estimate button');
  process.exit(1);
}
// Parse the onClick value (find matching braces)
let saveBraceDepth = 0;
let saveOcEnd = saveOcStart;
for (let i = saveOcStart; i < saveEstTextIdx; i++) {
  if (c[i] === '{') saveBraceDepth++;
  if (c[i] === '}') { saveBraceDepth--; if (saveBraceDepth === 0) { saveOcEnd = i + 1; break; } }
}
const oldSaveOnClick = c.substring(saveOcStart, saveOcEnd);
console.log('[wire-finance-buttons] STEP 3: Found Save Estimate onClick: ' + oldSaveOnClick.substring(0, 60));

// New Save Estimate onClick:
// - Validates estItems has items
// - Builds saved estimate object
// - Pushes to savedEstimates
// - Resets estItems
// - Closes modal
const newSaveOnClick = `onClick={()=>{if(!estItems||estItems.length===0){alert("Add at least one item to the estimate.");return;}var estNum="EST-"+Date.now().toString(36).toUpperCase();var today=new Date().toLocaleDateString("en-US");var validUntil=new Date(Date.now()+30*24*60*60*1000).toLocaleDateString("en-US");var items=estItems.map(function(it){return{name:it.name||"Service",qty:it.qty||1,price:it.price||0,description:it.name||"Service",unitPrice:it.price||0};});var subtotal=items.reduce(function(s,it){return s+(it.qty*it.price);},0);var tax=subtotal*0.0825;var total=subtotal+tax;var jd=appts.find(function(jj){return jj.id===selJob;})||{};;var est={number:estNum,date:today,validUntil:validUntil,items:items,subtotal:subtotal,tax:tax,total:total,clientName:jd.client||jd.clientName||"Customer",jobId:jd.id||"",jobTitle:jd.title||jd.address||"",status:"draft",sent:false,to:null,url:null};setSavedEstimates(function(prev){return[].concat(prev,[est]);});setEstItems([]);close();alert("Estimate "+estNum+" saved! Total: $"+total.toFixed(2));}}`;

c = c.substring(0, saveOcStart) + newSaveOnClick + c.substring(saveOcEnd);
console.log('[wire-finance-buttons] STEP 3: Rewired Save Estimate button to capture items and save');

// ══════════════════════════════════════════════════════════════════════
// STEP 4: Wire the "Create Invoice" button
// Find "Create Invoice" AFTER "Save Estimate" in the footer
// New behavior: use estItems from modal to create and send invoice
// ══════════════════════════════════════════════════════════════════════
const createInvBtnIdx = c.indexOf('Create Invoice', c.indexOf('Save Estimate'));
if (createInvBtnIdx === -1) {
  console.error('[wire-finance-buttons] Cannot find Create Invoice button text after Save Estimate');
  process.exit(1);
}
let ciBtn = createInvBtnIdx;
const ciBtnLimit = Math.max(0, createInvBtnIdx - 500);
while (ciBtn > ciBtnLimit && c.substring(ciBtn, ciBtn + 4) !== '<Btn') ciBtn--;
if (c.substring(ciBtn, ciBtn + 4) !== '<Btn') {
  console.error('[wire-finance-buttons] Cannot find <Btn before Create Invoice');
  process.exit(1);
}
const ciOcStart = c.indexOf('onClick', ciBtn);
if (ciOcStart === -1 || ciOcStart > createInvBtnIdx) {
  console.error('[wire-finance-buttons] Cannot find onClick for Create Invoice button');
  process.exit(1);
}
let ciBraceDepth = 0;
let ciOcEnd = ciOcStart;
for (let i = ciOcStart; i < createInvBtnIdx; i++) {
  if (c[i] === '{') ciBraceDepth++;
  if (c[i] === '}') { ciBraceDepth--; if (ciBraceDepth === 0) { ciOcEnd = i + 1; break; } }
}
console.log('[wire-finance-buttons] STEP 4: Found Create Invoice onClick: ' + c.substring(ciOcStart, ciOcEnd).substring(0, 60));

const newCiOnClick = `onClick={()=>{if(!estItems||estItems.length===0){alert("Add items to the estimate first, then create invoice.");return;}var jd=appts.find(function(jj){return jj.id===selJob;})||{};var invNum="INV-"+Date.now().toString(36).toUpperCase();var today=new Date().toLocaleDateString("en-US");var items=estItems.map(function(it){return{name:it.name||it.description||"Service",qty:it.qty||1,price:it.price||it.unitPrice||0,description:it.name||it.description||"Service",unitPrice:it.price||it.unitPrice||0};});var subtotal=items.reduce(function(s,it){return s+(it.qty*it.price);},0);var tax=subtotal*0.0825;var total=subtotal+tax;setSavedInvoices(function(prev){return[].concat(prev,[{number:invNum,date:today,total:total,items:items,clientName:jd.client||jd.clientName||"Customer",jobId:jd.id||"",jobTitle:jd.title||jd.address||"",sent:false,to:null,url:null,fromEstimate:""}]);});setEstItems([]);close();alert("Invoice "+invNum+" created! Total: $"+total.toFixed(2));}}`;

c = c.substring(0, ciOcStart) + newCiOnClick + c.substring(ciOcEnd);
console.log('[wire-finance-buttons] STEP 4: Rewired Create Invoice button');

// ══════════════════════════════════════════════════════════════════════
// STEP 5: Wire the "Send Estimate" button
// Find "Send Estimate" AFTER "Create Invoice"
// New behavior: save the estimate first, then send via API
// ══════════════════════════════════════════════════════════════════════
const sendEstAnchor = c.indexOf('Create Invoice', c.indexOf('Save Estimate'));
const sendEstBtnIdx = c.indexOf('Send Estimate', sendEstAnchor);
if (sendEstBtnIdx === -1) {
  console.error('[wire-finance-buttons] Cannot find Send Estimate button text after Create Invoice');
  process.exit(1);
}
let seBtn = sendEstBtnIdx;
const seBtnLimit = Math.max(0, sendEstBtnIdx - 500);
while (seBtn > seBtnLimit && c.substring(seBtn, seBtn + 4) !== '<Btn') seBtn--;
if (c.substring(seBtn, seBtn + 4) !== '<Btn') {
  console.error('[wire-finance-buttons] Cannot find <Btn before Send Estimate');
  process.exit(1);
}
const seOcStart = c.indexOf('onClick', seBtn);
if (seOcStart === -1 || seOcStart > sendEstBtnIdx) {
  console.error('[wire-finance-buttons] Cannot find onClick for Send Estimate button');
  process.exit(1);
}
let seBraceDepth = 0;
let seOcEnd = seOcStart;
for (let i = seOcStart; i < sendEstBtnIdx; i++) {
  if (c[i] === '{') seBraceDepth++;
  if (c[i] === '}') { seBraceDepth--; if (seBraceDepth === 0) { seOcEnd = i + 1; break; } }
}
console.log('[wire-finance-buttons] STEP 5: Found Send Estimate onClick: ' + c.substring(seOcStart, seOcEnd).substring(0, 60));

const newSeOnClick = `onClick={()=>{if(!estItems||estItems.length===0){alert("Add items to the estimate first.");return;}var jd=appts.find(function(jj){return jj.id===selJob;})||{};;var cl=jd.clientId?clientById(jd.clientId):null;var em=cl&&cl.email?cl.email:null;if(!em){alert("No email found for this client. Please add an email to the client record first.");return;}var estNum="EST-"+Date.now().toString(36).toUpperCase();var today=new Date().toLocaleDateString("en-US");var validUntil=new Date(Date.now()+30*24*60*60*1000).toLocaleDateString("en-US");var items=estItems.map(function(it){return{name:it.name||"Service",qty:it.qty||1,price:it.price||0};});var subtotal=items.reduce(function(s,it){return s+(it.qty*it.price);},0);var tax=subtotal*0.0825;var total=subtotal+tax;var estObj={number:estNum,date:today,validUntil:validUntil,items:items,subtotal:subtotal,tax:tax,total:total,clientName:jd.client||jd.clientName||"Customer",jobId:jd.id||"",jobTitle:jd.title||jd.address||"",status:"sent"};setSavedEstimates(function(prev){return[].concat(prev,[estObj]);});sendEstimateToAPI(estObj,em);setEstItems([]);close();}}`;

c = c.substring(0, seOcStart) + newSeOnClick + c.substring(seOcEnd);
console.log('[wire-finance-buttons] STEP 5: Rewired Send Estimate button');

// ══════════════════════════════════════════════════════════════════════
// STEP 6: Replace the expandable section content for est and inv keys
// with vertical stacked lists showing saved estimates/invoices
// ══════════════════════════════════════════════════════════════════════

const expandContentIdx = c.indexOf('expand-content');
if (expandContentIdx === -1) {
  console.error('[wire-finance-buttons] Cannot find expand-content');
  process.exit(1);
}
const itemsCheckIdx = c.indexOf('s.key==="items"', expandContentIdx);
if (itemsCheckIdx === -1) {
  console.error('[wire-finance-buttons] Cannot find s.key==="items" check');
  process.exit(1);
}

// Estimate section content - vertical stacked list with clickable cards
const estContent = `s.key==="est" ? (
<div style={{display:"flex",flexDirection:"column",gap:10,padding:"8px 0"}}>
{savedEstimates.length === 0 ? (
<div style={{textAlign:"center",padding:"20px 0",color:"#999"}}>
<div style={{fontSize:28,marginBottom:6}}>{"\u{1F4CB}"}</div>
<div style={{fontSize:13}}>No estimates yet</div>
<div style={{fontSize:11,color:"#bbb",marginTop:4}}>Open a job and click "+ Create Estimate" to get started</div>
</div>
) : savedEstimates.map(function(est, idx) { return (
<div key={idx} onClick={function(){setViewEstimate(viewEstimate===idx?null:idx);}} style={{background:viewEstimate===idx?"#e3f2fd":"#f8f9fa",border:viewEstimate===idx?"2px solid #1565C0":"1px solid #e0e0e0",borderRadius:10,padding:14,cursor:"pointer",transition:"all 0.2s"}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div>
<div style={{fontWeight:"bold",fontSize:14,color:"#333"}}>{est.number}</div>
<div style={{color:"#666",fontSize:12,marginTop:2}}>{est.date} {est.clientName ? " - "+est.clientName : ""}</div>
</div>
<div style={{display:"flex",gap:8,alignItems:"center"}}>
<span style={{fontWeight:"bold",fontSize:15,color:"#1565C0"}}>{"$"}{est.total?est.total.toFixed(2):"0.00"}</span>
{est.sent ? <span style={{background:"#c8e6c9",color:"#2E7D32",padding:"2px 8px",borderRadius:12,fontSize:10,fontWeight:"bold"}}>SENT</span> : <span style={{background:"#fff3e0",color:"#e65100",padding:"2px 8px",borderRadius:12,fontSize:10,fontWeight:"bold"}}>DRAFT</span>}
</div>
</div>
{viewEstimate===idx && (
<div style={{marginTop:12,borderTop:"1px solid #e0e0e0",paddingTop:12}}>
<div style={{fontSize:12,fontWeight:"bold",color:"#555",marginBottom:6}}>Items:</div>
{(est.items||[]).map(function(it,ii){return(
<div key={ii} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12,borderBottom:"1px solid #f0f0f0"}}>
<span style={{color:"#333"}}>{it.name||it.description||"Item"} x{it.qty||1}</span>
<span style={{color:"#666"}}>{"$"}{((it.qty||1)*(it.price||it.unitPrice||0)).toFixed(2)}</span>
</div>
);})}
<div style={{display:"flex",justifyContent:"space-between",marginTop:8,paddingTop:6,borderTop:"1px solid #ccc",fontWeight:"bold",fontSize:13}}>
<span>Total</span><span style={{color:"#1565C0"}}>{"$"}{est.total?est.total.toFixed(2):"0.00"}</span>
</div>
{est.url && <a href={est.url} target="_blank" rel="noopener" style={{display:"inline-block",marginTop:8,color:"#1565C0",fontSize:12,textDecoration:"underline"}}>View PDF</a>}
<div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
{!est.sent && <button onClick={function(ev){ev.stopPropagation();var job=appts.find(function(j){return j.id===est.jobId})||{};var cl=job.clientId?clientById(job.clientId):null;var em=cl&&cl.email?cl.email:null;if(!em){alert("No email found for this client. Please add an email to the client record first.");return;}sendEstimateToAPI(est,em);}} disabled={financeLoading==="estimate"} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #1565C0",background:"#1565C0",color:"#fff",fontSize:12,cursor:"pointer"}}>{financeLoading==="estimate"?"Sending...":"\u{1F4E4} Send Estimate"}</button>}
<button onClick={function(ev){ev.stopPropagation();var invNum="INV-"+Date.now().toString(36).toUpperCase();var today=new Date().toLocaleDateString("en-US");var items=(est.items||[]).map(function(it){return{name:it.name||it.description||"Service",qty:it.qty||1,price:it.price||it.unitPrice||0,description:it.name||it.description||"Service",unitPrice:it.price||it.unitPrice||0};});var subtotal=items.reduce(function(s,it){return s+(it.qty*it.price);},0);var tax=subtotal*0.0825;var total=subtotal+tax;setSavedInvoices(function(prev){return[].concat(prev,[{number:invNum,date:today,total:total,items:items,clientName:est.clientName||"Customer",jobId:est.jobId||"",jobTitle:est.jobTitle||"",sent:false,to:null,url:null,fromEstimate:est.number||""}]);});alert("Invoice "+invNum+" created from "+est.number+"! Total: $"+total.toFixed(2));}} disabled={financeLoading==="invoice"} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #2E7D32",background:"#2E7D32",color:"#fff",fontSize:12,cursor:"pointer"}}>{financeLoading==="invoice"?"Creating...":"\u{1F9FE} Create Invoice"}</button>
</div>
</div>
)}
</div>
); })}
</div>
) : `;

// Invoice section content - vertical stacked list
const invContent = `s.key==="inv" ? (
<div style={{display:"flex",flexDirection:"column",gap:10,padding:"8px 0"}}>
{savedInvoices.length === 0 ? (
<div style={{textAlign:"center",padding:"20px 0",color:"#999"}}>
<div style={{fontSize:28,marginBottom:6}}>{"\u{1F9FE}"}</div>
<div style={{fontSize:13}}>No invoices yet</div>
<div style={{fontSize:11,color:"#bbb",marginTop:4}}>Create an invoice from a saved estimate</div>
</div>
) : savedInvoices.map(function(inv, idx) { return (
<div key={idx} style={{background:"#f8f9fa",border:"1px solid #e0e0e0",borderRadius:10,padding:14}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div>
<div style={{fontWeight:"bold",fontSize:14,color:"#333"}}>{inv.number}</div>
<div style={{color:"#666",fontSize:12,marginTop:2}}>{inv.date}{inv.to?" - Sent to "+inv.to:""}</div>
{inv.fromEstimate && <div style={{color:"#999",fontSize:11,marginTop:1}}>From: {inv.fromEstimate}</div>}
</div>
<div style={{display:"flex",gap:8,alignItems:"center"}}>
<span style={{fontWeight:"bold",fontSize:15,color:"#2E7D32"}}>{"$"}{inv.total?inv.total.toFixed(2):"0.00"}</span>
{inv.sent ? <span style={{background:"#c8e6c9",color:"#2E7D32",padding:"2px 8px",borderRadius:12,fontSize:10,fontWeight:"bold"}}>SENT</span> : <span style={{background:"#e3f2fd",color:"#1565C0",padding:"2px 8px",borderRadius:12,fontSize:10,fontWeight:"bold"}}>CREATED</span>}
</div>
</div>
{inv.url && <a href={inv.url} target="_blank" rel="noopener" style={{display:"inline-block",marginTop:8,color:"#1565C0",fontSize:12,textDecoration:"underline"}}>View PDF</a>}
<div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
{!inv.sent && <button onClick={function(ev){ev.stopPropagation();var job=appts.find(function(j){return j.id===inv.jobId})||{};var cl=job.clientId?clientById(job.clientId):null;var em=cl&&cl.email?cl.email:null;if(!em){alert("No email found for this client. Please add an email to the client record first.");return;}sendInvoiceToAPI(inv,em);}} disabled={financeLoading==="invoice"} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #2E7D32",background:"#2E7D32",color:"#fff",fontSize:12,cursor:"pointer"}}>{financeLoading==="invoice"?"Sending...":"\u{1F4E4} Send Invoice"}</button>}
{inv.sent && <button onClick={function(ev){ev.stopPropagation();var job=appts.find(function(j){return j.id===inv.jobId})||{};var cl=job.clientId?clientById(job.clientId):null;var em=cl&&cl.email?cl.email:null;if(!em){alert("No email found for this client. Please add an email to the client record first.");return;}sendInvoiceToAPI(inv,em);}} disabled={financeLoading==="invoice"} style={{padding:"6px 14px",borderRadius:6,border:"1px solid #666",background:"#666",color:"#fff",fontSize:12,cursor:"pointer"}}>{financeLoading==="invoice"?"Sending...":"\u{1F4E4} Resend Invoice"}</button>}
</div>
</div>
); })}
</div>
) : `;

c = c.substring(0, itemsCheckIdx) + estContent + invContent + c.substring(itemsCheckIdx);
console.log('[wire-finance-buttons] STEP 6: Added vertical stacked lists for Estimates and Invoices sections');

// ══════════════════════════════════════════════════════════════════════
// STEP 7: Add loading/disabled states on the modal footer buttons
// ══════════════════════════════════════════════════════════════════════
const ciMarker = 'sendInvoiceToAPI(estObj,em)';
const ciBtn2 = c.indexOf(ciMarker);
if (ciBtn2 !== -1) {
  let bs = ciBtn2;
  while (bs > 0 && c.substring(bs, bs + 4) !== '<Btn') bs--;
  if (c.substring(bs, bs + 4) === '<Btn') {
    c = c.substring(0, bs + 4) + ' disabled={financeLoading==="invoice"}' + c.substring(bs + 4);
  }
}

const seMarker = 'sendEstimateToAPI(estObj,em)';
const seBtn2 = c.indexOf(seMarker);
if (seBtn2 !== -1) {
  let bs2 = seBtn2;
  while (bs2 > 0 && c.substring(bs2, bs2 + 4) !== '<Btn') bs2--;
  if (c.substring(bs2, bs2 + 4) === '<Btn') {
    c = c.substring(0, bs2 + 4) + ' disabled={financeLoading==="estimate"}' + c.substring(bs2 + 4);
  }
}
console.log('[wire-finance-buttons] STEP 7: Added loading/disabled states to modal footer buttons');

// ══════════════════════════════════════════════════════════════════════
// STEP 8: Update the Estimates and Invoices expandable section counts
// ══════════════════════════════════════════════════════════════════════
const estCountIdx = c.indexOf('key:"est"');
if (estCountIdx !== -1) {
  const countStart = c.indexOf('count:', estCountIdx);
  if (countStart !== -1 && countStart - estCountIdx < 100) {
    const countValStart = countStart + 6;
    let countValEnd = countValStart;
    if (c[countValStart] === '"') {
      countValEnd = c.indexOf('"', countValStart + 1) + 1;
    } else {
      while (c[countValEnd] !== ',' && c[countValEnd] !== '}') countValEnd++;
    }
    c = c.substring(0, countStart) + 'count:savedEstimates.length||""' + c.substring(countValEnd);
    console.log('[wire-finance-buttons] STEP 8: Updated Estimates section count');
  }
}

const invCountIdx = c.indexOf('key:"inv"');
if (invCountIdx !== -1) {
  const countStart2 = c.indexOf('count:', invCountIdx);
  if (countStart2 !== -1 && countStart2 - invCountIdx < 100) {
    const countValStart2 = countStart2 + 6;
    let countValEnd2 = countValStart2;
    if (c[countValStart2] === '"') {
      countValEnd2 = c.indexOf('"', countValStart2 + 1) + 1;
    } else {
      while (c[countValEnd2] !== ',' && c[countValEnd2] !== '}') countValEnd2++;
    }
    c = c.substring(0, countStart2) + 'count:savedInvoices.length||""' + c.substring(countValEnd2);
    console.log('[wire-finance-buttons] STEP 8: Updated Invoices section count');
  }
}

writeFileSync(file, c);
console.log('[wire-finance-buttons] All patches applied successfully!');

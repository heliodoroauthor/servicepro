import { readFileSync, writeFileSync } from 'fs';
const file = 'src/ServiceProApp.jsx';
let c = readFileSync(file, 'utf8');

const MARKER = '/* FINANCE_BUTTONS_WIRED */';
if (c.includes(MARKER)) {
  console.log('[wire-finance-buttons] Already patched, skipping.');
  process.exit(0);
}

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// STEP 1: Add state variables for saved estimates/invoices lists
// Find a good spot â after invExpand useState (added by add-invoices-section.mjs)
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const invExpandIdx = c.indexOf('var [invExpand, setInvExpand]');
if (invExpandIdx === -1) {
  console.error('[wire-finance-buttons] Cannot find invExpand useState â run add-invoices-section.mjs first');
  process.exit(1);
}
const invExpandEnd = c.indexOf(';', invExpandIdx);
const stateVars = `
${MARKER}
var [savedEstimates, setSavedEstimates] = React.useState([]);
var [savedInvoices, setSavedInvoices] = React.useState([]);
var [financeLoading, setFinanceLoading] = React.useState("");`;
c = c.substring(0, invExpandEnd + 1) + stateVars + c.substring(invExpandEnd + 1);
console.log('[wire-finance-buttons] STEP 1: Added state vars for estimates/invoices lists');

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// STEP 2: Add helper functions â sendEstimateToAPI and sendInvoiceToAPI
// Insert right after the state variables we just added
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const helperInsertIdx = c.indexOf(MARKER) + MARKER.length;
const helperEnd = c.indexOf(';', helperInsertIdx + stateVars.length) + 1;

const helperFunctions = `

async function sendInvoiceToAPI(jobData, clientEmail) {
  setFinanceLoading("invoice");
  try {
    var invNum = "INV-" + Date.now().toString(36).toUpperCase();
    var today = new Date().toLocaleDateString("en-US");
    var due = new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString("en-US");
    var clientName = jobData.client || jobData.clientName || "Customer";
    var jobItems = (jobData.items || []).map(function(it) {
      return { description: it.name || it.description || "Service", qty: it.qty || 1, unitPrice: it.price || it.unitPrice || 0 };
    });
    var subtotal = jobItems.reduce(function(s,it){ return s + (it.qty * it.unitPrice); }, 0);
    var tax = subtotal * 0.0825;
    var total = subtotal + tax;
    var payload = {
      to: clientEmail || jobData.email || "",
      clientName: clientName,
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
      jobId: jobData.id || ""
    };
    var resp = await fetch("/api/send-invoice", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload) });
    var result = await resp.json();
    if (result.ok) {
      setSavedInvoices(function(prev) { return [].concat(prev, [{ number: invNum, date: today, total: total, url: result.cloudinary ? result.cloudinary.url : null, emailed: !!result.messageId, to: clientEmail }]); });
      alert("Invoice " + invNum + " created and sent to " + (clientEmail || "client") + "!");
    } else {
      alert("Error creating invoice: " + (result.error || "Unknown error"));
    }
  } catch(e) {
    alert("Failed to send invoice: " + e.message);
  }
  setFinanceLoading("");
}

async function sendEstimateToAPI(jobData, clientEmail) {
  setFinanceLoading("estimate");
  try {
    var estNum = "EST-" + Date.now().toString(36).toUpperCase();
    var today = new Date().toLocaleDateString("en-US");
    var validUntil = new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString("en-US");
    var clientName = jobData.client || jobData.clientName || "Customer";
    var jobItems = (jobData.items || []).map(function(it) {
      return { description: it.name || it.description || "Service", qty: it.qty || 1, unitPrice: it.price || it.unitPrice || 0 };
    });
    var subtotal = jobItems.reduce(function(s,it){ return s + (it.qty * it.unitPrice); }, 0);
    var tax = subtotal * 0.0825;
    var total = subtotal + tax;
    var payload = {
      to: clientEmail || jobData.email || "",
      clientName: clientName,
      estimateNumber: estNum,
      estimateDate: today,
      validUntil: validUntil,
      items: jobItems,
      subtotal: subtotal,
      tax: tax,
      total: total,
      notes: "This estimate is valid for 30 days.",
      companyName: "ServicePro by TurfCure",
      status: "draft",
      jobId: jobData.id || "",
      jobTitle: jobData.title || ""
    };
    var resp = await fetch("/api/send-estimate", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload) });
    var result = await resp.json();
    if (result.ok) {
      setSavedEstimates(function(prev) { return [].concat(prev, [{ number: estNum, date: today, total: total, url: result.cloudinary ? result.cloudinary.url : null, emailed: !!result.messageId, to: clientEmail }]); });
      alert("Estimate " + estNum + " created and sent to " + (clientEmail || "client") + "!");
    } else {
      alert("Error creating estimate: " + (result.error || "Unknown error"));
    }
  } catch(e) {
    alert("Failed to send estimate: " + e.message);
  }
  setFinanceLoading("");
}
`;

// Insert helper functions after the last state var semicolon
const lastStateVar = c.indexOf('var [financeLoading, setFinanceLoading]');
const lastStateEnd = c.indexOf(';', lastStateVar);
c = c.substring(0, lastStateEnd + 1) + helperFunctions + c.substring(lastStateEnd + 1);
console.log('[wire-finance-buttons] STEP 2: Added sendInvoiceToAPI and sendEstimateToAPI helper functions');

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// STEP 3: Replace the "Create Invoice" button onClick
// FIX: The modal footer has buttons in order: Save Estimate | Create Invoice | Send Estimate
// We anchor on "Save Estimate" first (unique to the modal footer), then find
// "Create Invoice" AFTER that position to target the correct button.
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const saveEstIdx = c.indexOf('Save Estimate');
if (saveEstIdx === -1) {
  console.error('[wire-finance-buttons] Cannot find Save Estimate button text');
  process.exit(1);
}
// Find "Create Invoice" AFTER "Save Estimate" (they are in the same modal footer)
const createInvBtnIdx = c.indexOf('Create Invoice', saveEstIdx);
if (createInvBtnIdx === -1) {
  console.error('[wire-finance-buttons] Cannot find Create Invoice button text after Save Estimate');
  process.exit(1);
}
// Find the button opening tag before it (walk backwards, max 500 chars)
// NOTE: The app uses <Btn> custom component, not <button>
let btnStart = createInvBtnIdx;
const btnSearchLimit = Math.max(0, createInvBtnIdx - 500);
while (btnStart > btnSearchLimit && c.substring(btnStart, btnStart + 4) !== '<Btn') btnStart--;
if (c.substring(btnStart, btnStart + 4) !== '<Btn') {
  console.error('[wire-finance-buttons] Cannot find <Btn before Create Invoice');
  process.exit(1);
}
// Find the onClick in this button (between btnStart and createInvBtnIdx)
const onClickStart = c.indexOf('onClick', btnStart);
if (onClickStart === -1 || onClickStart > createInvBtnIdx) {
  console.error('[wire-finance-buttons] Cannot find onClick for Create Invoice button');
  process.exit(1);
}
let braceDepth = 0;
let ocEnd = onClickStart;
for (let i = onClickStart; i < createInvBtnIdx; i++) {
  if (c[i] === '{') braceDepth++;
  if (c[i] === '}') { braceDepth--; if (braceDepth === 0) { ocEnd = i + 1; break; } }
}
const oldOnClick = c.substring(onClickStart, ocEnd);
console.log('[wire-finance-buttons] STEP 3: Found Create Invoice onClick: ' + oldOnClick.substring(0, 80));
const newOnClick = 'onClick={()=>{var jd=jobs.find(function(jj){return jj.id===selectedJob;})||{};var em=prompt("Enter client email to send invoice:");if(em){sendInvoiceToAPI(jd,em);}}}';
c = c.substring(0, onClickStart) + newOnClick + c.substring(ocEnd);
console.log('[wire-finance-buttons] STEP 3: Rewired Create Invoice button onClick');

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// STEP 4: Replace the "Send Estimate" button onClick
// FIX: Find "Send Estimate" AFTER the "Create Invoice" we just patched
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const sendEstAnchor = c.indexOf('Create Invoice', saveEstIdx); // re-find after STEP 3 patch
const sendEstBtnIdx = c.indexOf('Send Estimate', sendEstAnchor);
if (sendEstBtnIdx === -1) {
  console.error('[wire-finance-buttons] Cannot find Send Estimate button text after Create Invoice');
  process.exit(1);
}
let btnStart2 = sendEstBtnIdx;
const btnSearchLimit2 = Math.max(0, sendEstBtnIdx - 500);
while (btnStart2 > btnSearchLimit2 && c.substring(btnStart2, btnStart2 + 4) !== '<Btn') btnStart2--;
if (c.substring(btnStart2, btnStart2 + 4) !== '<Btn') {
  console.error('[wire-finance-buttons] Cannot find <Btn before Send Estimate');
  process.exit(1);
}
const onClickStart2 = c.indexOf('onClick', btnStart2);
if (onClickStart2 === -1 || onClickStart2 > sendEstBtnIdx) {
  console.error('[wire-finance-buttons] Cannot find onClick for Send Estimate button');
  process.exit(1);
}
let braceDepth2 = 0;
let ocEnd2 = onClickStart2;
for (let i = onClickStart2; i < sendEstBtnIdx; i++) {
  if (c[i] === '{') braceDepth2++;
  if (c[i] === '}') { braceDepth2--; if (braceDepth2 === 0) { ocEnd2 = i + 1; break; } }
}
const oldOnClick2 = c.substring(onClickStart2, ocEnd2);
console.log('[wire-finance-buttons] STEP 4: Found Send Estimate onClick: ' + oldOnClick2.substring(0, 80));
const newOnClick2 = 'onClick={()=>{var jd=jobs.find(function(jj){return jj.id===selectedJob;})||{};var em=prompt("Enter client email to send estimate:");if(em){sendEstimateToAPI(jd,em);}}}';
c = c.substring(0, onClickStart2) + newOnClick2 + c.substring(ocEnd2);
console.log('[wire-finance-buttons] STEP 4: Rewired Send Estimate button onClick');

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// STEP 5: Replace the generic expand-content for est and inv sections
// with a vertical column layout showing saved documents
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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

const estContent = `s.key==="est" ? (
<div style={{display:"flex",flexDirection:"column",gap:12,padding:"12px 0"}}>
{savedEstimates.length === 0 ? (
<div style={{textAlign:"center",padding:"16px 0",color:"#999"}}>
<div style={{fontSize:32,marginBottom:4}}>\u{1F4CB}</div>
<div>No estimates yet. Click "Send Estimate" to generate one.</div>
</div>
) : savedEstimates.map(function(est, idx) { return (
<div key={idx} style={{background:"#f5f7fa",border:"1px solid #e0e0e0",borderRadius:8,padding:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div>
<div style={{fontWeight:"bold",fontSize:14}}>{est.number}</div>
<div style={{color:"#666",fontSize:12}}>{est.date} - \${est.to || "No email"}</div>
</div>
<div style={{display:"flex",gap:8,alignItems:"center"}}>
<span style={{fontWeight:"bold",color:"#1565C0"}}>\${"$"}{est.total ? est.total.toFixed(2) : "0.00"}</span>
{est.emailed && <span style={{background:"#c8e6c9",color:"#2E7D32",padding:"2px 8px",borderRadius:12,fontSize:11}}>Emailed</span>}
{est.url && <a href={est.url} target="_blank" rel="noopener" style={{color:"#1565C0",fontSize:12}}>View PDF</a>}
</div>
</div>
); })}
</div>
) : `;

const invContent = `s.key==="inv" ? (
<div style={{display:"flex",flexDirection:"column",gap:12,padding:"12px 0"}}>
{savedInvoices.length === 0 ? (
<div style={{textAlign:"center",padding:"16px 0",color:"#999"}}>
<div style={{fontSize:32,marginBottom:4}}>\u{1F9FE}</div>
<div>No invoices yet. Click "Create Invoice" to generate one.</div>
</div>
) : savedInvoices.map(function(inv, idx) { return (
<div key={idx} style={{background:"#f5f7fa",border:"1px solid #e0e0e0",borderRadius:8,padding:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div>
<div style={{fontWeight:"bold",fontSize:14}}>{inv.number}</div>
<div style={{color:"#666",fontSize:12}}>{inv.date} - \${inv.to || "No email"}</div>
</div>
<div style={{display:"flex",gap:8,alignItems:"center"}}>
<span style={{fontWeight:"bold",color:"#2E7D32"}}>\${"$"}{inv.total ? inv.total.toFixed(2) : "0.00"}</span>
{inv.emailed && <span style={{background:"#c8e6c9",color:"#2E7D32",padding:"2px 8px",borderRadius:12,fontSize:11}}>Emailed</span>}
{inv.url && <a href={inv.url} target="_blank" rel="noopener" style={{color:"#1565C0",fontSize:12}}>View PDF</a>}
</div>
</div>
); })}
</div>
) : `;

c = c.substring(0, itemsCheckIdx) + estContent + invContent + c.substring(itemsCheckIdx);
console.log('[wire-finance-buttons] STEP 5: Added vertical column layout for Estimates and Invoices sections');

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// STEP 6: Add loading indicator on buttons when financeLoading is active
// Find the Create Invoice button again (after STEP 3 rewired it) and add disabled prop
// We search for our NEW onClick text to identify the correct buttons
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// NOTE: The app uses <Btn> custom component, not <button>
// Insert disabled prop right after the onClick we just replaced
const ciMarker = 'sendInvoiceToAPI(jd,em)';
const ciBtn2 = c.indexOf(ciMarker);
if (ciBtn2 !== -1) {
  let bs = ciBtn2;
  while (bs > 0 && c.substring(bs, bs + 4) !== '<Btn') bs--;
  if (c.substring(bs, bs + 4) === '<Btn') {
    // Insert disabled prop after "<Btn "
    c = c.substring(0, bs + 4) + ' disabled={financeLoading==="invoice"}' + c.substring(bs + 4);
  }
}

const seMarker = 'sendEstimateToAPI(jd,em)';
const seBtn2 = c.indexOf(seMarker);
if (seBtn2 !== -1) {
  let bs2 = seBtn2;
  while (bs2 > 0 && c.substring(bs2, bs2 + 4) !== '<Btn') bs2--;
  if (c.substring(bs2, bs2 + 4) === '<Btn') {
    c = c.substring(0, bs2 + 4) + ' disabled={financeLoading==="estimate"}' + c.substring(bs2 + 4);
  }
}
console.log('[wire-finance-buttons] STEP 6: Added loading/disabled states to buttons');

writeFileSync(file, c);
console.log('[wire-finance-buttons] All patches applied successfully!');

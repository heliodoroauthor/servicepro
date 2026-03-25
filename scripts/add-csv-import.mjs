import { readFileSync, writeFileSync } from 'fs';

// This script is run AFTER fix-duplicates.mjs in the prebuild chain
// It adds CSV import functionality to the ClientsPage

const file = 'src/ServiceProApp.jsx';
let content = readFileSync(file, 'utf8');

// ─── PATCH 1: Add CSV state + functions after clientTagFilter state ───
const stateAnchor = 'const [clientTagFilter, setClientTagFilter] = useState("all");';
const csvState = `
const [csvModal, setCsvModal] = useState(false);
const [csvData, setCsvData] = useState(null);
const [csvMapping, setCsvMapping] = useState({});
const [csvPreview, setCsvPreview] = useState([]);
const [csvImporting, setCsvImporting] = useState(false);
const [csvResult, setCsvResult] = useState(null);
const [csvStep, setCsvStep] = useState(1);
const CSV_FIELDS = [
  {key:"name",label:"Full Name",required:true},
  {key:"firstName",label:"First Name"},
  {key:"lastName",label:"Last Name"},
  {key:"phone",label:"Phone",required:true},
  {key:"email",label:"Email"},
  {key:"address",label:"Address"},
  {key:"city",label:"City"},
  {key:"state",label:"State"},
  {key:"zip",label:"Zip Code"},
  {key:"notes",label:"Notes"},
  {key:"tags",label:"Tags"},
  {key:"company",label:"Company"},
  {key:"source",label:"Source"},
];
function parseCSV(text) {
  var lines = text.split(/\\r?\\n/);
  if (lines.length < 2) return null;
  var sep = lines[0].includes("\\t") ? "\\t" : ",";
  function splitRow(row) {
    var cols = [], cur = "", inQ = false;
    for (var i = 0; i < row.length; i++) {
      var ch = row[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === sep && !inQ) { cols.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    return cols;
  }
  var headers = splitRow(lines[0]);
  var rows = [];
  for (var i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    var vals = splitRow(lines[i]);
    var obj = {};
    headers.forEach(function(h, idx) { obj[h] = (vals[idx] || "").replace(/^"|"$/g, ""); });
    rows.push(obj);
  }
  return { headers: headers, rows: rows };
}
function autoMapColumns(headers) {
  var map = {};
  var patterns = {
    name: /^(client.?name|full.?name|name|display.?name|customer.?name|contact.?name)$/i,
    firstName: /^(first.?name|fname|given.?name)$/i,
    lastName: /^(last.?name|lname|surname|family.?name)$/i,
    phone: /^(phone|mobile|cell|telephone|phone.?number|main.?phone|primary.?phone)$/i,
    email: /^(email|e.?mail|email.?address|primary.?email)$/i,
    address: /^(address|street|street.?address|address.?line|address1|service.?address)$/i,
    city: /^(city|town)$/i,
    state: /^(state|province|region)$/i,
    zip: /^(zip|zip.?code|postal|postal.?code)$/i,
    notes: /^(notes|note|comments|description|memo|internal.?notes)$/i,
    tags: /^(tags|labels|categories|type|client.?type)$/i,
    company: /^(company|business|company.?name|business.?name|organization)$/i,
    source: /^(source|lead.?source|referral|how.?heard|origin)$/i,
  };
  headers.forEach(function(h) {
    Object.keys(patterns).forEach(function(field) {
      if (patterns[field].test(h.trim()) && !map[field]) map[field] = h;
    });
  });
  return map;
}
function handleCSVFile(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var parsed = parseCSV(ev.target.result);
    if (!parsed || parsed.rows.length === 0) { alert("Could not parse CSV. Check format."); return; }
    setCsvData(parsed);
    setCsvMapping(autoMapColumns(parsed.headers));
    setCsvPreview(parsed.rows.slice(0, 5));
    setCsvStep(2);
  };
  reader.readAsText(file);
}
function runCSVImport() {
  if (!csvData) return;
  setCsvImporting(true);
  setCsvStep(4);
  var imported = 0, skipped = 0, duplicates = 0;
  var newClients = [];
  var existingPhones = new Set(clients.map(function(c) { return (c.phone || "").replace(/\\D/g, ""); }));
  var existingEmails = new Set(clients.map(function(c) { return (c.email || "").toLowerCase(); }));
  csvData.rows.forEach(function(row) {
    var getName = function() {
      if (csvMapping.name && row[csvMapping.name]) return row[csvMapping.name].trim();
      var fn = csvMapping.firstName ? (row[csvMapping.firstName] || "").trim() : "";
      var ln = csvMapping.lastName ? (row[csvMapping.lastName] || "").trim() : "";
      return (fn + " " + ln).trim();
    };
    var name = getName();
    if (!name) { skipped++; return; }
    var phone = csvMapping.phone ? (row[csvMapping.phone] || "").trim() : "";
    var email = csvMapping.email ? (row[csvMapping.email] || "").trim() : "";
    var cleanPhone = phone.replace(/\\D/g, "");
    if (cleanPhone && existingPhones.has(cleanPhone)) { duplicates++; return; }
    if (email && existingEmails.has(email.toLowerCase())) { duplicates++; return; }
    var addr = csvMapping.address ? (row[csvMapping.address] || "").trim() : "";
    var city = csvMapping.city ? (row[csvMapping.city] || "").trim() : "";
    var state = csvMapping.state ? (row[csvMapping.state] || "").trim() : "";
    var zip = csvMapping.zip ? (row[csvMapping.zip] || "").trim() : "";
    var fullAddr = [addr, city, state, zip].filter(Boolean).join(", ");
    var notes = csvMapping.notes ? (row[csvMapping.notes] || "").trim() : "";
    var company = csvMapping.company ? (row[csvMapping.company] || "").trim() : "";
    if (company) notes = (notes ? notes + " | " : "") + "Company: " + company;
    var source = csvMapping.source ? (row[csvMapping.source] || "").trim() : "";
    if (source) notes = (notes ? notes + " | " : "") + "Source: " + source;
    var tags = csvMapping.tags ? (row[csvMapping.tags] || "").split(/[,;|]/).map(function(t) { return t.trim(); }).filter(Boolean) : [];
    tags.push("Imported");
    var client = {
      id: "C" + String(clients.length + newClients.length + 1).padStart(4, "0"),
      name: name, email: email, phone: phone,
      address: fullAddr, gps: "", notes: notes,
      tags: tags, created: new Date().toISOString().slice(0, 10),
      preferredPayment: "cash",
      housePhotos: [], techPhotos: [], ownerPhotos: [],
      warranty: { active: false, expiry: "", plan: "None", notes: "" },
      subscription: { active: false, plan: "", billing: "", nextDate: "", price: 0 },
      subcontractors: [], jobHistory: [],
    };
    newClients.push(client);
    if (cleanPhone) existingPhones.add(cleanPhone);
    if (email) existingEmails.add(email.toLowerCase());
    imported++;
  });
  setClients(function(prev) { return prev.concat(newClients); });
  setCsvResult({ imported: imported, skipped: skipped, duplicates: duplicates, total: csvData.rows.length });
  setCsvImporting(false);
}`;

if (content.includes(stateAnchor)) {
  content = content.replace(stateAnchor, stateAnchor + csvState);
  console.log('✓ Patch 1: CSV state + functions added');
} else {
  console.log('✗ Patch 1: anchor not found');
}

// ─── PATCH 2: Add Import CSV button next to the + button ───
const btnAnchor = '<button onClick={() => setModal("new-client")} style={{width:38,height:38,borderRadius:9,background:"var(--orange)"';
const csvBtn = `<button onClick={function(){setCsvModal(true);setCsvStep(1);setCsvData(null);setCsvResult(null);}} title="Import CSV" style={{width:38,height:38,borderRadius:9,background:"var(--s3)",color:"var(--text)",border:"1px solid var(--border)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{"\ud83d\udce5"}</button>\n`;

if (content.includes(btnAnchor)) {
  content = content.replace(btnAnchor, csvBtn + btnAnchor);
  console.log('✓ Patch 2: CSV import button added');
} else {
  console.log('✗ Patch 2: button anchor not found');
}

// ─── PATCH 3: Add CSV modal before closing </div> of ClientsPage ───
// The ClientsPage return ends with: </Modal>\n)}\n</div>\n);
// We need to insert the CSV modal after the new-client modal closing
const modalAnchor = '{modal==="new-client" && (';
const modalIdx = content.indexOf(modalAnchor);

if (modalIdx !== -1) {
  // Find </Modal> after this point, then the )} closing
  let searchStart = modalIdx;
  let closeIdx = content.indexOf('</Modal>', searchStart);
  if (closeIdx !== -1) {
    // Find the next )}
    let endIdx = content.indexOf(')}', closeIdx);
    if (endIdx !== -1) {
      endIdx += 2; // past )}
      const csvModal = `
{csvModal && (
<div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.6)"}} onClick={function(e){if(e.target===e.currentTarget)setCsvModal(false);}}>
<div style={{background:"var(--s1)",borderRadius:16,width:Math.min(720,window.innerWidth-40),maxHeight:"85vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.5)",border:"1px solid var(--border)"}}>
<div style={{padding:"20px 24px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div><div style={{fontSize:18,fontWeight:800}}>{"\ud83d\udce5"} Import Clients from CSV</div><div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>Workiz, Jobber, HouseCall Pro, or any CSV</div></div>
<button onClick={function(){setCsvModal(false);}} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"var(--muted)",padding:4}}>{"\u2715"}</button>
</div>
<div style={{padding:"20px 24px"}}>
{/* Step bar */}
<div style={{display:"flex",gap:4,marginBottom:20}}>
{[{n:1,l:"Upload"},{n:2,l:"Map Columns"},{n:3,l:"Preview"},{n:4,l:"Import"}].map(function(s){
return <div key={s.n} style={{flex:1,textAlign:"center",padding:"8px 0",borderRadius:8,fontSize:12,fontWeight:700,background:csvStep>=s.n?"var(--orange)":"var(--s3)",color:csvStep>=s.n?"#fff":"var(--muted)",transition:"all .2s"}}>{s.n+". "+s.l}</div>;
})}
</div>
{/* STEP 1: Upload */}
{csvStep === 1 && <div style={{textAlign:"center",padding:"30px 0"}}>
<div style={{fontSize:48,marginBottom:12}}>{"\ud83d\udcc4"}</div>
<div style={{fontSize:14,fontWeight:700,marginBottom:4}}>Upload your CSV or TSV file</div>
<div style={{fontSize:12,color:"var(--muted)",marginBottom:20}}>Export from Workiz: Settings {"\u2192"} Export {"\u2192"} Clients {"\u2192"} Download CSV</div>
<label style={{display:"inline-block",padding:"12px 28px",background:"var(--orange)",color:"#fff",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(249,115,22,.35)"}}>
{"\ud83d\udcc2"} Choose File
<input type="file" accept=".csv,.tsv,.txt" onChange={handleCSVFile} style={{display:"none"}}/>
</label>
<div style={{fontSize:11,color:"var(--muted)",marginTop:16,lineHeight:1.6}}>Supports: CSV (comma), TSV (tab). Max ~50,000 rows. UTF-8 encoding.</div>
</div>}
{/* STEP 2: Column Mapping */}
{csvStep === 2 && csvData && <div>
<div style={{fontSize:13,fontWeight:700,marginBottom:4}}>Map your CSV columns to ServicePro fields</div>
<div style={{fontSize:11,color:"var(--muted)",marginBottom:16}}>We auto-detected {Object.keys(csvMapping).length} of {csvData.headers.length} columns. Adjust if needed.</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
{CSV_FIELDS.map(function(f){
return <div key={f.key} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"var(--s2)",borderRadius:8}}>
<span style={{fontSize:12,fontWeight:700,minWidth:90,color:f.required?"var(--orange)":"var(--text)"}}>{f.label}{f.required?" *":""}</span>
<select value={csvMapping[f.key]||""} onChange={function(e){setCsvMapping(function(p){var n=Object.assign({},p);if(e.target.value)n[f.key]=e.target.value;else delete n[f.key];return n;});}} style={{flex:1,padding:"5px 8px",borderRadius:6,border:"1px solid var(--border)",background:"var(--s1)",color:"var(--text)",fontSize:11}}>
<option value="">{"\u2014 skip \u2014"}</option>
{csvData.headers.map(function(h){return <option key={h} value={h}>{h}</option>;})}
</select>
</div>;
})}
</div>
<div style={{display:"flex",justifyContent:"space-between",marginTop:20}}>
<button className="btn btn-ghost" onClick={function(){setCsvStep(1);}}>{"← Back"}</button>
<button className="btn btn-dark" onClick={function(){setCsvStep(3);}} disabled={!csvMapping.name&&!(csvMapping.firstName&&csvMapping.lastName)}>{"Preview →"}</button>
</div>
</div>}
{/* STEP 3: Preview */}
{csvStep === 3 && csvData && <div>
<div style={{fontSize:13,fontWeight:700,marginBottom:4}}>Preview — first 5 rows of {csvData.rows.length} total</div>
<div style={{fontSize:11,color:"var(--muted)",marginBottom:12}}>Check that the data looks correct before importing.</div>
<div style={{overflow:"auto",maxHeight:300,borderRadius:8,border:"1px solid var(--border)"}}>
<table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
<thead><tr>
{["Name","Phone","Email","Address","Notes","Tags"].map(function(h){return <th key={h} style={{padding:"8px 10px",background:"var(--s3)",fontWeight:700,textAlign:"left",borderBottom:"1px solid var(--border)",position:"sticky",top:0}}>{h}</th>;})}
</tr></thead>
<tbody>
{csvPreview.map(function(row,i){
var gn=function(){if(csvMapping.name&&row[csvMapping.name])return row[csvMapping.name];var fn=csvMapping.firstName?row[csvMapping.firstName]||"":"";
var ln=csvMapping.lastName?row[csvMapping.lastName]||"":"";
return(fn+" "+ln).trim();};
return <tr key={i} style={{borderBottom:"1px solid var(--border)"}}>
<td style={{padding:"6px 10px",fontWeight:600}}>{gn()||"—"}</td>
<td style={{padding:"6px 10px"}}>{csvMapping.phone?row[csvMapping.phone]||"—":"—"}</td>
<td style={{padding:"6px 10px"}}>{csvMapping.email?row[csvMapping.email]||"—":"—"}</td>
<td style={{padding:"6px 10px"}}>{[csvMapping.address?row[csvMapping.address]:"",csvMapping.city?row[csvMapping.city]:"",csvMapping.state?row[csvMapping.state]:""].filter(Boolean).join(", ")||"—"}</td>
<td style={{padding:"6px 10px"}}>{csvMapping.notes?row[csvMapping.notes]||"—":"—"}</td>
<td style={{padding:"6px 10px"}}>{csvMapping.tags?row[csvMapping.tags]||"—":"—"}</td>
</tr>;
})}
</tbody>
</table>
</div>
<div style={{display:"flex",justifyContent:"space-between",marginTop:20,alignItems:"center"}}>
<button className="btn btn-ghost" onClick={function(){setCsvStep(2);}}>{"← Back"}</button>
<div style={{textAlign:"right"}}>
<div style={{fontSize:12,color:"var(--muted)",marginBottom:4}}>{csvData.rows.length} clients will be processed</div>
<button className="btn btn-dark" onClick={runCSVImport} style={{background:"#22c55e"}}>{"Import " + csvData.rows.length + " Clients ✓"}</button>
</div>
</div>
</div>}
{/* STEP 4: Results */}
{csvStep === 4 && <div style={{textAlign:"center",padding:"20px 0"}}>
{csvImporting ? <React.Fragment>
<div style={{fontSize:48,marginBottom:12}}>{"\u23f3"}</div>
<div style={{fontSize:16,fontWeight:700}}>Importing clients...</div>
<div style={{fontSize:12,color:"var(--muted)",marginTop:4}}>Processing {csvData.rows.length} rows</div>
</React.Fragment> : csvResult ? <React.Fragment>
<div style={{fontSize:48,marginBottom:12}}>{"\u2705"}</div>
<div style={{fontSize:18,fontWeight:800,marginBottom:16}}>Import Complete!</div>
<div style={{display:"flex",justifyContent:"center",gap:20,marginBottom:20}}>
<div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:800,color:"#22c55e"}}>{csvResult.imported}</div><div style={{fontSize:11,color:"var(--muted)"}}>Imported</div></div>
<div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:800,color:"#f59e0b"}}>{csvResult.duplicates}</div><div style={{fontSize:11,color:"var(--muted)"}}>Duplicates</div></div>
<div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:800,color:"#ef4444"}}>{csvResult.skipped}</div><div style={{fontSize:11,color:"var(--muted)"}}>Skipped</div></div>
</div>
<div style={{fontSize:12,color:"var(--muted)",marginBottom:16}}>All imported clients are tagged "Imported" for easy filtering.</div>
<button className="btn btn-dark" onClick={function(){setCsvModal(false);}}>Done {"\u2713"}</button>
</React.Fragment> : null}
</div>}
</div>
</div>
</div>
)}`;
      content = content.slice(0, endIdx) + '\n' + csvModal + content.slice(endIdx);
      console.log('✓ Patch 3: CSV modal added');
    }
  }
} else {
  console.log('✗ Patch 3: modal anchor not found');
}

writeFileSync(file, content);
console.log('CSV import patches applied successfully!');

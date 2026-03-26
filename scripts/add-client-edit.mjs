import { readFileSync, writeFileSync } from 'fs';

// This script patches ServiceProApp.jsx to add client editing functionality.
// Adds an "Editar" button next to Call/Text/Invoice in the client header,
// and a Modal form to edit all client fields (name, email, phone, address, etc.).
// Run AFTER add-click-to-call.mjs in the prebuild chain.

const file = 'src/ServiceProApp.jsx';
let content = readFileSync(file, 'utf8');

// Helper: find a function body using brace-depth tracking
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

// PATCH 1: Add editing states after ctab state
const editStates = '  const [editingClient, setEditingClient] = useState(false);\n  const [editForm, setEditForm] = useState({});\n';
const ctabIdx = content.indexOf('const [ctab, setCtab] = useState(');
if (ctabIdx !== -1) {
  const eol = content.indexOf('\n', ctabIdx);
  if (eol !== -1) {
    content = content.slice(0, eol + 1) + editStates + content.slice(eol + 1);
    console.log('[add-client-edit] PATCH 1: Injected editing states after ctab');
  }
} else {
  console.warn('[add-client-edit] WARNING: Could not find ctab state');
}

// PATCH 2: Add startEditClient + saveEditClient functions
const editFunctions = `
  function startEditClient() {
    if(!selC) return;
    const parts = (selC.name||"").split(" ");
    setEditForm({
      firstName: selC.firstName || parts[0] || "",
      lastName: selC.lastName || parts.slice(1).join(" ") || "",
      email: selC.email || "",
      phone: selC.phone || "",
      address: selC.address || "",
      gps: selC.gps || "",
      notes: selC.notes || "",
      type: selC.type || "Individual",
    });
    setEditingClient(true);
  }
  function saveEditClient() {
    const nm = [editForm.firstName, editForm.lastName].filter(Boolean).join(" ");
    setClients(p => p.map(c => c.id===sel ? {
      ...c, name: nm,
      firstName: editForm.firstName, lastName: editForm.lastName,
      email: editForm.email, phone: editForm.phone,
      address: editForm.address, gps: editForm.gps,
      notes: editForm.notes, type: editForm.type,
    } : c));
    setEditingClient(false);
  }`;

// Try to insert after callClient (injected by add-click-to-call.mjs)
let fnInserted = false;
const callClientRange = findFunctionRange(content, 'callClient');
if (callClientRange) {
  content = content.slice(0, callClientRange.end) + '\n' + editFunctions + '\n' + content.slice(callClientRange.end);
  fnInserted = true;
  console.log('[add-client-edit] PATCH 2: Injected editing functions after callClient');
}
if (!fnInserted) {
  const sendSmsRange = findFunctionRange(content, 'sendSms');
  if (sendSmsRange) {
    content = content.slice(0, sendSmsRange.end) + '\n' + editFunctions + '\n' + content.slice(sendSmsRange.end);
    fnInserted = true;
    console.log('[add-client-edit] PATCH 2: Injected editing functions after sendSms (fallback)');
  }
}
if (!fnInserted) {
  console.error('[add-client-edit] ERROR: Could not find insertion point for functions!');
  process.exit(1);
}

// PATCH 3: Add "Editar" button after Invoice button
const invoiceMarker = '\u{1F4C4} Invoice</button>';
const invoiceIdx = content.indexOf(invoiceMarker);
if (invoiceIdx !== -1) {
  const afterInvoice = invoiceIdx + invoiceMarker.length;
  const editButton = '<button className="client-qa-btn" onClick={startEditClient}>\u270F\uFE0F Editar</button>';
  content = content.slice(0, afterInvoice) + editButton + content.slice(afterInvoice);
  console.log('[add-client-edit] PATCH 3: Added Editar button after Invoice');
} else {
  console.warn('[add-client-edit] WARNING: Could not find Invoice button');
}

// PATCH 4: Add edit Modal before pets tab
const editModal = `{editingClient && <Modal title="Editar Cliente" onClose={()=>setEditingClient(false)} foot={<><Btn cls="btn-ghost" onClick={()=>setEditingClient(false)}>Cancelar</Btn><Btn onClick={saveEditClient}>Guardar Cambios</Btn></>}>
              <div className="g2">
                <div className="fg"><label>Nombre</label><input className="inp" value={editForm.firstName||""} onChange={e=>setEditForm(p=>({...p,firstName:e.target.value}))}/></div>
                <div className="fg"><label>Apellido</label><input className="inp" value={editForm.lastName||""} onChange={e=>setEditForm(p=>({...p,lastName:e.target.value}))}/></div>
                <div className="fg"><label>Email</label><input className="inp" type="email" value={editForm.email||""} onChange={e=>setEditForm(p=>({...p,email:e.target.value}))}/></div>
                <div className="fg"><label>Tel\u00E9fono</label><input className="inp" value={editForm.phone||""} onChange={e=>setEditForm(p=>({...p,phone:e.target.value}))}/></div>
                <div className="fg" style={{gridColumn:"span 2"}}><label>Direcci\u00F3n</label><input className="inp" value={editForm.address||""} onChange={e=>setEditForm(p=>({...p,address:e.target.value}))}/></div>
                <div className="fg"><label>GPS</label><input className="inp" value={editForm.gps||""} onChange={e=>setEditForm(p=>({...p,gps:e.target.value}))}/></div>
                <div className="fg"><label>Tipo</label><select className="inp" value={editForm.type||"Individual"} onChange={e=>setEditForm(p=>({...p,type:e.target.value}))}><option>Individual</option><option>Commercial</option></select></div>
                <div className="fg" style={{gridColumn:"span 2"}}><label>Notas</label><textarea className="inp" rows={3} value={editForm.notes||""} onChange={e=>setEditForm(p=>({...p,notes:e.target.value}))}/></div>
              </div>
            </Modal>}
            `;

const petsMarker = 'ctab==="pets"';
const petsIdx = content.indexOf(petsMarker);
if (petsIdx !== -1) {
  let j = petsIdx - 1;
  while (j >= 0 && content[j] !== '{') j--;
  if (j >= 0) {
    content = content.slice(0, j) + editModal + content.slice(j);
    console.log('[add-client-edit] PATCH 4: Added edit Modal before pets tab');
  }
} else {
  console.warn('[add-client-edit] WARNING: Could not find pets tab marker');
}

writeFileSync(file, content);
console.log('[add-client-edit] All client edit patches applied successfully!');

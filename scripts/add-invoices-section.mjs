import { readFileSync, writeFileSync } from 'fs';
const file = 'src/ServiceProApp.jsx';
let c = readFileSync(file, 'utf8');
if (c.includes('key:"inv",label:"Invoices"')) { console.log('[add-invoices-section] Already wired up, skipping.'); process.exit(0); }
const estIdx = c.indexOf('label:"Estimates"');
if (estIdx === -1) { console.error('[add-invoices-section] Cannot find Estimates'); process.exit(1); }
const expB = c.lastIndexOf('expand:', estIdx);
const expVar = c.substring(expB + 7).match(/^(\w+)/)[1];
const setExpI = c.indexOf('setExpand:', expB);
const setExpVar = c.substring(setExpI + 10).match(/^(\w+)/)[1];
const pats = [`[${expVar}, ${setExpVar}] = React.useState(false)`, `[${expVar},${setExpVar}] = React.useState(false)`, `[${expVar},${setExpVar}]=React.useState(false)`];
let done = false;
for (const p of pats) { const i = c.indexOf(p); if (i !== -1) { let e = c.indexOf(';', i); c = c.substring(0, e+1) + '\nvar [invExpand, setInvExpand] = React.useState(false);' + c.substring(e+1); done = true; break; } }
if (!done) { const lu = c.lastIndexOf('React.useState(false)', estIdx); if (lu !== -1) { let e = c.indexOf(';', lu); c = c.substring(0, e+1) + '\nvar [invExpand, setInvExpand] = React.useState(false);' + c.substring(e+1); done = true; } }
if (!done) { console.error('[add-invoices-section] Could not add useState'); process.exit(1); }
console.log('[add-invoices-section] STEP 1: Added invExpand useState');
const tIdx = c.indexOf('key:"time"');
if (tIdx === -1) { console.error('[add-invoices-section] Cannot find key:"time"'); process.exit(1); }
let b = tIdx - 1; while (b > 0 && c[b] !== '{') b--;
c = c.substring(0, b) + '{key:"inv",label:"Invoices",icon:"\uD83E\uDDFE",count:"",expand:invExpand,setExpand:setInvExpand},\n' + c.substring(b);
console.log('[add-invoices-section] STEP 2: Inserted Invoices between Estimates and Time sheets');
writeFileSync(file, c);
console.log('[add-invoices-section] All patches applied!');

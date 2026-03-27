import { readFileSync, writeFileSync } from 'fs';

const file = 'src/ServiceProApp.jsx';
let c = readFileSync(file, 'utf8');

if (c.includes('TieredOptions')) {
  console.log('[add-tier-ui] Already wired up, skipping.');
  process.exit(0);
}

// 1. Add import after the React import line
const importAnchor = 'from "react";';
const importIdx = c.indexOf(importAnchor);
if (importIdx === -1) { console.log('[add-tier-ui] Cannot find React import.'); process.exit(0); }
const importEnd = importIdx + importAnchor.length;
c = c.substring(0, importEnd) + '\nimport TieredOptions from "./TieredOptions";' + c.substring(importEnd);
console.log('[add-tier-ui] Step 1: Added TieredOptions import.');

// 2. Add state variables after estItems state
const stateAnchor = 'const [estItems, setEstItems] = useState([]);';
const stateIdx = c.indexOf(stateAnchor);
if (stateIdx === -1) { console.log('[add-tier-ui] Cannot find estItems state.'); process.exit(0); }
const stateEnd = stateIdx + stateAnchor.length;
c = c.substring(0, stateEnd) + '\nconst [enableTiers, setEnableTiers] = useState(false);\nconst [tierItems, setTierItems] = useState({basic:[],standard:[],premium:[]});' + c.substring(stateEnd);
console.log('[add-tier-ui] Step 2: Added tier state variables.');

// 3. Add TieredOptions component in the items section, before </>)} that closes it
const tdAnchor = '["Total","$0.00"],["Due","$0.00"]';
const tdIdx = c.indexOf(tdAnchor);
if (tdIdx === -1) { console.log('[add-tier-ui] Cannot find Total/Due section.'); process.exit(0); }
const closeIdx = c.indexOf('</>(\u{29)}', tdIdx);
const closeAlt = c.indexOf('</>)}', tdIdx);
const insertAt = closeAlt !== -1 ? closeAlt : closeIdx;
if (insertAt === -1) { console.log('[add-tier-ui] Cannot find items block closing.'); process.exit(0); }
c = c.substring(0, insertAt) + '<TieredOptions enableTiers={enableTiers} setEnableTiers={setEnableTiers} tierItems={tierItems} setTierItems={setTierItems}/>\n' + c.substring(insertAt);
console.log('[add-tier-ui] Step 3: Added TieredOptions component to items section.');

writeFileSync(file, c);
console.log('[add-tier-ui] Done! File written.');

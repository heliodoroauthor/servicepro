import { readFileSync, writeFileSync } from 'fs';

// Injects IvrPanel into the SETTINGS page of ServiceProApp.jsx during Vercel prebuild.
// Placement: as a new "IVR" tab in the Settings page STABS array,
// with the panel JSX rendered when the IVR tab is selected.

const file = 'src/ServiceProApp.jsx';
let c = readFileSync(file, 'utf8');

if (c.includes('IvrPanel')) {
  console.log('[add-ivr-panel] Already wired up, skipping.');
  process.exit(0);
}

// STEP 1: Add import after the React import line
const importAnchor = 'from "react";';
const importIdx = c.indexOf(importAnchor);
if (importIdx === -1) {
  console.log('[add-ivr-panel] Cannot find React import anchor.');
  process.exit(0);
}
const importEnd = importIdx + importAnchor.length;
c = c.substring(0, importEnd) + '\nimport IvrPanel from "./IvrPanel";' + c.substring(importEnd);
console.log('[add-ivr-panel] STEP 1: Added IvrPanel import');

// STEP 2: Add "IVR" tab to the STABS array in Settings page
const escalationTab = 'id:"escalation"';
const syncTab = 'id:"sync"';

let tabAnchor = null;
let tabAnchorIdx = -1;

if (c.includes(escalationTab)) {
  tabAnchorIdx = c.indexOf(escalationTab);
  tabAnchor = 'escalation';
} else {
  tabAnchorIdx = c.indexOf(syncTab);
  tabAnchor = 'sync';
}

if (tabAnchorIdx !== -1) {
  const closeBrace = c.indexOf('}', tabAnchorIdx);
  if (closeBrace !== -1) {
    const insertAt = closeBrace + 1;
    const ivrTab = ',\n{id:"ivr", label:"IVR System", icon:"\uD83D\uDCDE"}';
    c = c.substring(0, insertAt) + ivrTab + c.substring(insertAt);
    console.log(`[add-ivr-panel] STEP 2: Added IVR tab to STABS (after ${tabAnchor})`);
  }
} else {
  console.log('[add-ivr-panel] WARNING: Could not find STABS tab anchor');
}

// STEP 3: Add IvrPanel JSX in the Settings page tab panels
const syncComment = '{/* -- SYNC & OFFLINE -- */}';
const syncCommentIdx = c.indexOf(syncComment);

if (syncCommentIdx !== -1) {
  const ivrPanel = `{/* -- IVR SYSTEM -- */}
{stab === "ivr" && (
<div style={{paddingTop:8}}>
<IvrPanel/>
</div>
)}
`;
  c = c.substring(0, syncCommentIdx) + ivrPanel + c.substring(syncCommentIdx);
  console.log('[add-ivr-panel] STEP 3: Added IvrPanel JSX in Settings tab panels');
} else {
  const escComment = '{/* -- ESCALATION -- */}';
  const escIdx = c.indexOf(escComment);
  if (escIdx !== -1) {
    const ivrPanel = `{/* -- IVR SYSTEM -- */}
{stab === "ivr" && (
<div style={{paddingTop:8}}>
<IvrPanel/>
</div>
)}
`;
    c = c.substring(0, escIdx) + ivrPanel + c.substring(escIdx);
    console.log('[add-ivr-panel] STEP 3: Added IvrPanel JSX (before ESCALATION marker)');
  } else {
    console.error('[add-ivr-panel] ERROR: Could not find Settings page panel marker');
    process.exit(1);
  }
}

writeFileSync(file, c);
console.log('[add-ivr-panel] All IVR panel patches applied successfully!');

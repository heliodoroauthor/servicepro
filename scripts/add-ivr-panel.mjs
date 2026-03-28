import { readFileSync, writeFileSync } from 'fs';

// ââ add-ivr-panel.mjs ââ
// Injects IvrPanel into ServiceProApp.jsx during Vercel prebuild.
// Placement: on the Finance tab, AFTER AiBundlePanel and BEFORE TieredOptions.

const file = 'src/ServiceProApp.jsx';
let c = readFileSync(file, 'utf8');

if (c.includes('IvrPanel')) {
  console.log('[add-ivr-panel] Already wired up, skipping.');
  process.exit(0);
}

// ââ Step 1: Add import after the React import line ââ
const importAnchor = 'from "react";';
const importIdx = c.indexOf(importAnchor);
if (importIdx === -1) {
  console.log('[add-ivr-panel] Cannot find React import anchor.');
  process.exit(0);
}
const importEnd = importIdx + importAnchor.length;
c = c.substring(0, importEnd) + '\nimport IvrPanel from "./IvrPanel";' + c.substring(importEnd);
console.log('[add-ivr-panel] Step 1: Added IvrPanel import.');

// ââ Step 2: Insert <IvrPanel/> into the Finance tab ââ
// Try placing AFTER AiBundlePanel (if it exists) and BEFORE TieredOptions.
// Fallback: before EXPANDABLE SECTIONS comment.
const anchors = [
  { text: '<TieredOptions ', before: true },
  { text: '{/* -- EXPANDABLE SECTIONS -- */}', before: true },
];

let inserted = false;

// If AiBundlePanel component tag exists, insert right AFTER its closing />
const aiBundleTag = '<AiBundlePanel ';
const aiBundleIdx = c.indexOf(aiBundleTag);
if (aiBundleIdx !== -1) {
  // Find the end of the self-closing tag "/>"\n
  const closeIdx = c.indexOf('/>', aiBundleIdx);
  if (closeIdx !== -1) {
    const insertAt = closeIdx + 2; // after "/>"
    c = c.substring(0, insertAt) + '\n<IvrPanel/>' + c.substring(insertAt);
    inserted = true;
    console.log('[add-ivr-panel] Step 2: Inserted IvrPanel after AiBundlePanel.');
  }
}

if (!inserted) {
  for (const anchor of anchors) {
    const idx = c.indexOf(anchor.text);
    if (idx !== -1) {
      c = c.substring(0, idx) + '<IvrPanel/>\n' + c.substring(idx);
      inserted = true;
      console.log(`[add-ivr-panel] Step 2: Inserted IvrPanel before "${anchor.text.substring(0, 30)}...".`);
      break;
    }
  }
}

if (!inserted) {
  console.log('[add-ivr-panel] Could not find insertion point. Skipping.');
  process.exit(0);
}

writeFileSync(file, c);
console.log('[add-ivr-panel] Done! File written.');

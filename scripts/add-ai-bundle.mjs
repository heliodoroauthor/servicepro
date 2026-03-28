import { readFileSync, writeFileSync } from 'fs';

const file = 'src/ServiceProApp.jsx';
let c = readFileSync(file, 'utf8');

if (c.includes('AiBundlePanel')) {
  console.log('[add-ai-bundle] Already wired up, skipping.');
  process.exit(0);
}

// 1. Add import after the React import line
const importAnchor = 'from "react";';
const importIdx = c.indexOf(importAnchor);
if (importIdx === -1) { console.log('[add-ai-bundle] Cannot find React import.'); process.exit(0); }
const importEnd = importIdx + importAnchor.length;
c = c.substring(0, importEnd) + '\nimport AiBundlePanel from "./AiBundlePanel";' + c.substring(importEnd);
console.log('[add-ai-bundle] Step 1: Added AiBundlePanel import.');

// 2. Insert the component right before TieredOptions or EXPANDABLE SECTIONS
const tieredAnchor = '<TieredOptions ';
const sectionAnchor = '{/* -- EXPANDABLE SECTIONS -- */}';
let insertAnchor = tieredAnchor;
let insertIdx = c.indexOf(insertAnchor);
if (insertIdx === -1) {
  insertAnchor = sectionAnchor;
  insertIdx = c.indexOf(insertAnchor);
}
if (insertIdx === -1) { console.log('[add-ai-bundle] Cannot find insertion point.'); process.exit(0); }

const component = '<AiBundlePanel estItems={estItems} setEstItems={setEstItems}/>\n';
c = c.substring(0, insertIdx) + component + c.substring(insertIdx);
console.log('[add-ai-bundle] Step 2: Added AiBundlePanel component to Finance tab.');

writeFileSync(file, c);
console.log('[add-ai-bundle] Done! File written.');

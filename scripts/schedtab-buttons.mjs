#!/usr/bin/env node
/**
 * schedtab-buttons.mjs
 * Prebuild script to make the schedule-tab buttons (Calendar, Recurring, AI, List)
 * bigger with proper text labels and icons.
 */
import { readFileSync, writeFileSync } from 'fs';
const FILE = 'src/ServiceProApp.jsx';
let c = readFileSync(FILE, 'utf8');

const MARKER = '/* SCHEDTAB_BUTTONS_V1 */';
if (c.includes(MARKER)) {
  console.log('[schedtab-buttons] Already patched, skipping');
  process.exit(0);
}

// STEP 1: Replace the schedTab button array labels
// Original labels are tiny icons/spaces. Replace with icon+text.
// calendar=" ", recurring=" ", ai="\u2726 AI", list="\u2630"
const oldLabels = `[["calendar"," "],["recurring"," "],["ai","${String.fromCharCode(10022)} AI"],["list","${String.fromCharCode(9776)}"]]`;
const newLabels = `[["calendar","${String.fromCharCode(128197)} Calendar"],["recurring","${String.fromCharCode(128260)} Recurring"],["ai","${String.fromCharCode(10022)} AI Schedule"],["list","${String.fromCharCode(128203)} All Appts"]]`;

if (!c.includes(oldLabels)) {
  console.error('[schedtab-buttons] Cannot find schedTab button array via exact match');
  const altSearch = '["calendar","';
  const idx = c.indexOf(altSearch);
  if (idx === -1) {
    console.error('[schedtab-buttons] Cannot find schedTab buttons at all, aborting');
    process.exit(1);
  }
  console.log('[schedtab-buttons] Found alt marker at position', idx);
  const arrStart = c.lastIndexOf('[[', idx + 5);
  const arrEnd = c.indexOf(']]', idx) + 2;
  const oldArr = c.substring(arrStart, arrEnd);
  console.log('[schedtab-buttons] Found array:', oldArr.length, 'chars');
  c = c.substring(0, arrStart) + newLabels + c.substring(arrEnd);
} else {
  c = c.replace(oldLabels, newLabels);
  console.log('[schedtab-buttons] Replaced schedTab button labels');
}

// STEP 2: Update button styles - bigger padding, font size
const schedIdx = c.indexOf('setSchedTab(id)');
if (schedIdx !== -1) {
  const searchArea = c.substring(schedIdx, schedIdx + 500);

  // Update padding
  const padMatch = searchArea.indexOf('padding:"7px 12px"');
  if (padMatch !== -1) {
    const absPos = schedIdx + padMatch;
    c = c.substring(0, absPos) + 'padding:"10px 18px"' + c.substring(absPos + 'padding:"7px 12px"'.length);
    console.log('[schedtab-buttons] Updated button padding');
  }

  // Update fontSize
  const fsMatch = c.substring(schedIdx, schedIdx + 500).indexOf('fontSize:11');
  if (fsMatch !== -1) {
    const absPos = schedIdx + fsMatch;
    c = c.substring(0, absPos) + 'fontSize:13' + c.substring(absPos + 'fontSize:11'.length);
    console.log('[schedtab-buttons] Updated fontSize to 13');
  }
}

// STEP 3: Increase gap between buttons
const schedIdx3 = c.indexOf('setSchedTab(id)');
if (schedIdx3 !== -1) {
  const before = c.substring(schedIdx3 - 300, schedIdx3);
  const gapMatch = before.lastIndexOf('gap:6');
  if (gapMatch !== -1) {
    const absPos = (schedIdx3 - 300) + gapMatch;
    c = c.substring(0, absPos) + 'gap:8' + c.substring(absPos + 'gap:6'.length);
    console.log('[schedtab-buttons] Updated gap to 8');
  }
}

// Add marker
c = MARKER + '\n' + c;

writeFileSync(FILE, c, 'utf8');
console.log('[schedtab-buttons] Done! Schedule tab buttons resized with icons.');

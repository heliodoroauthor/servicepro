#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
const FILE = "src/ServiceProApp.jsx";
let c = readFileSync(FILE, "utf8");

const MARKER = "/* SCHEDTAB_BUTTONS_V1 */";
if (c.includes(MARKER)) { console.log("[schedtab-buttons] Already patched"); process.exit(0); }

// STEP 1: Replace button labels with icon+text
const oldLabels = '[["calendar"," "],["recurring"," "],["ai","' + String.fromCharCode(10022) + ' AI"],["list","' + String.fromCharCode(9776) + '"]]';
const newLabels = '[["calendar","' + String.fromCharCode(128197) + ' Calendar"],["recurring","' + String.fromCharCode(128260) + ' Recurring"],["ai","' + String.fromCharCode(10022) + ' AI Schedule"],["list","' + String.fromCharCode(128203) + ' All Appts"]]';

if (!c.includes(oldLabels)) {
  const idx = c.indexOf('["calendar","');
  if (idx === -1) { console.error("[schedtab-buttons] ABORT"); process.exit(1); }
  const arrStart = c.lastIndexOf("[[", idx + 5);
  const arrEnd = c.indexOf("]]", idx) + 2;
  c = c.substring(0, arrStart) + newLabels + c.substring(arrEnd);
} else { c = c.replace(oldLabels, newLabels); }
console.log("[schedtab-buttons] Replaced labels");

// STEP 2: Update inline styles - bigger padding, fontSize
const si = c.indexOf("setSchedTab(id)");
if (si !== -1) {
  let area = c.substring(si, si + 500);
  const p = area.indexOf('padding:"7px 12px"');
  if (p !== -1) { const a = si + p; c = c.substring(0, a) + 'padding:"10px 18px"' + c.substring(a + 18); }
  area = c.substring(si, si + 500);
  const f = area.indexOf("fontSize:11");
  if (f !== -1) { const a = si + f; c = c.substring(0, a) + "fontSize:13" + c.substring(a + 11); }
}

// STEP 3: Update parent flex container - add wrap + className for CSS
const si2 = c.indexOf("setSchedTab(id)");
if (si2 !== -1) {
  const before = c.substring(si2 - 300, si2);
  const g = before.lastIndexOf("gap:6");
  if (g !== -1) {
    const a = (si2 - 300) + g;
    c = c.substring(0, a) + 'gap:8,flexWrap:"wrap",justifyContent:"flex-end"' + c.substring(a + 5);
    console.log("[schedtab-buttons] Added flexWrap");
  }
}

// STEP 4: Inject mobile-responsive CSS via runtime style element
// Find the schedule module useEffect or add CSS injection
const mobileCSS = [
  "@media(max-width:768px){",
  "  .schedtab-row{flex-wrap:wrap!important;gap:4px!important;justify-content:center!important}",
  "  .schedtab-row button{padding:6px 10px!important;font-size:11px!important;border-radius:8px!important;white-space:nowrap}",
  "  .sched-toolbar{flex-direction:column!important;gap:8px!important;align-items:stretch!important}",
  "  .sched-toolbar>div{justify-content:center!important}",
  "}",
].join("\n");

// Add className to the schedTab button container
const si3 = c.indexOf("setSchedTab(id)");
if (si3 !== -1) {
  const bk = c.substring(si3 - 350, si3);
  const dv = bk.lastIndexOf('<div style={{display:"flex"');
  if (dv !== -1) {
    const a = (si3 - 350) + dv + 4; // after "<div"
    c = c.substring(0, a) + ' className="schedtab-row"' + c.substring(a);
    console.log("[schedtab-buttons] Added className to button row");
  }
}

// Add className to the toolbar row (parent that has both viewMode + schedTab)
const si4 = c.indexOf("schedtab-row");
if (si4 !== -1) {
  const bk2 = c.substring(si4 - 500, si4);
  // Find the outer flex div that contains justifyContent:"space-between"
  const od = bk2.lastIndexOf('<div style={{display:"flex"');
  if (od !== -1) {
    const a = (si4 - 500) + od + 4;
    c = c.substring(0, a) + ' className="sched-toolbar"' + c.substring(a);
    console.log("[schedtab-buttons] Added className to toolbar");
  }
}

// Inject the CSS style block into the schedule section JSX
// Find the Scheduling section and add a style element
const cssEl = '<style>{`' + mobileCSS + '`}</style>';
const heading = c.indexOf("Scheduling</");
if (heading !== -1) {
  // Find the parent div or section that wraps the schedule content
  const parentDiv = c.lastIndexOf("<div", heading);
  if (parentDiv !== -1 && heading - parentDiv < 100) {
    c = c.substring(0, parentDiv) + cssEl + c.substring(parentDiv);
    console.log("[schedtab-buttons] Injected mobile CSS");
  }
}

c = MARKER + "\n" + c;
writeFileSync(FILE, c, "utf8");
console.log("[schedtab-buttons] Done!");

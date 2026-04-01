#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
const FILE = "src/ServiceProApp.jsx";
let c = readFileSync(FILE, "utf8");

const MARKER = "/* SCHEDTAB_BUTTONS_V3 */";
if (c.includes(MARKER)) { console.log("[schedtab-buttons] Already patched v3"); process.exit(0); }
c = c.replace("/* SCHEDTAB_BUTTONS_V1 */", "");
c = c.replace("/* SCHEDTAB_BUTTONS_V2 */", "");

// STEP 1: Replace button labels with icon+text
const labelRe = /\[\["calendar","[^"]*"\],\s*\["recurring","[^"]*"\],\s*\["ai","[^"]*"\],\s*\["list","[^"]*"\]\]/;
const m1 = c.match(labelRe);
if (m1) {
  const nl = '[["calendar","' + String.fromCharCode(128197) + ' Calendar"],["recurring","' + String.fromCharCode(128260) + ' Recurring"],["ai","' + String.fromCharCode(10022) + ' AI Schedule"],["list","' + String.fromCharCode(128203) + ' All Appts"]]';
  c = c.replace(m1[0], nl);
  console.log("[schedtab-buttons] STEP 1: Replaced labels");
} else { console.warn("[schedtab-buttons] STEP 1: Labels not found"); }

// STEP 2: Update button padding and font size
c = c.replace(/padding:"7px 12px"/, 'padding:"10px 18px"');
const fm = c.match(/fontSize:11\b([^0-9])/);
if (fm) c = c.replace(/fontSize:11\b([^0-9])/, 'fontSize:13$1');
console.log("[schedtab-buttons] STEP 2: Updated button styles");

// STEP 3: Add className to parent toolbar (the div that has schedtab-row as child)
// The toolbar is the div with justify-content:space-between that wraps view toggles + tab buttons
const rowIdx = c.indexOf('className="schedtab-row"');
if (rowIdx !== -1) {
  // Search backwards for the parent div
  const bk = c.substring(Math.max(0, rowIdx - 600), rowIdx);
  // Find the last <div that has justifyContent or justify-content and space-between
  const tbRe = /<div[^>]*style=\{\{[^}]*justifyContent:"space-between"/g;
  let lastMatch = null;
  let m;
  while ((m = tbRe.exec(bk)) !== null) { lastMatch = m; }
  if (lastMatch) {
    const absPos = (rowIdx - 600 > 0 ? rowIdx - 600 : 0) + lastMatch.index + 4; // after "<div"
    if (!c.substring(absPos, absPos + 50).includes("sched-toolbar")) {
      c = c.substring(0, absPos) + ' className="sched-toolbar"' + c.substring(absPos);
      console.log("[schedtab-buttons] STEP 3: Added className to toolbar");
    }
  } else { console.warn("[schedtab-buttons] STEP 3: toolbar div not found"); }
} else { console.warn("[schedtab-buttons] STEP 3: schedtab-row not found"); }

// STEP 4: Inject mobile CSS into index.html
const HTML = "index.html";
let html = readFileSync(HTML, "utf8");
const CM = "/* SCHEDTAB_MOBILE_V3 */";
if (!html.includes(CM)) {
  const css = "<style>" + CM + "\n" +
    "@media(max-width:900px){" +
    ".sched-toolbar{flex-wrap:wrap!important;gap:8px!important;justify-content:center!important}" +
    ".sched-toggle{order:1!important;width:100%!important;display:flex!important;justify-content:center!important}" +
    ".schedtab-row{order:2!important;width:100%!important;display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;gap:6px!important;justify-content:center!important}" +
    ".schedtab-row button{padding:6px 12px!important;font-size:11px!important;white-space:nowrap!important;border-radius:8px!important}" +
    "}" +
    "@media(max-width:480px){" +
    ".schedtab-row button{padding:5px 8px!important;font-size:10px!important}" +
    "}" +
    "</style>";
  html = html.replace("</head>", css + "\n</head>");
  writeFileSync(HTML, html);
  console.log("[schedtab-buttons] STEP 4: Injected CSS into index.html");
} else { console.log("[schedtab-buttons] STEP 4: CSS already present"); }

// STEP 5: Also inject style tag in JSX near Scheduling heading as backup
const heading = c.indexOf("Scheduling</");
if (heading !== -1 && !c.includes(MARKER)) {
  const pd = c.lastIndexOf("<div", heading);
  if (pd !== -1 && heading - pd < 150) {
    const mobileCss = MARKER + "\n@media(max-width:900px){.sched-toolbar{flex-wrap:wrap!important;gap:8px!important;justify-content:center!important}.sched-toggle{order:1!important;width:100%!important;display:flex!important;justify-content:center!important}.schedtab-row{order:2!important;width:100%!important;display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;gap:6px!important;justify-content:center!important}.schedtab-row button{padding:6px 12px!important;font-size:11px!important;white-space:nowrap!important}}@media(max-width:480px){.schedtab-row button{padding:5px 8px!important;font-size:10px!important}}";
    const stag = '<style>{`' + mobileCss + '`}</style>';
    c = c.substring(0, pd) + stag + c.substring(pd);
    console.log("[schedtab-buttons] STEP 5: Injected JSX style tag");
  }
}

writeFileSync(FILE, c);
console.log("[schedtab-buttons] All patches applied!");

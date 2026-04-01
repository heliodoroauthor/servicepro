#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
const FILE = "src/ServiceProApp.jsx";
let c = readFileSync(FILE, "utf8");

const MARKER = "/* SCHEDTAB_BUTTONS_V4 */";
if (c.includes(MARKER)) { console.log("[schedtab-buttons] Already patched v4"); process.exit(0); }
c = c.replace("/* SCHEDTAB_BUTTONS_V1 */", "");
c = c.replace("/* SCHEDTAB_BUTTONS_V2 */", "");
c = c.replace("/* SCHEDTAB_BUTTONS_V3 */", "");

// STEP 1: Replace button labels with icon+text
const labelRe = /\[\["calendar","[^"]*"\],\s*\["recurring","[^"]*"\],\s*\["ai","[^"]*"\],\s*\["list","[^"]*"\]\]/;
const m1 = c.match(labelRe);
if (m1) {
  const nl = '[["calendar","' + String.fromCharCode(128197) + ' Calendar"],["recurring","' + String.fromCharCode(128260) + ' Recurring"],["ai","' + String.fromCharCode(10022) + ' AI Schedule"],["list","' + String.fromCharCode(128203) + ' All Appts"]]';
  c = c.replace(m1[0], nl);
  console.log("[schedtab-buttons] STEP 1: Replaced labels");
} else { console.warn("[schedtab-buttons] STEP 1: Labels not found"); }

// STEP 2: Update button padding and font size
if (c.match(/padding:"7px 12px"/)) c = c.replace(/padding:"7px 12px"/, 'padding:"10px 18px"');
const fm = c.match(/fontSize:11\b([^0-9])/);
if (fm) c = c.replace(/fontSize:11\b([^0-9])/, 'fontSize:13$1');
console.log("[schedtab-buttons] STEP 2: Updated button styles");

// STEP 3: Inject mobile CSS into index.html using :has() selectors
// These target .sched-toggle (added by redesign-schedule.mjs) as structural anchor
// No className injection needed - pure CSS structural selectors
const HTML = "index.html";
let html = readFileSync(HTML, "utf8");
const CM = "/* SCHEDTAB_MOBILE_V4 */";
// Remove old versions
html = html.replace(/<style>\/\* SCHEDTAB_MOBILE_V\d \*\/[\s\S]*?<\/style>\n?/g, "");
if (!html.includes(CM)) {
  const css = "<style>" + CM + "\n" +
    "@media(max-width:900px){" +
    "div:has(>.sched-toggle){flex-wrap:wrap!important;gap:8px!important;justify-content:center!important}" +
    "div:has(>.sched-toggle)>.sched-toggle{order:1!important;width:100%!important;display:flex!important;justify-content:center!important;gap:4px!important}" +
    "div:has(>.sched-toggle)>div:not(.sched-toggle){order:2!important;width:100%!important;display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;gap:6px!important;justify-content:center!important}" +
    "div:has(>.sched-toggle)>div:not(.sched-toggle) button{padding:6px 12px!important;font-size:11px!important;white-space:nowrap!important;border-radius:8px!important}" +
    "div:has(>.ch){display:flex!important;flex-direction:column!important;overflow:visible!important}" +
    "div:has(>.ch)>*{width:100%!important;min-width:0!important}" +
    "}" +
    "@media(max-width:480px){" +
    "div:has(>.sched-toggle)>div:not(.sched-toggle) button{padding:5px 8px!important;font-size:10px!important}" +
    "}" +
    "</style>";
  html = html.replace("</head>", css + "\n</head>");
  writeFileSync(HTML, html);
  console.log("[schedtab-buttons] STEP 3: Injected mobile CSS into index.html");
} else {
  console.log("[schedtab-buttons] STEP 3: CSS already present");
}

// STEP 4: Also inject style tag in JSX as backup
const heading = c.indexOf("Scheduling</");
if (heading !== -1 && !c.includes(MARKER)) {
  const pd = c.lastIndexOf("<div", heading);
  if (pd !== -1 && heading - pd < 200) {
    const mobileCss = MARKER + "\n" +
      "@media(max-width:900px){" +
      "div:has(>.sched-toggle){flex-wrap:wrap!important;gap:8px!important;justify-content:center!important}" +
      "div:has(>.sched-toggle)>.sched-toggle{order:1!important;width:100%!important;display:flex!important;justify-content:center!important;gap:4px!important}" +
      "div:has(>.sched-toggle)>div:not(.sched-toggle){order:2!important;width:100%!important;display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;gap:6px!important;justify-content:center!important}" +
      "div:has(>.sched-toggle)>div:not(.sched-toggle) button{padding:6px 12px!important;font-size:11px!important;white-space:nowrap!important;border-radius:8px!important}" +
      "div:has(>.ch){display:flex!important;flex-direction:column!important;overflow:visible!important}" +
      "div:has(>.ch)>*{width:100%!important;min-width:0!important}" +
      "}" +
      "@media(max-width:480px){" +
      "div:has(>.sched-toggle)>div:not(.sched-toggle) button{padding:5px 8px!important;font-size:10px!important}" +
      "}";
    const stag = '<style>{\`' + mobileCss + '\`}</style>';
    c = c.substring(0, pd) + stag + c.substring(pd);
    console.log("[schedtab-buttons] STEP 4: Injected JSX style tag");
  }
}

writeFileSync(FILE, c);
console.log("[schedtab-buttons] All patches applied!");

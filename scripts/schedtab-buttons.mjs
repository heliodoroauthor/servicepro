#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
const FILE = "src/ServiceProApp.jsx";
let c = readFileSync(FILE, "utf8");

const MARKER = "/* SCHEDTAB_BUTTONS_V2 */";
if (c.includes(MARKER)) { console.log("[schedtab-buttons] Already patched v2"); process.exit(0); }
// Remove old marker
c = c.replace("/* SCHEDTAB_BUTTONS_V1 */", "");

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

// STEP 3: Add id="schedtab-row" to the tab-button container
const si3 = c.indexOf("setSchedTab(id)");
if (si3 !== -1) {
    const bk = c.substring(si3 - 400, si3);
    const dv = bk.lastIndexOf('<div style={{display:"flex"');
    if (dv !== -1) {
          const a = (si3 - 400) + dv + 4;
          if (!c.substring(a, a + 30).includes('id=')) {
                  c = c.substring(0, a) + ' id="schedtab-row"' + c.substring(a);
                  console.log("[schedtab-buttons] STEP 3: Added id to button row");
          }
    }
}

// STEP 4: Add id="sched-toolbar" to the parent toolbar
const si4 = c.indexOf('id="schedtab-row"');
if (si4 !== -1) {
    const bk2 = c.substring(si4 - 600, si4);
    const od = bk2.lastIndexOf('<div style={{display:"flex"');
    if (od !== -1) {
          const a = (si4 - 600) + od + 4;
          if (!c.substring(a, a + 30).includes('id=')) {
                  c = c.substring(0, a) + ' id="sched-toolbar"' + c.substring(a);
                  console.log("[schedtab-buttons] STEP 4: Added id to toolbar");
          }
    }
}

// STEP 5: Update flex container styles
c = c.replace(/(<div[^>]*id="schedtab-row"[^>]*style=\{\{display:"flex"),gap:\d\b/, '$1,flexDirection:"row",flexWrap:"wrap",gap:8');
console.log("[schedtab-buttons] STEP 5: Updated flex container");

// STEP 6: Inject mobile CSS into index.html
const HTML = "index.html";
let html = readFileSync(HTML, "utf8");
const CM = "/* SCHEDTAB_MOBILE_V2 */";
if (!html.includes(CM)) {
    const css = `<style>${CM}
    @media(max-width:768px){
      #sched-toolbar{flex-direction:column!important;gap:6px!important;align-items:stretch!important}
        #sched-toolbar>div{justify-content:center!important;flex-wrap:wrap!important}
          #schedtab-row{display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;gap:4px!important;justify-content:center!important;width:100%!important}
            #schedtab-row button{padding:6px 10px!important;font-size:11px!important;border-radius:8px!important;white-space:nowrap!important;flex:0 0 auto!important}
            }
            @media(max-width:480px){
              #schedtab-row button{padding:5px 8px!important;font-size:10px!important}
              }
              </style>`;
    html = html.replace("</head>", css + "\n</head>");
    writeFileSync(HTML, html);
    console.log("[schedtab-buttons] STEP 6: Injected CSS into index.html");
}

// STEP 7: Also inject style tag in JSX as backup
const heading = c.indexOf("Scheduling</");
if (heading !== -1) {
    const pd = c.lastIndexOf("<div", heading);
    if (pd !== -1 && heading - pd < 100) {
          const stag = '<style>{`' + MARKER + '\n@media(max-width:768px){#sched-toolbar{flex-direction:column!important;gap:6px!important;align-items:stretch!important}#sched-toolbar>div{justify-content:center!important;flex-wrap:wrap!important}#schedtab-row{display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;gap:4px!important;justify-content:center!important;width:100%!important}#schedtab-row button{padding:6px 10px!important;font-size:11px!important;border-radius:8px!important;white-space:nowrap!important;flex:0 0 auto!important}}@media(max-width:480px){#schedtab-row button{padding:5px 8px!important;font-size:10px!important}}`}</style>';
          c = c.substring(0, pd) + stag + c.substring(pd);
          console.log("[schedtab-buttons] STEP 7: Injected JSX style tag");
    }
}

writeFileSync(FILE, c);
console.log("[schedtab-buttons] All patches applied!");

import { readFileSync, writeFileSync } from 'fs';

// ═══════════════════════════════════════════════════════════════
// add-mobile-responsive.mjs
// Comprehensive mobile-first responsive optimization
// Injects CSS media queries + patches inline styles that cause
// horizontal overflow on small screens (< 480px)
// ═══════════════════════════════════════════════════════════════

const file = 'src/ServiceProApp.jsx';
let content = readFileSync(file, 'utf8');
const original = content;

// ── STEP 1: Inject a comprehensive mobile CSS block into index.css ──
const cssFile = 'src/index.css';
let css = readFileSync(cssFile, 'utf8');

const mobileCss = `
/* ═══════════════════════════════════════════════════════
   MOBILE-FIRST RESPONSIVE OVERHAUL
   Targets: phones < 480px and tablets < 768px
   ═══════════════════════════════════════════════════════ */

/* ── Global mobile resets ────────────────────────────── */
@media (max-width: 639px) {
  /* Prevent ANY horizontal overflow */
  html, body, #root, .app {
    max-width: 100vw;
    overflow-x: hidden;
  }
  .main {
    max-width: 100vw;
    overflow-x: hidden;
  }
  .page {
    padding: 10px;
    max-width: 100vw;
    overflow-x: hidden;
  }

  /* ── Mobile topbar improvements ──────────────────── */
  .mobile-topbar {
    padding: 0 10px;
    gap: 6px;
  }

  /* ── Stats grid: 2 columns on mobile ─────────────── */
  .stats {
    grid-template-columns: 1fr 1fr !important;
    gap: 8px;
  }
  .stat {
    padding: 12px 14px;
  }
  .sv { font-size: 22px; }
  .sl { font-size: 8px; letter-spacing: 1px; }
  .ss { font-size: 9px; }

  /* ── Cards: tighter padding ──────────────────────── */
  .card {
    border-radius: 10px;
  }
  .ch {
    padding: 10px 14px;
  }
  .cb {
    padding: 10px 14px;
  }

  /* ── Tables: make scrollable in container ─────────── */
  table {
    min-width: 320px;
    font-size: 11px;
  }
  th { padding: 8px 10px; font-size: 8px; }
  td { padding: 9px 10px; font-size: 11px; }

  /* ── Modals: full width on mobile ────────────────── */
  .modal {
    max-width: 100vw;
    border-radius: 16px 16px 0 0;
    max-height: 92vh;
  }
  .mh { padding: 12px 16px; }
  .mb2 { padding: 14px 16px; }
  .mf { padding: 10px 16px; }
  .mt2 { font-size: 17px; }

  /* ── Forms: larger touch targets ─────────────────── */
  .inp {
    font-size: 16px; /* prevents iOS zoom on focus */
    min-height: 48px;
    padding: 12px 14px;
  }
  textarea.inp {
    min-height: 80px;
  }
  .fg label {
    font-size: 10px;
    margin-bottom: 5px;
  }

  /* ── Buttons: bigger touch targets ───────────────── */
  .btn {
    min-height: 48px;
    padding: 12px 18px;
    font-size: 13px;
    border-radius: 10px;
  }
  .btn-sm {
    min-height: 40px;
    padding: 9px 14px;
    font-size: 11px;
  }
  .btn-lg {
    min-height: 52px;
    padding: 14px 24px;
    font-size: 15px;
  }

  /* ── Layout: single column on mobile ─────────────── */
  .split, .split-3-2, .split-client {
    grid-template-columns: 1fr !important;
    gap: 10px;
  }
  .g2 { grid-template-columns: 1fr !important; }
  .g3 { grid-template-columns: 1fr !important; }

  /* ── Search bar: full width ──────────────────────── */
  .search-bar {
    font-size: 16px;
    min-height: 44px;
    padding: 10px 12px 10px 36px;
  }

  /* ── Detail screen (Job/Invoice) ─────────────────── */
  .detail-screen {
    overflow-x: hidden;
  }
  .detail-topbar {
    padding: 0 10px;
    height: 50px;
    gap: 8px;
  }
  .detail-title {
    font-size: 17px;
  }
  .detail-body {
    overflow-x: hidden;
  }

  /* ── Job action buttons: wrap nicely ─────────────── */
  .action-row {
    padding: 12px 10px;
    gap: 4px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    flex-wrap: nowrap;
  }
  .action-btn {
    min-width: 56px;
    padding: 6px 2px;
  }
  .action-btn-icon {
    width: 44px;
    height: 44px;
    font-size: 18px;
  }
  .action-btn span {
    font-size: 9px;
  }

  /* ── Expand sections ─────────────────────────────── */
  .expand-header {
    padding: 12px 14px;
    min-height: 48px;
  }
  .expand-header-left {
    font-size: 14px;
    gap: 8px;
  }

  /* ── Client detail tabs: scrollable ──────────────── */
  .ctab-row {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding: 3px;
    gap: 1px;
  }
  .ctab-row::-webkit-scrollbar { display: none; }
  .ctab {
    padding: 0 10px;
    height: 34px;
    font-size: 10px;
    flex-shrink: 0;
  }

  /* ── Client hero ─────────────────────────────────── */
  .client-hero {
    padding: 14px 16px;
  }
  .client-hero-name {
    font-size: 19px;
  }

  /* ── Client rows ─────────────────────────────────── */
  .client-row {
    padding: 11px 14px;
    gap: 10px;
    min-height: 60px;
  }

  /* ── Client quick actions ────────────────────────── */
  .client-qa {
    padding: 10px 14px;
    gap: 8px;
    flex-wrap: wrap;
  }
  .client-qa-btn {
    min-width: 0;
    flex: 1 1 calc(50% - 4px);
    height: 44px;
    font-size: 12px;
    gap: 5px;
    border-radius: 10px;
  }

  /* ── Info rows ───────────────────────────────────── */
  .info-row {
    gap: 8px;
  }
  .info-val {
    font-size: 13px;
    word-break: break-word;
  }

  /* ── Job card list ───────────────────────────────── */
  .job-card {
    padding: 10px;
  }

  /* ── Job map ─────────────────────────────────────── */
  .job-map {
    height: 160px;
  }
  .job-map-addr {
    left: 8px;
    right: 8px;
    bottom: 8px;
    padding: 6px 10px;
    gap: 6px;
  }
  .job-map-addr span {
    font-size: 11px !important;
  }

  /* ── Mobile list items ───────────────────────────── */
  .mobile-list-item {
    padding: 12px 14px;
    gap: 10px;
    min-height: 64px;
  }
  .mli-name { font-size: 13px; }
  .mli-amt { font-size: 16px; }

  /* ── Bottom nav: ensure safe area ────────────────── */
  .bottom-nav {
    padding: 4px 0 max(env(safe-area-inset-bottom, 4px), 4px);
  }
  .bn-item {
    min-height: 48px;
    font-size: 8px;
    padding: 4px 2px;
  }
  .bn-item-icon { font-size: 18px; }

  /* ── Payment grid ────────────────────────────────── */
  .pay-grid {
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 6px;
  }
  .pay-opt {
    padding: 8px 4px;
    min-height: 44px;
  }
  .pay-icon { font-size: 18px; }
  .pay-label { font-size: 7px; }

  /* ── CRM Kanban ──────────────────────────────────── */
  .crm-board {
    flex-direction: column;
    min-height: auto;
    gap: 10px;
  }
  .crm-col {
    width: 100%;
    flex-shrink: 1;
  }

  /* ── Badges ──────────────────────────────────────── */
  .badge {
    font-size: 8px;
    padding: 2px 7px;
  }

  /* ── Photo grid ──────────────────────────────────── */
  .photo-thumb {
    width: 64px;
    height: 64px;
  }
  .photo-add {
    width: 64px;
    height: 64px;
  }

  /* ── Media grid ──────────────────────────────────── */
  .media-grid {
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 6px;
  }

  /* ── Property grid ───────────────────────────────── */
  .property-grid {
    grid-template-columns: 1fr !important;
  }

  /* ── Robot grid ──────────────────────────────────── */
  .robot-grid {
    grid-template-columns: 1fr !important;
  }
  .robot-detail-grid {
    grid-template-columns: 1fr !important;
  }

  /* ── Upload zone ─────────────────────────────────── */
  .upload-zone {
    padding: 20px 14px;
  }
  .upload-zone-label { font-size: 13px; }

  /* ── Workflow stepper ────────────────────────────── */
  .wf-actions {
    flex-direction: column;
  }
  .wf-btn {
    min-width: 100%;
    padding: 14px;
    font-size: 15px;
  }

  /* ── Tabs (generic) ──────────────────────────────── */
  .tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .tabs::-webkit-scrollbar { display: none; }
  .tab {
    padding: 5px 10px;
    font-size: 10px;
    flex-shrink: 0;
  }

  /* ── Portal tabs ─────────────────────────────────── */
  .portal-tab-bar {
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 6px;
  }
  .portal-tab-bar::-webkit-scrollbar { display: none; }
  .portal-tab-btn {
    flex-shrink: 0;
    padding: 7px 12px;
    font-size: 11px;
  }

  /* ── Property detail tabs ────────────────────────── */
  .prop-detail-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .prop-detail-tabs::-webkit-scrollbar { display: none; }
  .pdt-btn {
    flex-shrink: 0;
    padding: 7px 12px;
    font-size: 12px;
  }

  /* ── Send invoice fields ─────────────────────────── */
  .send-inv-field {
    padding: 12px 14px;
  }

  /* ── Notifications / Toasts ──────────────────────── */
  .fab {
    bottom: 72px;
    right: 14px;
  }

  /* ── Stock table ─────────────────────────────────── */
  .stock-table th, .stock-table td {
    padding: 7px 8px;
    font-size: 11px;
  }

  /* ── Telemetry grid ──────────────────────────────── */
  .telemetry-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  /* ── Calendar ────────────────────────────────────── */
  .cal-grid {
    gap: 1px;
    padding: 4px;
  }
  .cal-day {
    min-height: 40px;
    padding: 2px;
    font-size: 9px;
  }
  .cal-dot {
    font-size: 7px;
    padding: 1px 3px;
  }

  /* ── Dispatch tech cards ─────────────────────────── */
  .tc {
    padding: 10px;
  }
  .tc-name { font-size: 13px; }

  /* ── Messages ────────────────────────────────────── */
  .msg-out, .msg-in {
    max-width: 85%;
    font-size: 13px;
    padding: 10px 14px;
  }

  /* ── Section card ────────────────────────────────── */
  .section-card {
    padding: 12px;
  }
}

/* ── Extra small screens (< 360px) ───────────────── */
@media (max-width: 359px) {
  .stats {
    grid-template-columns: 1fr !important;
  }
  .pay-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  .client-qa-btn {
    flex: 1 1 100%;
  }
  .sv { font-size: 20px; }
}
`;

css += mobileCss;
writeFileSync(cssFile, css);
console.log('[add-mobile-responsive] Injected mobile CSS into index.css (' + mobileCss.length + ' chars)');

// ── STEP 2: Patch inline styles in ServiceProApp.jsx that cause overflow ──

let patchCount = 0;

// PATCH A: Dashboard hero badges row — ensure wrapping on mobile
// The row has minWidth:76 buttons that overflow on small screens
const heroRowMarker = 'style={{display:"flex",gap:10,alignItems:"center"}}>';
const heroRow2 = content.indexOf('"val":todayCount');
// Instead, let's fix the stats grid that uses repeat(auto-fill,minmax(140px,1fr))
// The KPI strip — make it responsive
content = content.replace(
  'gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",marginBottom:16',
  'gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",marginBottom:16'
);
patchCount++;
console.log('[add-mobile-responsive] PATCH A: KPI strip grid minmax reduced');

// PATCH B: Quick Actions strip — make buttons wrap instead of scroll
content = content.replace(
  'style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:2}}',
  'style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:2,flexWrap:"wrap",WebkitOverflowScrolling:"touch"}}'
);
patchCount++;
console.log('[add-mobile-responsive] PATCH B: Quick actions flex-wrap');

// PATCH C: Dashboard split — uses className="split" which is already handled by CSS
// No inline patch needed.

// PATCH D: Job detail tabs — make scrollable and smaller on mobile
// The tabs already have overflowX:"auto" but let's add -webkit-overflow-scrolling
content = content.replace(
  'style={{overflowX:"auto",scrollbarWidth:"none",background:"var(--surface)",borderBottom:"2px solid var(--border)",flexShrink:0}}',
  'style={{overflowX:"auto",scrollbarWidth:"none",WebkitOverflowScrolling:"touch",background:"var(--surface)",borderBottom:"2px solid var(--border)",flexShrink:0}}'
);
patchCount++;
console.log('[add-mobile-responsive] PATCH D: Job tabs smooth scroll');

// PATCH E: Inline grids with large minmax values — reduce for mobile
// Fix gridTemplateColumns with minmax(340px,...) — way too wide for mobile
content = content.replace(
  /gridTemplateColumns:"repeat\(auto-fill,minmax\(340px,1fr\)\)"/g,
  'gridTemplateColumns:"repeat(auto-fill,minmax(min(340px,100%),1fr))"'
);
patchCount++;

content = content.replace(
  /gridTemplateColumns:"repeat\(auto-fill,minmax\(300px,1fr\)\)"/g,
  'gridTemplateColumns:"repeat(auto-fill,minmax(min(300px,100%),1fr))"'
);
patchCount++;

content = content.replace(
  /gridTemplateColumns:'repeat\(auto-fill,minmax\(280px,1fr\)\)"/g,
  'gridTemplateColumns:"repeat(auto-fill,minmax(min(280px,100%),1fr))"'
);
patchCount++;

content = content.replace(
  /gridTemplateColumns:"repeat\(auto-fill,minmax\(260px,1fr\)\)"/g,
  'gridTemplateColumns:"repeat(auto-fill,minmax(min(260px,100%),1fr))"'
);
patchCount++;

content = content.replace(
  /gridTemplateColumns:"repeat\(auto-fill,minmax\(200px,1fr\)\)"/g,
  'gridTemplateColumns:"repeat(auto-fill,minmax(min(200px,100%),1fr))"'
);
patchCount++;

content = content.replace(
  /gridTemplateColumns:'repeat\(auto-fill,minmax\(190px,1fr\)\)"/g,
  'gridTemplateColumns:"repeat(auto-fill,minmax(min(190px,100%),1fr))"'
);
patchCount++;

content = content.replace(
  /gridTemplateColumns:"repeat\(auto-fill,minmax\(180px,1fr\)\)"/g,
  'gridTemplateColumns:"repeat(auto-fill,minmax(min(180px,100%),1fr))"'
);
patchCount++;

content = content.replace(
  /gridTemplateColumns:"repeat\(auto-fill,minmax\(160px,1fr\)\)"/g,
  'gridTemplateColumns:"repeat(auto-fill,minmax(min(160px,100%),1fr))"'
);
patchCount++;
console.log('[add-mobile-responsive] PATCH E: Fixed all grid minmax for mobile');

// PATCH F: Tables — wrap in scrollable container for mobile
// Most tables already have tbl-wrap or overflowX:auto parents
// But some raw <table> in the code don't. Let's add overflow to key table wrappers.
// The invoice items table in job detail
content = content.replace(
  /style:\{overflowX:"auto"\}/g,
  'style:{overflowX:"auto",WebkitOverflowScrolling:"touch"}'
);
// Also for style={{overflowX:"auto"}}
content = content.replace(
  /style=\{\{overflowX:"auto"\}\}/g,
  'style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}'
);
patchCount++;
console.log('[add-mobile-responsive] PATCH F: Added touch scrolling to table wrappers');

// PATCH G: Fixed-width elements that cause overflow
// width:560px in camera estimate / invoice fullscreen — use max-width instead
// There are divs with width:"min(560px,90vw)" — already good
// Fix any width:480 or similar fixed widths
content = content.replace(
  /maxWidth:480,/g,
  'maxWidth:"min(480px,100%)",'
);
patchCount++;
console.log('[add-mobile-responsive] PATCH G: Fixed maxWidth:480 overflow');

// PATCH H: Command palette width — already uses min(560px,90vw) — good

// PATCH I: Dashboard hero action badges — the top right badges row
// These use minWidth:76 which is fine but the parent flex needs wrapping
// Let's find the badge container in the dashboard hero
const heroBadgeRow = 'style={{display:"flex",gap:10,alignItems:"center"}}>';
if (content.includes(heroBadgeRow)) {
  // Already wraps fine due to flex behavior
}

// PATCH J: Viewport meta — make sure we prevent zoom on inputs (already has width=device-width)
// Add maximum-scale and user-scalable meta to index.html if present
try {
  const indexHtml = 'index.html';
  let html = readFileSync(indexHtml, 'utf8');
  if (html.includes('width=device-width') && !html.includes('maximum-scale')) {
    html = html.replace(
      'width=device-width, initial-scale=1.0',
      'width=device-width, initial-scale=1.0, viewport-fit=cover'
    );
    writeFileSync(indexHtml, html);
    console.log('[add-mobile-responsive] PATCH J: Updated viewport meta in index.html');
  }
} catch (e) {
  console.log('[add-mobile-responsive] PATCH J: index.html not found at root, skipping');
}

// PATCH K: Ensure all overflowX: "auto" containers have smooth scrolling
// Already handled in CSS

// PATCH L: Fix the CRM board on mobile — inline style override
content = content.replace(
  /className="crm-board"/g,
  'className="crm-board" '
);

// PATCH M: Grid template fixed columns that break on mobile
// "gridTemplateColumns: "1fr 1fr"" — these are fine since CSS handles .g2
// But specific inline ones like: gridTemplateColumns:"3fr 2fr"
content = content.replace(
  /gridTemplateColumns:"3fr 2fr"/g,
  'gridTemplateColumns:"minmax(0,3fr) minmax(0,2fr)"'
);
patchCount++;

// PATCH N: Fix inline max-heights that are too tall for mobile
// "maxHeight: 380" etc — change to use min() with vh
content = content.replace(
  /maxHeight:380,/g,
  'maxHeight:"min(380px,60vh)",'
);
content = content.replace(
  /maxHeight:"70vh"/g,
  'maxHeight:"80vh"'
);
patchCount++;
console.log('[add-mobile-responsive] PATCH N: Responsive max-heights');

// PATCH O: Width:200 dropdown that may overflow
content = content.replace(
  'width:200,zIndex:200,maxHeight:280',
  'width:"min(200px,80vw)",zIndex:200,maxHeight:280'
);
patchCount++;
console.log('[add-mobile-responsive] PATCH O: Dropdown width responsive');

// PATCH P: Calendar grid needs special mobile handling — already in CSS

// PATCH Q: Ensure equipment checklist is mobile-friendly
// The equipment module already uses maxWidth:540 which is fine with margin:"0 auto"
// Category tags use flexWrap which handles mobile

// PATCH R: Fix overflowX on detail-body
content = content.replace(
  'className="detail-body">',
  'className="detail-body" style={{overflowX:"hidden"}}>'
);
// Be more careful — there might be detail-body with existing styles
// Actually that would break ones that already have style. Let me be more targeted.
// Revert the above and instead handle via CSS which we already did.
content = content.replace(
  'className="detail-body" style={{overflowX:"hidden"}}>',
  'className="detail-body">'
);

// Write the patched JSX
writeFileSync(file, content);
console.log('[add-mobile-responsive] ✅ All patches applied (' + patchCount + ' patches to JSX, mobile CSS injected)');
console.log('[add-mobile-responsive] Original JSX: ' + original.length + ' chars → Patched: ' + content.length + ' chars');

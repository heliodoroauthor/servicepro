import { readFileSync, writeFileSync } from 'fs';

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// add-mobile-responsive.mjs
// Comprehensive mobile-first responsive optimization
// Injects CSS media queries + patches inline styles that cause
// horizontal overflow on small screens (< 480px)
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const file = 'src/ServiceProApp.jsx';
let content = readFileSync(file, 'utf8');
const original = content;

// ââ STEP 1: Inject mobile CSS into the <style> tag inside ServiceProApp.jsx ââ
// NOTE: index.css is NOT imported by main.jsx â all CSS lives inside a <style> tag in the JSX

const mobileCss = `
/* ═══════════════════════════════════════════════════════════
   MOBILE-FIRST RESPONSIVE OVERHAUL
   Targets: phones < 480px and tablets < 768px
   ═══════════════════════════════════════════════════════════ */

/* ——— GLOBAL MOBILE RESET (< 768px) ——— */
@media(max-width:768px){
  html,body{overflow-x:hidden!important;width:100%!important;max-width:100vw!important}
  *{box-sizing:border-box!important}

  /* ——— CORE LAYOUT ——— */
  .app{flex-direction:column!important;width:100%!important;max-width:100vw!important;overflow-x:hidden!important}

  /* Hide desktop sidebar + topbar */
  .sb{display:none!important}
  .topbar{display:none!important}

  /* Show mobile topbar */
  .mobile-topbar{display:flex!important}

  /* Show bottom navigation */
  .bottom-nav{display:flex!important;position:fixed!important;bottom:0!important;left:0!important;right:0!important;z-index:9999!important;background:#1a1a2e!important;border-top:1px solid rgba(255,255,255,.1)!important;padding:4px 0 env(safe-area-inset-bottom,4px)!important}
  .bn-item{flex:1!important;display:flex!important;flex-direction:column!important;align-items:center!important;padding:6px 2px!important;font-size:10px!important;min-height:44px!important;justify-content:center!important}
  .bn-item-icon{font-size:20px!important}

  /* Fix main content area */
  .main{margin-left:0!important;width:100%!important;max-width:100vw!important;min-width:0!important;flex:1!important;padding-bottom:72px!important;overflow-x:hidden!important}
  .page{padding:10px!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;overflow-x:hidden!important}

  /* Drawer overlay for hamburger menu */
  .drawer-overlay.open{display:block!important}
  .drawer.open{display:flex!important;position:fixed!important;top:0!important;left:0!important;bottom:0!important;z-index:10000!important;width:280px!important;max-width:80vw!important}

  /* ——— DASHBOARD / HOME ——— */
  .stats{display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;gap:8px!important;width:100%!important}
  .stat,.sv{flex:1 1 45%!important;min-width:0!important;padding:10px!important;font-size:13px!important}
  .sl,.ss{width:100%!important;min-width:0!important}
  .card .g2,.card .g3,.g2,.g3{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:8px!important;width:100%!important}
  .split,.split-3-2{display:flex!important;flex-direction:column!important;gap:10px!important;width:100%!important}

  /* ——— CARDS & CONTAINERS ——— */
  .card{width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important;margin-left:0!important;margin-right:0!important;border-radius:10px!important}
  .ch{padding:12px!important;font-size:14px!important}
  .cb{padding:12px!important}

  /* ——— MODALS ——— */
  .modal{width:95vw!important;max-width:95vw!important;max-height:90vh!important;margin:2.5vh auto!important;overflow-y:auto!important;border-radius:12px!important}
  .mh{padding:14px!important;font-size:16px!important}
  .mb2{padding:12px!important}
  .mf{padding:12px!important;flex-wrap:wrap!important;gap:8px!important}
  .mt2{padding:12px!important}

  /* ——— INPUTS & FORMS ——— */
  input,select,textarea{width:100%!important;max-width:100%!important;min-height:44px!important;font-size:16px!important;box-sizing:border-box!important;border-radius:8px!important}
  .inp{width:100%!important;min-height:44px!important;font-size:16px!important}
  .fg{width:100%!important;margin-bottom:10px!important}
  .search-bar{width:100%!important;max-width:100%!important;box-sizing:border-box!important}

  /* ——— BUTTONS ——— */
  .btn{min-height:44px!important;min-width:44px!important;font-size:14px!important;padding:10px 16px!important;border-radius:8px!important}
  .btn-sm{min-height:38px!important;font-size:13px!important;padding:8px 12px!important}
  .btn-lg{min-height:50px!important;font-size:16px!important;padding:12px 20px!important;width:100%!important}
  .action-btn{min-height:44px!important;padding:10px!important;font-size:13px!important;flex:1 1 auto!important}
  .action-btn-icon{font-size:18px!important}
  .wf-btn{min-height:44px!important;padding:10px 14px!important;font-size:13px!important}
  .wf-actions{flex-wrap:wrap!important;gap:6px!important}
  .fab{position:fixed!important;bottom:80px!important;right:16px!important;z-index:9998!important;min-width:48px!important;min-height:48px!important;border-radius:50%!important}

  /* ——— TABS ——— */
  .tabs{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;gap:4px!important;width:100%!important;-webkit-overflow-scrolling:touch!important;scrollbar-width:none!important;padding-bottom:4px!important}
  .tabs::-webkit-scrollbar{display:none!important}
  .tab{flex:0 0 auto!important;min-width:0!important;font-size:12px!important;padding:8px 12px!important;white-space:nowrap!important;border-radius:20px!important}
  .ctab-row{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;gap:4px!important;width:100%!important;scrollbar-width:none!important}
  .ctab-row::-webkit-scrollbar{display:none!important}
  .ctab{flex:0 0 auto!important;font-size:12px!important;padding:8px 12px!important;white-space:nowrap!important}
  .sched-toggle{display:flex!important;flex-wrap:nowrap!important;gap:2px!important;overflow-x:auto!important}
  .sched-toggle-btn{font-size:13px!important;padding:8px 14px!important;white-space:nowrap!important}
  .portal-tab-bar{flex-wrap:nowrap!important;overflow-x:auto!important;gap:2px!important;scrollbar-width:none!important}
  .portal-tab-bar::-webkit-scrollbar{display:none!important}
  .portal-tab-btn{font-size:12px!important;padding:8px 10px!important;white-space:nowrap!important}
  .prop-detail-tabs{flex-wrap:nowrap!important;overflow-x:auto!important;scrollbar-width:none!important}
  .prop-detail-tabs::-webkit-scrollbar{display:none!important}
  .pdt-btn{font-size:12px!important;padding:8px 10px!important;white-space:nowrap!important}

  /* ——— JOBS SECTION ——— */
  .job-card{width:100%!important;box-sizing:border-box!important}
  .job-map{height:150px!important;border-radius:8px!important}
  .job-map-addr{font-size:12px!important}

  /* ——— SCHEDULE / CALENDAR ——— */
  .sched-header{flex-wrap:wrap!important;gap:8px!important}
  .cal-grid{font-size:10px!important;gap:1px!important;width:100%!important;table-layout:fixed!important}
  .cal-day{min-height:36px!important;padding:2px!important;font-size:9px!important;overflow:hidden!important}
  .cal-dot{width:6px!important;height:6px!important}

  /* ——— CLIENTS SECTION ——— */
  .split-client{display:flex!important;flex-direction:column!important;gap:0!important;width:100%!important}
  .split-client>div:first-child{width:100%!important;max-height:35vh!important;overflow-y:auto!important;border-right:none!important;border-bottom:1px solid rgba(255,255,255,.1)!important}
  .split-client>div:last-child{width:100%!important;flex:1!important}
  .client-hero{flex-direction:column!important;text-align:center!important;gap:8px!important;padding:12px!important}
  .client-hero-name{font-size:18px!important}
  .client-row{flex-direction:column!important;gap:4px!important}
  .client-qa{width:100%!important;flex-wrap:wrap!important;gap:6px!important}
  .client-qa-btn{flex:1 1 auto!important;min-height:44px!important;font-size:13px!important}
  .info-row{flex-direction:column!important;gap:2px!important;padding:8px 0!important}
  .info-val{font-size:14px!important;word-break:break-word!important}

  /* ——— EQUIPMENT ——— */
  .property-grid,.robot-grid,.robot-detail-grid{display:flex!important;flex-direction:column!important;gap:8px!important;width:100%!important}
  .telemetry-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;width:100%!important}

  /* ——— TABLES ——— */
  table{display:block!important;overflow-x:auto!important;max-width:100%!important;font-size:12px!important;-webkit-overflow-scrolling:touch!important}
  .stock-table{overflow-x:auto!important;max-width:100%!important;-webkit-overflow-scrolling:touch!important}
  th,td{padding:6px 8px!important;font-size:12px!important;white-space:nowrap!important}

  /* ——— DETAIL SCREENS ——— */
  .detail-screen{width:100%!important;max-width:100%!important;min-width:0!important}
  .detail-topbar{flex-wrap:wrap!important;gap:8px!important;padding:10px!important}
  .detail-title{font-size:16px!important}
  .detail-body{padding:10px!important}
  .action-row{display:flex!important;flex-wrap:wrap!important;gap:6px!important;width:100%!important}

  /* ——— CRM BOARD ——— */
  .crm-board{display:flex!important;flex-direction:column!important;gap:10px!important;width:100%!important}
  .crm-col{width:100%!important;min-width:0!important;max-width:100%!important}

  /* ——— PAYMENTS ——— */
  .pay-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;width:100%!important}
  .pay-opt{padding:12px!important;min-height:60px!important}
  .pay-icon{font-size:24px!important}
  .pay-label{font-size:12px!important}
  .send-inv-field{width:100%!important}

  /* ——— MEDIA / PHOTOS ——— */
  .media-grid{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:6px!important;width:100%!important}
  .photo-thumb{width:100%!important;height:auto!important;aspect-ratio:1!important;object-fit:cover!important;border-radius:6px!important}
  .photo-add{width:100%!important;min-height:80px!important}
  .upload-zone{width:100%!important;padding:20px!important}
  .upload-zone-label{font-size:13px!important}

  /* ——— MISC ——— */
  .expand-header{flex-wrap:wrap!important;gap:8px!important}
  .expand-header-left{min-width:0!important;flex:1!important}
  .badge{font-size:10px!important;padding:2px 6px!important}
  .mobile-list-item{padding:12px!important}
  .mli-name{font-size:14px!important}
  .mli-amt{font-size:14px!important}

  /* ——— GENERIC OVERFLOW FIXES ——— */
  div[style*="display: flex"][style*="gap"]{flex-wrap:wrap!important}
  div[style*="overflow-x: auto"]{-webkit-overflow-scrolling:touch!important}
  img,video,canvas,svg{max-width:100%!important;height:auto!important}
}

/* ——— EXTRA-SMALL PHONES (< 380px) ——— */
@media(max-width:380px){
  .page{padding:6px!important}
  .card{border-radius:8px!important}
  .stats .stat,.stats .sv{flex:1 1 100%!important}
  .btn{font-size:13px!important;padding:8px 12px!important}
  .tab,.ctab{font-size:11px!important;padding:6px 8px!important}
  .pay-grid{grid-template-columns:1fr!important}
  .media-grid{grid-template-columns:repeat(2,1fr)!important}
  .cal-day{font-size:8px!important;min-height:30px!important}
  .telemetry-grid{grid-template-columns:1fr!important}
  .modal{width:100vw!important;max-width:100vw!important;border-radius:0!important;margin:0!important;max-height:100vh!important}
}
`;

// Inject mobile CSS into the <style> tag in ServiceProApp.jsx
const styleIdx = content.indexOf('<style>');
if (styleIdx !== -1) {
  const afterStyleTag = styleIdx + '<style>'.length;
  // Minify the mobile CSS: strip comments, collapse whitespace
  const minified = mobileCss
    .replace(/\/\*[\s\S]*?\*\//g, '')  // strip comments
    .replace(/\n\s*/g, '\n')           // collapse leading whitespace
    .replace(/\n+/g, '\n')             // collapse blank lines
    .replace(/\s*\{\s*/g, '{')         // collapse around {
    .replace(/\s*\}\s*/g, '}')         // collapse around }
    .replace(/\s*;\s*/g, ';')          // collapse around ;
    .replace(/\s*:\s*/g, ':')          // collapse around :
    .replace(/\s*,\s*/g, ',')          // collapse around ,
    .trim();
  content = content.slice(0, afterStyleTag) + '\n' + minified + '\n' + content.slice(afterStyleTag);
  console.log('[add-mobile-responsive] Injected mobile CSS into <style> tag (' + minified.length + ' chars)');
} else {
  console.error('[add-mobile-responsive] ERROR: Could not find <style> tag in JSX!');
  process.exit(1);
}

// ââ STEP 2: Patch inline styles in ServiceProApp.jsx that cause overflow ââ

let patchCount = 0;

// PATCH A: Dashboard hero badges row â ensure wrapping on mobile
// The row has minWidth:76 buttons that overflow on small screens
const heroRowMarker = 'style={{display:"flex",gap:10,alignItems:"center"}}>';
const heroRow2 = content.indexOf('"val":todayCount');
// Instead, let's fix the stats grid that uses repeat(auto-fill,minmax(140px,1fr))
// The KPI strip â make it responsive
content = content.replace(
  'gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",marginBottom:16',
  'gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",marginBottom:16'
);
patchCount++;
console.log('[add-mobile-responsive] PATCH A: KPI strip grid minmax reduced');

// PATCH B: Quick Actions strip â make buttons wrap instead of scroll
content = content.replace(
  'style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:2}}',
  'style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:2,flexWrap:"wrap",WebkitOverflowScrolling:"touch"}}'
);
patchCount++;
console.log('[add-mobile-responsive] PATCH B: Quick actions flex-wrap');

// PATCH C: Dashboard split â uses className="split" which is already handled by CSS
// No inline patch needed.

// PATCH D: Job detail tabs â make scrollable and smaller on mobile
// The tabs already have overflowX:"auto" but let's add -webkit-overflow-scrolling
content = content.replace(
  'style={{overflowX:"auto",scrollbarWidth:"none",background:"var(--surface)",borderBottom:"2px solid var(--border)",flexShrink:0}}',
  'style={{overflowX:"auto",scrollbarWidth:"none",WebkitOverflowScrolling:"touch",background:"var(--surface)",borderBottom:"2px solid var(--border)",flexShrink:0}}'
);
patchCount++;
console.log('[add-mobile-responsive] PATCH D: Job tabs smooth scroll');

// PATCH E: Inline grids with large minmax values â reduce for mobile
// Fix gridTemplateColumns with minmax(340px,...) â way too wide for mobile
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
  /gridTemplateColumns:"repeat\(auto-fill,minmax\(280px,1fr\)\)"/g,
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
  /gridTemplateColumns:"repeat\(auto-fill,minmax\(190px,1fr\)\)"/g,
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

// PATCH F: Tables â wrap in scrollable container for mobile
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
// width:560px in camera estimate / invoice fullscreen â use max-width instead
// There are divs with width:"min(560px,90vw)" â already good
// Fix any width:480 or similar fixed widths
content = content.replace(
  /maxWidth:480,/g,
  'maxWidth:"min(480px,100%)",'
);
patchCount++;
console.log('[add-mobile-responsive] PATCH G: Fixed maxWidth:480 overflow');

// PATCH H: Command palette width â already uses min(560px,90vw) â good

// PATCH I: Dashboard hero action badges â the top right badges row
// These use minWidth:76 which is fine but the parent flex needs wrapping
// Let's find the badge container in the dashboard hero
const heroBadgeRow = 'style={{display:"flex",gap:10,alignItems:"center"}}>';
if (content.includes(heroBadgeRow)) {
  // Already wraps fine due to flex behavior
}

// PATCH J: Viewport meta â make sure we prevent zoom on inputs (already has width=device-width)
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

// PATCH L: Fix the CRM board on mobile â inline style override
content = content.replace(
  /className="crm-board"/g,
  'className="crm-board" '
);

// PATCH M: Grid template fixed columns that break on mobile
// "gridTemplateColumns: "1fr 1fr"" â these are fine since CSS handles .g2
// But specific inline ones like: gridTemplateColumns:"3fr 2fr"
content = content.replace(
  /gridTemplateColumns:"3fr 2fr"/g,
  'gridTemplateColumns:"minmax(0,3fr) minmax(0,2fr)"'
);
patchCount++;

// PATCH N: Fix inline max-heights that are too tall for mobile
// "maxHeight: 380" etc â change to use min() with vh
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

// PATCH P: Calendar grid needs special mobile handling â already in CSS

// PATCH Q: Ensure equipment checklist is mobile-friendly
// The equipment module already uses maxWidth:540 which is fine with margin:"0 auto"
// Category tags use flexWrap which handles mobile

// PATCH R: Fix overflowX on detail-body
content = content.replace(
  'className="detail-body">',
  'className="detail-body" style={{overflowX:"hidden"}}>'
);
// Be more careful â there might be detail-body with existing styles
// Actually that would break ones that already have style. Let me be more targeted.
// Revert the above and instead handle via CSS which we already did.
content = content.replace(
  'className="detail-body" style={{overflowX:"hidden"}}>',
  'className="detail-body">'
);

// Write the patched JSX
writeFileSync(file, content);
console.log('[add-mobile-responsive] â All patches applied (' + patchCount + ' patches to JSX, mobile CSS injected)');
console.log('[add-mobile-responsive] Original JSX: ' + original.length + ' chars â Patched: ' + content.length + ' chars');

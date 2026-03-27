import { readFileSync, writeFileSync } from 'fs';

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// add-mobile-responsive.mjs
// Comprehensive mobile-first responsive optimization
// Injects CSS media queries into index.html + patches inline styles
// in ServiceProApp.jsx that cause horizontal overflow on small screens
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const file = 'src/ServiceProApp.jsx';
let content = readFileSync(file, 'utf8');
const original = content;

// â STEP 1: Define mobile CSS â

const mobileCss = `
/* MOBILE-FIRST RESPONSIVE OVERHAUL */
/* Targets: phones < 480px and tablets < 768px */

@media(max-width:768px){
  html,body{overflow-x:hidden!important;width:100%!important;max-width:100vw!important}
  *{box-sizing:border-box!important}

  .app{flex-direction:column!important;width:100%!important;max-width:100vw!important;overflow-x:hidden!important}

  .sb{display:none!important}
  .topbar{display:none!important}

  .mobile-topbar{display:flex!important}

  .bottom-nav{display:flex!important;position:fixed!important;bottom:0!important;left:0!important;right:0!important;z-index:9999!important;background:#1a1a2e!important;border-top:1px solid rgba(255,255,255,.1)!important;padding:4px 0 env(safe-area-inset-bottom,4px)!important}
  .bn-item{flex:1!important;display:flex!important;flex-direction:column!important;align-items:center!important;padding:6px 2px!important;font-size:10px!important;min-height:44px!important;justify-content:center!important}
  .bn-item-icon{font-size:20px!important}

  .main{margin-left:0!important;width:100%!important;max-width:100vw!important;min-width:0!important;flex:1!important;padding-bottom:72px!important;overflow-x:hidden!important}
  .page{padding:10px!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;overflow-x:hidden!important}

  .drawer-overlay.open{display:block!important}
  .drawer.open{display:flex!important;position:fixed!important;top:0!important;left:0!important;bottom:0!important;z-index:10000!important;width:280px!important;max-width:80vw!important}

  .stats{display:flex!important;flex-direction:row!important;flex-wrap:wrap!important;gap:8px!important;width:100%!important}
  .stat,.sv{flex:1 1 45%!important;min-width:0!important;padding:10px!important;font-size:13px!important}
  .sl,.ss{width:100%!important;min-width:0!important}

  .card .g2,.card .g3,.g2,.g3{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:8px!important;width:100%!important}

  .split,.split-3-2{display:flex!important;flex-direction:column!important;gap:10px!important;width:100%!important}

  .card{width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important;margin-left:0!important;margin-right:0!important;border-radius:10px!important}
  .fin-ai .card{width:auto!important;max-width:none!important;margin-left:auto!important;margin-right:auto!important}
  .ch{padding:12px!important;font-size:14px!important}
  .cb{padding:12px!important}

  .modal{width:95vw!important;max-width:95vw!important;max-height:90vh!important;margin:2.5vh auto!important;overflow-y:auto!important;border-radius:12px!important}
  .mh{padding:14px!important;font-size:16px!important}
  .mb2{padding:12px!important}
  .mf{padding:12px!important;flex-wrap:wrap!important;gap:8px!important}
  .mt2{padding:12px!important}

  input,select,textarea{width:100%!important;max-width:100%!important;min-height:44px!important;font-size:16px!important;box-sizing:border-box!important;border-radius:8px!important}
  .inp{width:100%!important;min-height:44px!important;font-size:16px!important}
  .fg{width:100%!important;margin-bottom:10px!important}
  .search-bar{width:100%!important;max-width:100%!important;box-sizing:border-box!important}

  .btn{min-height:44px!important;min-width:44px!important;font-size:14px!important;padding:10px 16px!important;border-radius:8px!important}
  .btn-sm{min-height:38px!important;font-size:13px!important;padding:8px 12px!important}
  .btn-lg{min-height:50px!important;font-size:16px!important;padding:12px 20px!important;width:100%!important}
  .page>:not(.detail-screen) .action-btn{min-height:44px!important;padding:10px!important;font-size:13px!important;flex:1 1 auto!important}
  .page>:not(.detail-screen) .action-btn-icon{font-size:18px!important}
  .wf-btn{min-height:44px!important;padding:10px 14px!important;font-size:13px!important}
  .wf-actions{flex-wrap:wrap!important;gap:6px!important}
  .fab{position:fixed!important;bottom:80px!important;right:16px!important;z-index:9998!important;min-width:48px!important;min-height:48px!important;border-radius:50%!important}

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

  .job-card{width:100%!important;box-sizing:border-box!important}

  .sched-header{flex-wrap:wrap!important;gap:8px!important}
  .cal-grid{font-size:10px!important;gap:1px!important;width:100%!important;table-layout:fixed!important}
  .cal-day{min-height:36px!important;padding:2px!important;font-size:9px!important;overflow:hidden!important}
  .cal-dot{width:6px!important;height:6px!important}

  .split-client{display:flex!important;flex-direction:column!important;gap:0!important;width:100%!important}
  .split-client>div:first-child{width:100%!important;max-height:35vh!important;overflow-y:auto!important;border-right:none!important;border-bottom:1px solid rgba(255,255,255,.1)!important}
  .split-client>div:last-child{width:100%!important;flex:1!important}
  .client-hero{flex-direction:column!important;text-align:center!important;gap:8px!important;padding:12px!important}
  .client-hero-name{font-size:18px!important}
  .client-row{flex-direction:column!important;gap:4px!important}
  .page>.split-client .client-qa{width:100%!important;flex-wrap:wrap!important;gap:6px!important}
  .page>.split-client .client-qa-btn{flex:1 1 auto!important;min-height:44px!important;font-size:13px!important}
  .info-row{flex-direction:column!important;gap:2px!important;padding:8px 0!important}
  .info-val{font-size:14px!important;word-break:break-word!important}

  .property-grid,.robot-grid,.robot-detail-grid{display:flex!important;flex-direction:column!important;gap:8px!important;width:100%!important}
  .telemetry-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;width:100%!important}

  table{display:block!important;overflow-x:auto!important;max-width:100%!important;font-size:12px!important;-webkit-overflow-scrolling:touch!important}
  .stock-table{overflow-x:auto!important;max-width:100%!important;-webkit-overflow-scrolling:touch!important}
  th,td{padding:6px 8px!important;font-size:12px!important;white-space:nowrap!important}


  .crm-board{display:flex!important;flex-direction:column!important;gap:10px!important;width:100%!important}
  .crm-col{width:100%!important;min-width:0!important;max-width:100%!important}

  .pay-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;width:100%!important}
  .pay-opt{padding:12px!important;min-height:60px!important}
  .pay-icon{font-size:24px!important}
  .pay-label{font-size:12px!important}
  .send-inv-field{width:100%!important}

  .media-grid{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:6px!important;width:100%!important}
  .photo-thumb{width:100%!important;height:auto!important;aspect-ratio:1!important;object-fit:cover!important;border-radius:6px!important}
  .photo-add{width:100%!important;min-height:80px!important}
  .upload-zone{width:100%!important;padding:20px!important}
  .upload-zone-label{font-size:13px!important}

  .page>:not(.detail-screen) .expand-header{flex-wrap:wrap!important;gap:8px!important}
  .page>:not(.detail-screen) .expand-header-left{min-width:0!important;flex:1!important}
  .page>:not(.detail-screen) .badge{font-size:10px!important;padding:2px 6px!important}
  .mobile-list-item{padding:12px!important}
  .mli-name{font-size:14px!important}
  .mli-amt{font-size:14px!important}

  :not(.fin-ai)>div[style*="display: flex"][style*="gap"]{flex-wrap:wrap!important}
  div[style*="overflow-x: auto"]{-webkit-overflow-scrolling:touch!important}
  img,video,canvas,svg{max-width:100%!important;height:auto!important}

  .fin-ai input,.fin-ai select,.fin-ai textarea{width:auto!important;max-width:none!important;min-height:auto!important;font-size:inherit!important;border-radius:inherit!important}
  .fin-ai .inp{width:auto!important;min-height:auto!important;font-size:inherit!important}
  .fin-ai .btn{min-height:auto!important;min-width:auto!important;font-size:inherit!important;padding:inherit!important;border-radius:inherit!important}
  .fin-ai .btn-sm{min-height:auto!important;font-size:inherit!important;padding:inherit!important}
  .fin-ai svg{max-width:none!important;height:auto!important}
}

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

// â STEP 2: Inject mobile CSS into index.html (NOT into JSX to avoid esbuild parse errors) â

const MARKER_START = '<!-- ==MOBILE-RESPONSIVE-START== -->';
const MARKER_END = '<!-- ==MOBILE-RESPONSIVE-END== -->';

try {
  let indexHtml = readFileSync('index.html', 'utf8');

  const styleBlock = `${MARKER_START}\n<style>\n${mobileCss}\n</style>\n${MARKER_END}`;

  if (indexHtml.includes(MARKER_START)) {
    // Replace existing mobile CSS block
    const startIdx = indexHtml.indexOf(MARKER_START);
    const endIdx = indexHtml.indexOf(MARKER_END) + MARKER_END.length;
    indexHtml = indexHtml.substring(0, startIdx) + styleBlock + indexHtml.substring(endIdx);
    console.log('[add-mobile-responsive] Replaced existing mobile CSS block in index.html.');
  } else {
    // Inject before </head>
    const headCloseIdx = indexHtml.indexOf('</head>');
    if (headCloseIdx !== -1) {
      indexHtml = indexHtml.substring(0, headCloseIdx) + '\n' + styleBlock + '\n' + indexHtml.substring(headCloseIdx);
      console.log('[add-mobile-responsive] Injected mobile CSS into index.html <head>.');
    } else {
      console.error('[add-mobile-responsive] Could not find </head> in index.html.');
      process.exit(1);
    }
  }

  // Also ensure viewport meta tag
  if (!indexHtml.includes('viewport')) {
    indexHtml = indexHtml.replace(
      '<head>',
      '<head>\n    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">'
    );
    console.log('[add-mobile-responsive] Added viewport meta tag.');
  } else {
    indexHtml = indexHtml.replace(
      /(<meta[^>]*name=["']viewport["'][^>]*content=["'])[^"']*(["'][^>]*>)/,
      '$1width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no$2'
    );
    console.log('[add-mobile-responsive] Updated viewport meta tag.');
  }

  writeFileSync('index.html', indexHtml);
  console.log(`[add-mobile-responsive] CSS block: ${mobileCss.length} characters written to index.html`);
} catch (e) {
  console.error('[add-mobile-responsive] Failed to update index.html:', e.message);
  process.exit(1);
}

// â STEP 3: Remove any previously injected mobile CSS from JSX (cleanup) â

const JSX_MARKER_START = '/* ==MOBILE-RESPONSIVE-START== */';
const JSX_MARKER_END = '/* ==MOBILE-RESPONSIVE-END== */';

if (content.includes(JSX_MARKER_START)) {
  const startIdx = content.indexOf(JSX_MARKER_START);
  const endIdx = content.indexOf(JSX_MARKER_END) + JSX_MARKER_END.length;
  content = content.substring(0, startIdx) + content.substring(endIdx);
  console.log('[add-mobile-responsive] Cleaned up previously injected CSS from JSX.');
}

// â STEP 3.5: Add unique class to Financial AI section wrapper â

const finAiIdx = content.indexOf('Financial AI Engine');
if (finAiIdx !== -1) {
  // Search backwards from "Financial AI Engine" to find the nearest className="fade"
  const searchBack = content.substring(Math.max(0, finAiIdx - 600), finAiIdx);
  const fadeMatch = searchBack.lastIndexOf('className="fade"');
  if (fadeMatch !== -1) {
    const absPos = Math.max(0, finAiIdx - 600) + fadeMatch;
    content = content.substring(0, absPos) + 'className="fade fin-ai"' + content.substring(absPos + 'className="fade"'.length);
    console.log('[add-mobile-responsive] Added fin-ai class to Financial AI wrapper.');
  } else {
    console.log('[add-mobile-responsive] Could not find fade wrapper for Financial AI section.');
  }
} else {
  console.log('[add-mobile-responsive] Financial AI Engine text not found in JSX.');
}

// â STEP 4: Patch inline styles that cause horizontal overflow â

let patchCount = 0;

// Find the Financial AI section boundaries to skip patching inside it
const finAiStart = content.indexOf('className="fade fin-ai"');
let finAiEnd = -1;
if (finAiStart !== -1) {
  // Find the matching closing tag by counting braces/depth - approximate with next className="fade"
  const nextFade = content.indexOf('className="fade"', finAiStart + 30);
  finAiEnd = nextFade !== -1 ? nextFade : content.length;
}

content = content.replace(
  /style=\{\{([^}]*display:\s*['"]flex['"][^}]*?)\}\}/g,
  (match, inner, offset) => {
    // Skip if inside the Financial AI section
    if (finAiStart !== -1 && offset > finAiStart && offset < finAiEnd) {
      return match;
    }
    if (inner.includes('gap') && !inner.includes('flexWrap')) {
      patchCount++;
      return match.replace('}}', ', flexWrap:"wrap"}}');
    }
    return match;
  }
);

console.log(`[add-mobile-responsive] Patched ${patchCount} inline styles.`);

// â STEP 5: Write the patched JSX â
if (content !== original) {
  writeFileSync(file, content);
  console.log(`[add-mobile-responsive] Inline patches written to ${file}`);
} else {
  console.log('[add-mobile-responsive] No JSX changes needed.');
}

console.log('[add-mobile-responsive] Done.');

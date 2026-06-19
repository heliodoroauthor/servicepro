import { readFileSync, writeFileSync } from 'fs';
const file = 'src/ServiceProApp.jsx';
let c = readFileSync(file, 'utf8');

const MARKER = '/* SCHEDULE_REDESIGN_V1 */';
if (c.includes(MARKER)) {
  console.log('[redesign-schedule] Already patched, skipping.');
  process.exit(0);
}

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// STEP 1: Replace the WeekView component with a time-grid based design
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const wvStart = c.indexOf('function WeekView(');
if (wvStart === -1) {
  console.error('[redesign-schedule] Cannot find WeekView component');
  process.exit(1);
}

// Find the end of the WeekView function - skip past params, then track braces
// First skip past the parameter destructuring to find the function body '{'
let paramDepth = 0;
let bodyStart = -1;
for (let i = wvStart; i < c.length; i++) {
  if (c[i] === '(') paramDepth++;
  if (c[i] === ')') { paramDepth--; if (paramDepth === 0) {
    // Found end of params, now find the opening '{' of the function body
    bodyStart = c.indexOf('{', i + 1);
    break;
  }}
}
if (bodyStart === -1) { console.error('[redesign-schedule] Cannot find WeekView body'); process.exit(1); }
let braceDepth = 0;
let wvEnd = -1;
for (let i = bodyStart; i < c.length; i++) {
  if (c[i] === '{') braceDepth++;
  if (c[i] === '}') { braceDepth--; if (braceDepth === 0) { wvEnd = i + 1; break; } }
}

if (wvEnd === -1) {
  console.error('[redesign-schedule] Cannot find end of WeekView component');
  process.exit(1);
}

console.log('[redesign-schedule] Found WeekView from ' + wvStart + ' to ' + wvEnd + ' (' + (wvEnd - wvStart) + ' chars)');

const newWeekView = `
${MARKER}
function WeekView({ appts, clients, staff, year, month, selDay, onDayClick, onApptClick }) {
  var today = new Date();
  var anchor = selDay ? new Date(year, month, selDay) : today;
  var dow = anchor.getDay();
  var monday = new Date(anchor);
  monday.setDate(anchor.getDate() - (dow === 0 ? 6 : dow - 1));
  var weekDays = [];
  for (var d = 0; d < 7; d++) {
    var day = new Date(monday);
    day.setDate(monday.getDate() + d);
    weekDays.push(day);
  }
  var todayStr = today.toISOString().slice(0, 10);
  var HOURS = [];
  for (var h = 6; h <= 20; h++) HOURS.push(h);
  var HOUR_HEIGHT = 60;
  var EVENT_COLORS = ["#7c5cfc","#f97316","#3b82f6","#22c55e","#ef4444","#06b6d4","#ec4899","#eab308"];

  function parseTime(timeStr) {
    if (!timeStr) return 8;
    var parts = timeStr.match(/(\\d+):(\\d+)/);
    if (parts) return parseInt(parts[1]) + parseInt(parts[2]) / 60;
    var hourMatch = timeStr.match(/(\\d+)/);
    return hourMatch ? parseInt(hourMatch[1]) : 8;
  }

  function getStaffColor(techId) {
    if (!techId || !staff) return EVENT_COLORS[0];
    var idx = staff.findIndex(function(s) { return s.id === techId; });
    return idx >= 0 ? (staff[idx].color || EVENT_COLORS[idx % EVENT_COLORS.length]) : EVENT_COLORS[0];
  }

  function getClientName(clientId) {
    if (!clientId || !clients) return "";
    var cl = clients.find(function(x) { return x.id === clientId; });
    return cl ? cl.name : "";
  }

  function getTechName(techId) {
    if (!techId || !staff) return "";
    var t = staff.find(function(x) { return x.id === techId; });
    return t ? t.name.split(" ")[0] : "";
  }

  return (
    <div style={{background:"var(--surface)",borderRadius:12,overflow:"hidden",border:"1px solid var(--border)"}}>
      {/* Week header */}
      <div style={{display:"grid",gridTemplateColumns:"56px repeat(7,1fr)",borderBottom:"2px solid var(--border)"}}>
        <div style={{padding:"12px 4px",background:"var(--s2)",borderRight:"1px solid var(--border)"}}/>
        {weekDays.map(function(day, di) {
          var ds = day.toISOString().slice(0, 10);
          var isToday = ds === todayStr;
          var isSel = selDay && ds === new Date(year, month, selDay).toISOString().slice(0, 10);
          var dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
          return (
            <div key={di} onClick={function() { onDayClick && onDayClick(day.getDate(), day.getMonth(), day.getFullYear()); }}
              style={{padding:"8px 4px",textAlign:"center",cursor:"pointer",background:isToday?"rgba(249,115,22,0.14)":isSel?"rgba(59,130,246,0.16)":"var(--s2)",borderRight:di<6?"1px solid var(--border)":"none",borderBottom:isToday?"3px solid #f97316":isSel?"3px solid #3b82f6":"3px solid transparent",transition:"all .15s"}}>
              <div style={{fontSize:11,fontWeight:700,color:isToday?"#ea580c":"var(--muted)",textTransform:"uppercase",letterSpacing:1}}>
                {dayNames[di]}
              </div>
              <div style={{fontSize:22,fontWeight:800,color:isToday?"#ea580c":isSel?"#2563eb":"var(--text)",marginTop:2}}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>
      {/* Time grid */}
      <div style={{display:"grid",gridTemplateColumns:"56px repeat(7,1fr)",position:"relative",maxHeight:HOUR_HEIGHT*HOURS.length,overflowY:"auto"}}>
        {/* Hour labels */}
        <div style={{background:"var(--s2)",borderRight:"1px solid var(--border)"}}>
          {HOURS.map(function(h) {
            var label = h === 0 ? "12 AM" : h < 12 ? h + " AM" : h === 12 ? "12 PM" : (h-12) + " PM";
            return (
              <div key={h} style={{height:HOUR_HEIGHT,borderBottom:"1px solid var(--border)",display:"flex",alignItems:"flex-start",justifyContent:"flex-end",paddingRight:8,paddingTop:0}}>
                <span style={{fontSize:10,fontWeight:600,color:"var(--muted)",marginTop:-6}}>{label}</span>
              </div>
            );
          })}
        </div>
        {/* Day columns */}
        {weekDays.map(function(day, di) {
          var ds = day.toISOString().slice(0, 10);
          var dayAppts = appts.filter(function(a) { return a.date === ds; });
          var isToday = ds === todayStr;
          return (
            <div key={di} style={{position:"relative",borderRight:di<6?"1px solid var(--border)":"none",background:isToday?"rgba(249,115,22,0.02)":"transparent"}}>
              {/* Hour grid lines */}
              {HOURS.map(function(h) {
                return <div key={h} style={{height:HOUR_HEIGHT,borderBottom:"1px solid var(--border)"}}/>;
              })}
              {/* Now indicator */}
              {isToday && (function() {
                var nowH = today.getHours() + today.getMinutes()/60;
                if (nowH < HOURS[0] || nowH > HOURS[HOURS.length-1]+1) return null;
                var top = (nowH - HOURS[0]) * HOUR_HEIGHT;
                return <div style={{position:"absolute",top:top,left:0,right:0,height:2,background:"#ef4444",zIndex:5,pointerEvents:"none"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:"#ef4444",marginTop:-3,marginLeft:-4}}/>
                </div>;
              })()}
              {/* Event blocks */}
              {dayAppts.map(function(a, ai) {
                var startH = parseTime(a.time);
                var dur = (a.duration || 60) / 60;
                var top = Math.max(0, (startH - HOURS[0]) * HOUR_HEIGHT);
                var height = Math.max(24, dur * HOUR_HEIGHT - 2);
                var bgColor = getStaffColor(a.techId);
                var cl = getClientName(a.clientId);
                var tech = getTechName(a.techId);
                return (
                  <div key={a.id || ai} onClick={function(ev) { ev.stopPropagation(); onApptClick && onApptClick(a); }}
                    style={{position:"absolute",top:top,left:2,right:2,height:height,background:bgColor+"18",border:"2px solid "+bgColor,borderRadius:6,padding:"3px 6px",cursor:"pointer",overflow:"hidden",zIndex:2,borderLeft:"4px solid "+bgColor,transition:"box-shadow .15s"}}>
                    <div style={{fontSize:11,fontWeight:800,color:"var(--text)",lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.service || cl || "Appointment"}</div>
                    {height > 30 && <div style={{fontSize:10,color:"var(--muted)",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.time}{cl ? " - "+cl : ""}</div>}
                    {height > 48 && tech && <div style={{fontSize:9,color:bgColor,fontWeight:700,marginTop:1}}>{tech}</div>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
`;

c = c.substring(0, wvStart) + newWeekView + c.substring(wvEnd);
console.log('[redesign-schedule] STEP 1: Replaced WeekView with time-grid layout');

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// STEP 2: Replace the Day view timeline content with a time-slot layout
// Find the WORKIZ TIMELINE VIEW section and replace it
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const timelineMarker = '{/* WORKIZ TIMELINE VIEW */}';
const timelineIdx = c.indexOf(timelineMarker);
if (timelineIdx === -1) {
  console.error('[redesign-schedule] Cannot find WORKIZ TIMELINE VIEW marker');
  process.exit(1);
}

// Find the end of the timeline view block
// It starts with {schedTab==="calendar" && viewMode==="timeline" && (
// We need to find the matching closing )}
const timelineBlockStart = c.indexOf('{schedTab==="calendar" && viewMode==="timeline"', timelineIdx);
if (timelineBlockStart === -1) {
  console.error('[redesign-schedule] Cannot find timeline conditional');
  process.exit(1);
}

let tlDepth = 0;
let tlEnd = -1;
for (let i = timelineBlockStart; i < c.length; i++) {
  if (c[i] === '{') tlDepth++;
  if (c[i] === '}') { tlDepth--; if (tlDepth === 0) { tlEnd = i + 1; break; } }
}

if (tlEnd === -1) {
  console.error('[redesign-schedule] Cannot find end of timeline block');
  process.exit(1);
}

console.log('[redesign-schedule] Found timeline block from ' + timelineBlockStart + ' to ' + tlEnd);

const newTimelineView = `{/* REDESIGNED TIMELINE - Day view with time slots */}
{schedTab==="calendar" && viewMode==="timeline" && (
<div style={{background:"var(--surface)",borderRadius:12,overflow:"hidden",border:"1px solid var(--border)",marginBottom:12}}>
{/* Day selector strip */}
<div style={{display:"flex",overflowX:"auto",background:"var(--s2)",borderBottom:"2px solid var(--border)",padding:"4px 8px",gap:4}}>
{Array.from({length:7},(_,i)=>{
const d=new Date(year,month,1+i+(selDay?selDay-1:0));
const dayNum=d.getDate();
const isToday=d.toISOString().slice(0,10)===new Date().toISOString().slice(0,10);
const isSel=selDay===dayNum;
return (
<div key={i} onClick={()=>setSelDay(dayNum)} style={{flex:"0 0 auto",minWidth:56,padding:"8px 10px",textAlign:"center",cursor:"pointer",background:isSel?"#f97316":isToday?"rgba(249,115,22,0.14)":"transparent",borderRadius:10,transition:"all .15s"}}>
<div style={{fontSize:10,fontWeight:700,color:isSel?"var(--muted)":isToday?"#ea580c":"var(--muted)",textTransform:"uppercase",letterSpacing:1}}>
{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]}
</div>
<div style={{fontSize:18,fontWeight:800,color:isSel?"#fff":isToday?"#ea580c":"var(--text)",marginTop:2}}>
{dayNum}
</div>
</div>
);
})}
</div>
{/* Day appointments as event cards */}
<div style={{padding:"16px 20px"}}>
{(() => {
const dayAppts = selDay ? appts.filter(a=>a.date===ds(selDay)) : appts.filter(a=>a.date===_schedTodayStr);
if(dayAppts.length===0) return <div style={{padding:"50px 0",textAlign:"center"}}>
<div style={{fontSize:40,marginBottom:8,opacity:0.3}}>ð</div>
<div style={{color:"var(--muted)",fontSize:14,fontWeight:600}}>No appointments this day</div>
<div style={{color:"var(--muted)",fontSize:12,marginTop:4}}>Click + New to schedule one</div>
</div>;
var ECOLORS=["#7c5cfc","#f97316","#3b82f6","#22c55e","#ef4444","#06b6d4","#ec4899"];
return <div style={{display:"flex",flexDirection:"column",gap:8}}>
{dayAppts.sort(function(a,b){return(a.time||"").localeCompare(b.time||"")}).map(function(a,ai){
var cl=clientById(a.clientId);
var tech=staffById(a.techId);
var bgColor=tech?.color||ECOLORS[ai%ECOLORS.length];
return <div key={a.id||ai} onClick={function(){onApptClick?onApptClick(a):setSelAppt?.(a);setSelDay(parseInt(a.date.slice(8,10)));}} style={{display:"flex",gap:0,cursor:"pointer",borderRadius:10,overflow:"hidden",border:"1px solid var(--border)",background:"var(--surface)",transition:"box-shadow .15s"}}>
<div style={{width:5,background:bgColor,flexShrink:0}}/>
<div style={{padding:"12px 16px",flex:1,minWidth:0}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:14,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.service||"Appointment"}</div>
<div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{cl?.name||""}{cl?.address?" Â· "+cl.address:""}</div>
</div>
<div style={{textAlign:"right",flexShrink:0}}>
<div style={{fontSize:13,fontWeight:700,color:bgColor}}>{a.time||"TBD"}</div>
<div style={{fontSize:11,color:"var(--muted)"}}>{a.duration?a.duration+"min":"â"}</div>
</div>
</div>
{tech && <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8}}>
<div style={{width:20,height:20,borderRadius:"50%",background:bgColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#fff"}}>{tech.name?.charAt(0)}</div>
<span style={{fontSize:11,fontWeight:600,color:"var(--muted)"}}>{tech.name?.split(" ")[0]}</span>
<span style={{marginLeft:"auto",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,background:a.status==="completed"?"#dcfce7":a.status==="cancelled"?"#fee2e2":"#fef3c7",color:a.status==="completed"?"#16a34a":a.status==="cancelled"?"#dc2626":"#d97706",textTransform:"uppercase",letterSpacing:0.5}}>{a.status||"scheduled"}</span>
</div>}
</div>
</div>;
})}
</div>;
})()}
</div>
</div>
)}`;

c = c.substring(0, timelineBlockStart) + newTimelineView + c.substring(tlEnd);
console.log('[redesign-schedule] STEP 2: Replaced timeline view with redesigned day cards');

// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// STEP 3: Inject CSS overrides for the schedule page
// Add a style block right before the schedule return statement
// ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const schedReturnIdx = c.indexOf('return (\n<div className="fade">', c.indexOf('const [viewMode, setViewMode]'));
if (schedReturnIdx === -1) {
  console.warn('[redesign-schedule] STEP 3: Cannot find schedule return - skipping CSS injection');
} else {
  const cssInjection = `
/* Schedule redesign CSS injection */
if (typeof document !== "undefined" && !document.getElementById("sched-redesign-css")) {
  var styleEl = document.createElement("style");
  styleEl.id = "sched-redesign-css";
  styleEl.textContent = \`
    /* Light content area for schedule */
    .page .fade .card { background: var(--surface) !important; color: var(--text) !important; border: 1px solid var(--border) !important; }
    .page .fade .card .ch { background: var(--s2) !important; border-bottom: 1px solid var(--border) !important; }
    .page .fade .card .ch .ct { color: var(--text) !important; }
    .page .fade .card .ch button { color: var(--muted) !important; border-color: var(--border) !important; background: var(--surface) !important; }
    .page .fade .card .ch button:hover { background: var(--s2) !important; }

    /* Calendar grid light theme */
    .page .fade .card div[style*="grid-template-columns: repeat(7"] > div { color: var(--muted) !important; }

    /* Schedule toggle pills */
    .sched-toggle { background: var(--s2) !important; border-radius: 10px !important; padding: 3px !important; }
    .sched-toggle-btn { color: var(--muted) !important; border-radius: 8px !important; padding: 7px 16px !important; font-weight: 700 !important; font-size: 13px !important; transition: all .15s !important; background: transparent !important; border: none !important; }
    .sched-toggle-btn.active { background: #f97316 !important; color: #fff !important; box-shadow: 0 1px 3px rgba(0,0,0,.15) !important; }
    .sched-toggle-btn:hover:not(.active) { background: var(--border) !important; color: var(--text) !important; }

    /* Header area */
    .sched-header { background: transparent !important; }
  \`;
  document.head.appendChild(styleEl);
}
`;
  c = c.substring(0, schedReturnIdx) + cssInjection + c.substring(schedReturnIdx);
  console.log('[redesign-schedule] STEP 3: Injected CSS overrides for light calendar theme');
}

writeFileSync(file, c);
console.log('[redesign-schedule] All patches applied successfully!');

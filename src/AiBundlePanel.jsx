import { useState } from "react";

const EQUIP = [
  { key: "controllers", label: "Controllers", icon: "\u{1F39B}" },
  { key: "valves", label: "Valves", icon: "\u{1F6B0}" },
  { key: "sensors", label: "Sensors", icon: "\u{1F4E1}" },
  { key: "filters", label: "Filters", icon: "\u{1F9F9}" },
  { key: "motors", label: "Motors", icon: "\u{2699}" },
  { key: "pumps", label: "Pumps", icon: "\u{1F4A7}" },
  { key: "panels", label: "Panels", icon: "\u{1F50C}" },
  { key: "pipes", label: "Pipes", icon: "\u{1F527}" },
  { key: "thermostats", label: "Thermostats", icon: "\u{1F321}" },
  { key: "compressors", label: "Compressors", icon: "\u{1F4A8}" },
];
const TC = { standard: "#4ade80", good: "#f59e0b", premium: "#a855f7" };
const S = {
  card: { background:"var(--surface)", border:"1px solid var(--border)", borderRadius:12, padding:14, marginTop:10 },
  btn: bg=>({ padding:"8px 16px", borderRadius:8, border:"none", background:bg||"var(--orange)", color:"#fff", cursor:"pointer", fontWeight:700, fontSize:13 }),
  chip: a=>({ padding:"6px 12px", borderRadius:20, border:a?"2px solid var(--orange)":"1px solid var(--border)", background:a?"rgba(255,140,0,0.15)":"transparent", color:a?"var(--orange)":"var(--text)", cursor:"pointer", fontSize:12, fontWeight:600, userSelect:"none" }),
  st: { fontSize:14, fontWeight:700, marginBottom:8, marginTop:14 },
  tb: c=>({ flex:"1 1 220px", border:"2px solid "+c, borderRadius:12, padding:12, minWidth:0 }),
  th: c=>({ fontWeight:700, fontSize:14, color:c, marginBottom:8, textAlign:"center" }),
  ir: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", fontSize:12, borderBottom:"1px solid var(--border)" },
  ab: { padding:"6px 14px", borderRadius:8, border:"none", background:"var(--orange)", color:"#fff", cursor:"pointer", fontWeight:700, fontSize:12, marginTop:4 },
  tg: bg=>({ display:"inline-block", padding:"2px 8px", borderRadius:6, background:bg, color:"#fff", fontSize:10, fontWeight:700, marginLeft:6 }),
};
function buildPrompt(eq) {
  return "You are an expert field-service advisor for HVAC/plumbing/electrical.\nEquipment found: "+eq.join(", ")+"\nRespond ONLY with valid JSON (no markdown, no fences):\n{\n  \"bundles\": {\n    \"standard\": {\"name\":\"...\",\"items\":[{\"name\":\"...\",\"price\":0,\"qty\":1}]},\n    \"good\": {\"name\":\"...\",\"items\":[{\"name\":\"...\",\"price\":0,\"qty\":1}]},\n    \"premium\": {\"name\":\"...\",\"items\":[{\"name\":\"...\",\"price\":0,\"qty\":1}]}\n  },\n  \"upsells\":[{\"name\":\"...\",\"reason\":\"...\",\"price\":0,\"qty\":1}],\n  \"servicePlan\":{\"name\":\"...\",\"frequency\":\"monthly|quarterly|annual\",\"pricePerPeriod\":0,\"includes\":[\"...\"]}\n}\nBundles: standard=basic, good=mid, premium=top. Upsells: 2-4 missing/outdated items. Service plan: recurring maintenance. Realistic USD prices. Short names (<40 chars).";
}
export default function AiBundlePanel({ estItems, setEstItems }) {
  const [sel, setSel] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const [added, setAdded] = useState({});
  const toggle = k => setSel(p => p.includes(k) ? p.filter(x=>x!==k) : [...p, k]);
  const analyze = async () => {
    if (!sel.length) { setErr("Select at least one equipment type."); return; }
    setLoading(true); setErr(""); setResult(null); setAdded({});
    try {
      const labels = sel.map(k => EQUIP.find(c=>c.key===k)?.label||k);
      const r = await fetch("/api/ai-suggest", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({prompt:buildPrompt(labels)}) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error||d.detail||"API error");
      setResult(JSON.parse(d.text));
    } catch(e) { setErr(e.message||"Something went wrong."); } finally { setLoading(false); }
  };
  const addEst = (items, key) => {
    setEstItems(p => [...p, ...items.map(it=>({name:it.name,price:it.price||0,qty:it.qty||1}))]);
    setAdded(p => ({...p,[key]:true}));
  };
  const tt = items => items.reduce((s,it)=>s+(it.price||0)*(it.qty||1),0);
  return (
    <div style={{marginTop:8}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <span style={{fontSize:16}}>{"\u{1F916}"}</span>
        <span style={{fontSize:14,fontWeight:700}}>AI Bundle Advisor</span>
      </div>
      <div style={S.card}>
        <div style={{fontSize:12,fontWeight:600,marginBottom:8,color:"var(--muted)"}}>Select equipment found on-site:</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {EQUIP.map(c=>(<div key={c.key} onClick={()=>toggle(c.key)} style={S.chip(sel.includes(c.key))}>{c.icon} {c.label}</div>))}
        </div>
        <div style={{marginTop:12,display:"flex",gap:10,alignItems:"center"}}>
          <button onClick={analyze} disabled={loading} style={{...S.btn(),opacity:loading?0.6:1}}>{loading?"Analyzing...":"\u{2728} Analyze & Suggest"}</button>
          {sel.length>0&&<span style={{fontSize:11,color:"var(--muted)"}}>{sel.length} selected</span>}
        </div>
        {err&&<div style={{color:"#ef4444",fontSize:12,marginTop:8}}>{err}</div>}
      </div>
      {result&&(<>
        <div style={S.st}>{"\u{1F4E6}"} Suggested Bundles</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {["standard","good","premium"].map(tier=>{
            const b=result.bundles?.[tier]; if(!b) return null;
            const color=TC[tier], key="b-"+tier;
            return (<div key={tier} style={S.tb(color)}>
              <div style={S.th(color)}>{b.name||tier}</div>
              {(b.items||[]).map((it,i)=>(<div key={i} style={S.ir}><span style={{flex:1}}>{it.name}</span><span style={{fontWeight:600}}>${((it.price||0)*(it.qty||1)).toFixed(2)}</span></div>))}
              <div style={{fontWeight:700,fontSize:13,textAlign:"right",padding:"6px 0",borderTop:"1px solid var(--border)",marginTop:4}}>${tt(b.items||[]).toFixed(2)}</div>
              <button onClick={()=>addEst(b.items||[],key)} disabled={added[key]} style={{...S.ab,background:added[key]?"#555":color,width:"100%"}}>{added[key]?"\u2713 Added":"Add to Estimate"}</button>
            </div>);
          })}
        </div>
        {result.upsells?.length>0&&(<>
          <div style={S.st}>{"\u{1F4C8}"} Upsell Opportunities</div>
          <div style={S.card}>
            {result.upsells.map((u,i)=>{const uk="u-"+i;return(
              <div key={i} style={{...S.ir,gap:8}}>
                <div style={{flex:1}}><span style={{fontWeight:600}}>{u.name}</span><span style={S.tg("#ef4444")}>UPSELL</span><div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{u.reason}</div></div>
                <span style={{fontWeight:600,whiteSpace:"nowrap"}}>${(u.price||0).toFixed(2)}</span>
                <button onClick={()=>addEst([u],uk)} disabled={added[uk]} style={{...S.ab,padding:"4px 10px",background:added[uk]?"#555":"var(--orange)"}}>{added[uk]?"\u2713":"+"}</button>
              </div>);})}
          </div>
        </>)}
        {result.servicePlan&&(<>
          <div style={S.st}>{"\u{1F4C5}"} Recommended Service Plan</div>
          <div style={{...S.card,border:"2px solid var(--orange)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700,fontSize:14}}>{result.servicePlan.name}</div>
                <div style={{fontSize:12,color:"var(--muted)",marginTop:2}}>{result.servicePlan.frequency} \u00B7 ${(result.servicePlan.pricePerPeriod||0).toFixed(2)}/period</div>
              </div>
              <span style={S.tg("var(--orange)")}>{(result.servicePlan.frequency||"").toUpperCase()}</span>
            </div>
            {result.servicePlan.includes?.length>0&&(<div style={{marginTop:8,fontSize:12,color:"var(--muted)"}}>Includes: {result.servicePlan.includes.join(" \u00B7 ")}</div>)}
            <button onClick={()=>addEst([{name:result.servicePlan.name+" ("+result.servicePlan.frequency+")",price:result.servicePlan.pricePerPeriod||0,qty:1}],"sp")} disabled={added["sp"]} style={{...S.ab,marginTop:10,width:"100%",background:added["sp"]?"#555":"var(--orange)"}}>{added["sp"]?"\u2713 Added":"Add Service Plan to Estimate"}</button>
          </div>
        </>)}
      </>)}
    </div>
  );
                                               }

import { readFileSync, writeFileSync } from 'node:fs';

const ONBOARD_CODE = `
/* ===== Onboarding: empty-by-default + optional sample data ===== */
function OnboardingWelcome({db}){
  const [show,setShow]=useState(false);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{ (async()=>{
    try{
      if(typeof localStorage!=='undefined' && localStorage.getItem('sp_onboarded')) return;
      const info=await db.info();
      if(info && info.doc_count>0){ try{ localStorage.setItem('sp_onboarded','1'); }catch(e){} return; }
      setShow(true);
    }catch(e){}
  })(); },[]);
  if(!show) return null;
  function startEmpty(){ try{ localStorage.setItem('sp_onboarded','1'); }catch(e){} setShow(false); }
  function loadSamples(){ setBusy(true); try{ if(window.__spLoadSamples){ try{ localStorage.setItem('sp_onboarded','1'); }catch(e){} window.__spLoadSamples(); } else { setBusy(false); } }catch(e){ setBusy(false); } }
  const overlay={position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:99999};
  const card={background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'28px 26px',maxWidth:440,width:'90%',textAlign:'center',boxShadow:'0 20px 60px rgba(0,0,0,0.5)'};
  return (
    <div style={overlay}>
      <div style={card}>
        <div style={{fontSize:22,fontWeight:800,color:'var(--text)',marginBottom:8}}>Bienvenido a ServicePro</div>
        <div style={{fontSize:14,color:'var(--muted)',marginBottom:22,lineHeight:1.5}}>Tu empresa esta lista. Como quieres empezar?</div>
        <button onClick={loadSamples} disabled={busy} style={{display:'block',width:'100%',padding:'13px',borderRadius:10,border:'none',background:'var(--orange,#f97316)',color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer',marginBottom:10}}>{busy?'Cargando...':'Cargar datos de ejemplo'}</button>
        <button onClick={startEmpty} disabled={busy} style={{display:'block',width:'100%',padding:'13px',borderRadius:10,border:'1px solid var(--border)',background:'transparent',color:'var(--text)',fontWeight:600,fontSize:14,cursor:'pointer'}}>Empezar de cero</button>
        <div style={{fontSize:11,color:'var(--muted)',marginTop:16}}>Podras cargar o limpiar datos cuando quieras.</div>
      </div>
    </div>
  );
}
`;

const FILE = new URL('../src/ServiceProApp.jsx', import.meta.url);
let s = readFileSync(FILE,'utf8');
let n=0;
// A) start empty + always reflect the cloud DB (even when empty)
if(s.includes('const [items, setItems] = useState(seedData);')){ s=s.replace('const [items, setItems] = useState(seedData);','const [items, setItems] = useState([]);'); n++; }
// pricebook hook force-seeds in an else-branch; collapse it to reflect DB only
s = s.replace("if (docs.length > 0) setItems(docs);\nelse db.bulkDocs(INIT_PRICEBOOK.map(p => ({ ...p })));", "setItems(docs);");
{ const before=s; s=s.split('if (docs.length > 0) setItems(docs);').join('setItems(docs);'); if(s!==before) n++; }
// B) expose a sample-data loader instead of auto-seeding every new company
if(s.includes('seedDatabaseIfEmpty(db, {') && !s.includes('__spLoadSamples')){ s=s.replace('seedDatabaseIfEmpty(db, {','window.__spLoadSamples = function(){ return seedDatabaseIfEmpty(db, {'); n++; }
if(s.includes("}).catch(e => console.warn('seed error', e));")){ s=s.replace("}).catch(e => console.warn('seed error', e));","}).then(function(){ try{ window.location.reload(); }catch(_e){} }).catch(e => console.warn('seed error', e)); };"); n++; }
// C) inject the welcome card + mount it inside the app
const appAnchor='export default function App() {';
if(s.includes(appAnchor) && !s.includes('function OnboardingWelcome(')){ s=s.replace(appAnchor, ONBOARD_CODE+'\n'+appAnchor); n++; }
if(s.includes('<div className="app">') && !s.includes('<OnboardingWelcome')){ s=s.replace('<div className="app">','<div className="app">{user && <OnboardingWelcome db={db}/>}'); n++; }
writeFileSync(FILE,s);
console.log('[add-onboarding] applied '+n+' edit(s)');

import { readFileSync, writeFileSync } from 'node:fs';

const SUPA_AUTH_CODE = `
/* ===== Supabase Auth (Fase 2 - real login/signup) ===== */
async function spLoadUser(authUser){
  if(!authUser) return null;
  let profile=null;
  try{ const r=await supabase.from('profiles').select('*').eq('id',authUser.id).maybeSingle(); profile=r.data; }catch(e){ profile=null; }
  if(!profile) return null;
  let role = profile.role==='owner' ? 'admin' : profile.role;
  if(!['admin','dispatcher','technician','manager'].includes(role)) role='technician';
  return { id:authUser.id, name:profile.full_name||authUser.email, email:authUser.email, role:role, staffId:profile.staff_id||null, color:profile.color||'#f97316', tenantId:profile.tenant_id };
}
async function spSignOut(setUser){ try{ await supabase.auth.signOut(); }catch(e){} setUser(null); }
function SupabaseAuth({onLogin}){
  const [mode,setMode]=useState('signin');
  const [email,setEmail]=useState('');
  const [pw,setPw]=useState('');
  const [company,setCompany]=useState('');
  const [name,setName]=useState('');
  const [err,setErr]=useState('');
  const [msg,setMsg]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{ (async()=>{ try{ const r=await supabase.auth.getSession(); if(r.data && r.data.session && r.data.session.user){ const u=await spLoadUser(r.data.session.user); if(u) onLogin(u); } }catch(e){} })(); },[]);
  const inStyle={padding:'11px 13px',borderRadius:8,border:'1px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.04)',color:'#eee',fontSize:14,fontFamily:'inherit',outline:'none'};
  async function submit(e){
    e.preventDefault(); setErr(''); setMsg(''); setBusy(true);
    try{
      if(mode==='signup'){
        const r=await supabase.auth.signUp({ email:email, password:pw, options:{ data:{ company_name:company, full_name:name } } });
        if(r.error){ setErr(r.error.message); setBusy(false); return; }
        if(!r.data.session){ setMsg('Cuenta creada. Si Supabase pide confirmar correo, confirmalo (o desactiva esa opcion) y luego inicia sesion.'); setMode('signin'); setBusy(false); return; }
        const u=await spLoadUser(r.data.user); if(u){ onLogin(u); return; } setErr('Perfil no encontrado.'); setBusy(false); return;
      } else {
        const r=await supabase.auth.signInWithPassword({ email:email, password:pw });
        if(r.error){ setErr(r.error.message); setBusy(false); return; }
        const u=await spLoadUser(r.data.user); if(u){ onLogin(u); return; } setErr('No se encontro tu perfil.'); setBusy(false); return;
      }
    }catch(ex){ setErr((ex&&ex.message)||'Error'); setBusy(false); }
  }
  return (
    <div className="lw"><div className="lc fade">
      <div className="ll">SERVICE<span className="lo">PRO</span></div>
      <div className="ls">{mode==='signup'?'CREA TU EMPRESA':'ENTERPRISE FIELD DISPATCH - SIGN IN'}</div>
      <form onSubmit={submit} style={{marginTop:18,display:'flex',flexDirection:'column',gap:10}}>
        {mode==='signup' && <input style={inStyle} placeholder="Nombre de tu empresa" value={company} onChange={e=>setCompany(e.target.value)} required/>}
        {mode==='signup' && <input style={inStyle} placeholder="Tu nombre" value={name} onChange={e=>setName(e.target.value)}/>}
        <input style={inStyle} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
        <input style={inStyle} type="password" placeholder="Contrasena" value={pw} onChange={e=>setPw(e.target.value)} required/>
        {err && <div style={{color:'#ef4444',fontSize:12}}>{err}</div>}
        {msg && <div style={{color:'#10b981',fontSize:12,lineHeight:1.4}}>{msg}</div>}
        <button type="submit" disabled={busy} style={{padding:'12px',borderRadius:8,border:'none',background:'var(--orange,#f97316)',color:'#fff',fontWeight:700,fontSize:14,cursor:'pointer',marginTop:4}}>{busy?'...':(mode==='signup'?'Crear empresa':'Entrar')}</button>
      </form>
      <div style={{marginTop:14,fontSize:12,color:'rgba(255,255,255,0.55)',textAlign:'center',cursor:'pointer'}} onClick={()=>{setErr('');setMsg('');setMode(mode==='signup'?'signin':'signup');}}>{mode==='signup'?'Ya tienes cuenta? Inicia sesion':'Empresa nueva? Crea tu cuenta'}</div>
    </div></div>
  );
}
`;

const FILE = new URL('../src/ServiceProApp.jsx', import.meta.url);
let s = readFileSync(FILE,'utf8');
let n=0;
// 1) Import the Supabase client. Prepend at top = robust no matter how the
//    react import line is rewritten by earlier prebuild scripts.
if(!s.includes("./supabaseClient.js")){ s = "import { supabase } from './supabaseClient.js';\n" + s; n++; }
// 2) Sign-out should also end the Supabase session (run BEFORE injecting helpers
//    so spSignOut's own internal setUser(null) is preserved).
if(!s.includes('function SupabaseAuth(')){ s = s.split('setUser(null)').join('spSignOut(setUser)'); }
// 3) Inject auth helpers + screen just before the App component.
const appAnchor='export default function App() {';
if(s.includes(appAnchor) && !s.includes('function SupabaseAuth(')){ s = s.replace(appAnchor, SUPA_AUTH_CODE+'\n'+appAnchor); n++; }
// 4) Swap the login render gate from the demo LoginPage to the real SupabaseAuth.
const gate='<><style>{CSS}</style><LoginPage onLogin={u => { setUser(u); setTab(u.role==="technician"?"my-jobs":"dashboard"); }}/></>';
if(s.includes(gate)){ s = s.replace(gate, '<><style>{CSS}</style><SupabaseAuth onLogin={u => { setUser(u); setTab(u.role==="technician"?"my-jobs":"dashboard"); }}/></>'); n++; }
writeFileSync(FILE,s);
console.log('[add-supabase-auth] applied '+n+' structural edit(s)');

import { readFileSync, writeFileSync } from 'node:fs';

const SUPA_STORE_CODE = `
/* ===== Supabase document store (Fase 2 Paso 2 - cloud data, tenant-scoped) ===== */
class SupabaseStore {
  constructor(){ this._listeners=[]; this._tenant=null; }
  async _tid(){
    if(this._tenant) return this._tenant;
    try{
      const r=await supabase.auth.getSession();
      const uid=(r.data && r.data.session && r.data.session.user) ? r.data.session.user.id : null;
      if(!uid) return null;
      const p=await supabase.from('profiles').select('tenant_id').eq('id',uid).maybeSingle();
      this._tenant=(p.data ? p.data.tenant_id : null);
    }catch(e){ this._tenant=null; }
    return this._tenant;
  }
  _toDoc(row){ const d=Object.assign({}, row.body||{}); d._id=row.doc_id; if(row.type!=null) d.type=row.type; d.updatedAt=row.updated_at; return d; }
  async info(){ try{ const r=await supabase.from('documents').select('doc_id',{count:'exact',head:true}); return {db_name:'supabase',doc_count:(r.count||0)}; }catch(e){ return {db_name:'supabase',doc_count:0}; } }
  async get(id){ try{ const r=await supabase.from('documents').select('*').eq('doc_id',id).limit(1).maybeSingle(); if(r.data && !(r.data.body&&r.data.body._deleted)) return this._toDoc(r.data); }catch(e){} return Promise.reject({status:404,message:'not_found'}); }
  async _writeMany(docs){
    const tid=await this._tid();
    const rows=(docs||[]).filter(function(d){return d && d._id;}).map(function(d){ return { tenant_id:tid, doc_id:d._id, type:(d.type!=null?d.type:null), body:d, updated_at:(d.updatedAt||new Date().toISOString()) }; });
    if(!rows.length) return [];
    try{ await supabase.from('documents').upsert(rows,{onConflict:'tenant_id,doc_id'}); }catch(e){}
    this._notify({});
    return rows.map(function(r){ return {ok:true,id:r.doc_id}; });
  }
  async put(doc){ await this._writeMany([doc]); return {ok:true,id:doc._id,rev:'1'}; }
  async bulkDocs(docs){ return this._writeMany(docs); }
  async allDocs(opts){ opts=opts||{}; const self=this; try{ const r=await supabase.from('documents').select('*'); let rows=(r.data||[]).filter(function(row){return !(row.body&&row.body._deleted);}).map(function(row){ return { id:row.doc_id, key:row.doc_id, value:{rev:'1'}, doc:(opts.include_docs?self._toDoc(row):undefined) }; }); return {rows:rows,total_rows:rows.length,offset:0}; }catch(e){ return {rows:[],total_rows:0,offset:0}; } }
  async find(q){ q=q||{}; const selector=q.selector||{}; const self=this; try{
      let query=supabase.from('documents').select('*');
      if(selector.type && typeof selector.type==='string') query=query.eq('type',selector.type);
      const r=await query;
      let docs=(r.data||[]).map(function(row){return self._toDoc(row);}).filter(function(d){return !d._deleted;});
      for(const k in selector){ if(k==='type') continue; const v=selector[k];
        if(v && typeof v==='object'){
          if(v.$ne!==undefined) docs=docs.filter(function(d){return d[k]!==v.$ne;});
          if(v.$in!==undefined) docs=docs.filter(function(d){return v.$in.includes(d[k]);});
          if(v.$gte!==undefined) docs=docs.filter(function(d){return d[k]>=v.$gte;});
          if(v.$lte!==undefined) docs=docs.filter(function(d){return d[k]<=v.$lte;});
        } else { docs=docs.filter(function(d){return d[k]===v;}); }
      }
      if(q.sort && q.sort[0]){ const s=q.sort[0]; const k=Object.keys(s)[0]; const dir=s[k]; docs.sort(function(a,b){ return dir==='desc'?((b[k]||'')>(a[k]||'')?1:-1):((a[k]||'')>(b[k]||'')?1:-1); }); }
      if(q.limit) docs=docs.slice(0,q.limit);
      return {docs:docs};
    }catch(e){ return {docs:[]}; } }
  createIndex(){ return Promise.resolve({result:'created'}); }
  changes(o){ o=o||{}; const handlers={}; const self=this; const entry={handlers:handlers};
    const sub={ on:function(ev,fn){ handlers[ev]=fn; return sub; }, cancel:function(){ if(sub._ch){ try{ supabase.removeChannel(sub._ch); }catch(e){} } self._listeners=self._listeners.filter(function(x){return x!==entry;}); } };
    self._listeners.push(entry);
    if(o.live){ try{ const ch=supabase.channel('docs_'+Math.random().toString(36).slice(2)).on('postgres_changes',{event:'*',schema:'public',table:'documents'},function(payload){ if(handlers.change) handlers.change({id:(payload&&payload.new?payload.new.doc_id:undefined)}); }).subscribe(); sub._ch=ch; }catch(e){} }
    return sub; }
  _notify(change){ for(const s of this._listeners){ if(s.handlers && s.handlers.change) s.handlers.change(change); } }
}
`;

const FILE = new URL('../src/ServiceProApp.jsx', import.meta.url);
let s = readFileSync(FILE,'utf8');
let n=0;
if(!s.includes("./supabaseClient.js")){ s = "import { supabase } from './supabaseClient.js';\n" + s; n++; }
const dbAnchor='const _dbInstances = {};';
if(s.includes(dbAnchor) && !s.includes('class SupabaseStore')){ s = s.replace(dbAnchor, SUPA_STORE_CODE+'\n'+dbAnchor); n++; }
const idbNew="new IDBStore('tangible_' + tenantId)";
if(s.includes(idbNew)){ s = s.replace(idbNew, 'new SupabaseStore()'); n++; }
writeFileSync(FILE,s);
console.log('[add-supabase-data] applied '+n+' structural edit(s)');

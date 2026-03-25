// Database layer — IndexedDB-backed document store
export class IDBStore {
constructor(name) {
this._name = name;
this._db = null;
this._listeners = [];
this._ready = this._open();
}
_open() {
return new Promise((resolve, reject) => {
const req = indexedDB.open(this._name, 1);
req.onupgradeneeded = e => {
const db = e.target.result;
if (!db.objectStoreNames.contains('docs')) {
const store = db.createObjectStore('docs', { keyPath: '_id' });
store.createIndex('type', 'type', { unique: false });
}
};
req.onsuccess = e => { this._db = e.target.result; resolve(this._db); };
req.onerror = e => reject(e.target.error);
});
}
async _idb() { if (!this._db) await this._ready; return this._db; }
async get(id) {
const db = await this._idb();
return new Promise((resolve, reject) => {
const tx = db.transaction('docs', 'readonly');
const req = tx.objectStore('docs').get(id);
req.onsuccess = e => {
const d = e.target.result;
if (!d || d._deleted) reject({ status: 404, message: 'not_found' });
else resolve({ ...d });
};
req.onerror = e => reject(e.target.error);
});
}
async put(doc) {
const db = await this._idb();
const rev = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
const toStore = { ...doc, _rev: rev, updatedAt: doc.updatedAt || new Date().toISOString() };
return new Promise((resolve, reject) => {
const tx = db.transaction('docs', 'readwrite');
const req = tx.objectStore('docs').put(toStore);
req.onsuccess = () => { this._notify({ id: doc._id, doc: toStore }); resolve({ ok: true, id: doc._id, rev }); };
req.onerror = e => reject(e.target.error);
});
}
async bulkDocs(docs) {
const db = await this._idb();
return new Promise((resolve, reject) => {
const tx = db.transaction('docs', 'readwrite');
const store = tx.objectStore('docs');
const results = [];
let done = 0;
if (!docs.length) { resolve([]); return; }
for (const doc of docs) {
const rev = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
const toStore = { ...doc, _rev: rev, updatedAt: doc.updatedAt || new Date().toISOString() };
const req = store.put(toStore);
req.onsuccess = () => { results.push({ ok: true, id: doc._id, rev }); if (++done === docs.length) resolve(results); };
req.onerror = e => { results.push({ error: true }); if (++done === docs.length) resolve(results); };
}
});
}
async allDocs(opts = {}) {
const db = await this._idb();
return new Promise((resolve, reject) => {
const tx = db.transaction('docs', 'readonly');
const req = tx.objectStore('docs').getAll();
req.onsuccess = e => {
let rows = e.target.result
.filter(d => !d._deleted)
.filter(d => !opts.startkey || d._id >= opts.startkey)
.filter(d => !opts.endkey || d._id <= opts.endkey)
.map(d => ({ id: d._id, key: d._id, value: { rev: d._rev }, doc: opts.include_docs ? { ...d } : undefined }));
resolve({ rows, total_rows: rows.length, offset: 0 });
};
req.onerror = e => reject(e.target.error);
});
}
async find({ selector = {}, sort, limit } = {}) {
const db = await this._idb();
return new Promise((resolve, reject) => {
const tx = db.transaction('docs', 'readonly');
const req = tx.objectStore('docs').getAll();
req.onsuccess = e => {
let docs = e.target.result.filter(d => !d._deleted);
for (const [k, v] of Object.entries(selector)) {
if (typeof v === 'object' && v !== null) {
if (v.$ne !== undefined) docs = docs.filter(d => d[k] !== v.$ne);
if (v.$in !== undefined) docs = docs.filter(d => v.$in.includes(d[k]));
if (v.$gte !== undefined) docs = docs.filter(d => d[k] >= v.$gte);
if (v.$lte !== undefined) docs = docs.filter(d => d[k] <= v.$lte);
} else {
docs = docs.filter(d => d[k] === v);
}
}
if (sort) {
const [s] = sort; const [k, dir] = Object.entries(s)[0];
docs.sort((a, b) => dir === 'desc' ? (b[k]||'') > (a[k]||'') ? 1 : -1 : (a[k]||'') > (b[k]||'') ? 1 : -1);
}
if (limit) docs = docs.slice(0, limit);
resolve({ docs });
};
req.onerror = e => reject(e.target.error);
});
}
async createIndex() { return { result: 'created' }; }
changes({ live } = {}) {
const handlers = {};
const sub = { on: (ev, fn) => { handlers[ev] = fn; return sub; }, cancel: () => { this._listeners = this._listeners.filter(l => l !== sub); } };
if (live) this._listeners.push({ handlers });
return sub;
}
_notify(change) { for (const s of this._listeners) if (s.handlers.change) s.handlers.change(change); }
async info() {
const db = await this._idb();
return new Promise(resolve => {
const tx = db.transaction('docs', 'readonly');
const req = tx.objectStore('docs').count();
req.onsuccess = e => resolve({ db_name: this._name, doc_count: e.target.result });
req.onerror = () => resolve({ db_name: this._name, doc_count: 0 });
});
}
}
// -- Persistent Upload Queue ---------------------------------------------------
export class IDBUploadQueue {
constructor() {
this._db = null;
this._listeners = new Set();
this._ready = this._open();
}
_open() {
return new Promise((resolve, reject) => {
const req = indexedDB.open('sp_upload_queue', 1);
req.onupgradeneeded = e => {
const db = e.target.result;
if (!db.objectStoreNames.contains('queue'))
db.createObjectStore('queue', { keyPath: 'id' });
};
req.onsuccess = e => { this._db = e.target.result; resolve(); };
req.onerror = e => reject(e.target.error);
});
}
async _idb() { if (!this._db) await this._ready; return this._db; }
async enqueue(entry) {
const db = await this._idb();
return new Promise((resolve, reject) => {
const tx = db.transaction('queue', 'readwrite');
tx.objectStore('queue').put(entry);
tx.oncomplete = () => { this._notify(); resolve(); };
tx.onerror = e => reject(e.target.error);
});
}
async getAll() {
const db = await this._idb();
return new Promise((resolve, reject) => {
const tx = db.transaction('queue', 'readonly');
const req = tx.objectStore('queue').getAll();
req.onsuccess = e => resolve(e.target.result || []);
req.onerror = e => reject(e.target.error);
});
}
async updateEntry(id, changes) {
const db = await this._idb();
return new Promise((resolve, reject) => {
const tx = db.transaction('queue', 'readwrite');
const store = tx.objectStore('queue');
const gr = store.get(id);
gr.onsuccess = e => {
if (!e.target.result) { resolve(); return; }
store.put({ ...e.target.result, ...changes });
tx.oncomplete = () => { this._notify(); resolve(); };
};
tx.onerror = e => reject(e.target.error);
});
}
async remove(id) {
const db = await this._idb();
return new Promise((resolve, reject) => {
const tx = db.transaction('queue', 'readwrite');
tx.objectStore('queue').delete(id);
tx.oncomplete = () => { this._notify(); resolve(); };
tx.onerror = e => reject(e.target.error);
});
}
subscribe(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn); }
async _notify() { const q = await this.getAll(); this._listeners.forEach(fn => fn(q)); }
}
export const _idbUploadQueue = new IDBUploadQueue();
export const _dbInstances = {};
export function getDb(tenantId = 'default') {
if (!_dbInstances[tenantId]) _dbInstances[tenantId] = new IDBStore('tangible_' + tenantId);
return _dbInstances[tenantId];
}

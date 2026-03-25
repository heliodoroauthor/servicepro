import { useState, useRef, useEffect, useCallback, createContext, useContext, useMemo } from "react";
import { IDBStore, IDBUploadQueue, _idbUploadQueue, _dbInstances, getDb } from "./db.js";
import { db, id, r, sub } from "./ServiceProApp.jsx";
import { a, changes, client, cloudUrl, db, deleteFile, from, get, getSignedPutUrl, id, isDemoMode, item, items, map, property, r, requestThumbnail, to, upload, uploadFile } from "./pages_a.jsx";
import { data, file, id, images, item, loading, prev, run, sub, url } from "./pages_b.jsx";
import { id, robot, type } from "./pages_e.jsx";
import { DiagnosticsPage, changes, data, db, ok, status, warn } from "./pages_f.jsx";
import { id, items, total } from "./pages_g.jsx";
import { data, files, first, id, prev, r, robot, subs, total } from "./pages_h.jsx";
import { calls, client, data, p, r, send, subs, total } from "./pages_i.jsx";


// -- ULID-compatible ID generator ---------------------------------------------
function makeId(type) {
const ts = Date.now().toString(36).toUpperCase().padStart(10, '0');
const rand = Math.random().toString(36).slice(2, 14).toUpperCase().padStart(12, '0');
return (type) + ":" + (ts) + (rand);
}
const now = () => new Date().toISOString();
// -- DB Context ----------------------------------------------------------------
const DbCtx = createContext(null);
function DbProvider({ tenantId = 'default', children }) {
const [db] = useState(() => getDb(tenantId));
const [ready, setReady] = useState(false);
useEffect(() => { db.info().then(() => setReady(true)); }, [db]);
return <DbCtx.Provider value={{ db, ready }}>{children}</DbCtx.Provider>;
}
function useDb() {
const ctx = useContext(DbCtx);
return ctx || { db: getDb('default'), ready: true };
}
// -- Sync status indicator (UI only in prototype) ------------------------------
function useSyncStatus() {
const { status } = useSyncEngine();
return status;
}
// -- Seed + Persistence Layer -------------------------------------------------
// Seeds IDB on first run, then loads from IDB on subsequent runs.
// All mutations go through IDB so data survives refresh.
async function seedDatabaseIfEmpty(db, seedData) {
const info = await db.info();
if (info.doc_count > 0) return; // Already seeded
const docs = [];
const ts = new Date().toISOString();
// Flatten all seed arrays into typed docs
for (const c of seedData.clients) docs.push({ ...c, _id: 'client:' + c.id, type: 'client', updatedAt: ts });
for (const s of seedData.staff) docs.push({ ...s, _id: 'staff:' + s.id, type: 'staff', updatedAt: ts });
for (const a of seedData.appts) docs.push({ ...a, _id: 'appt:' + a.id, type: 'appt', updatedAt: ts });
for (const i of seedData.invoices) docs.push({ ...i, _id: 'invoice:' + i.id, type: 'invoice', updatedAt: ts });
for (const p of seedData.products) docs.push({ ...p, _id: 'product:' + p.id, type: 'product', updatedAt: ts });
for (const s of seedData.subs) docs.push({ ...s, _id: 'sub:' + s.id, type: 'subcontractor',updatedAt: ts });
for (const l of seedData.leads) docs.push({ ...l, _id: 'lead:' + l.id, type: 'lead', updatedAt: ts });
for (const c of seedData.campaigns) docs.push({ ...c, _id: 'campaign:' + c.id, type: 'campaign', updatedAt: ts });
for (const v of seedData.vehicles) docs.push({ ...v, _id: 'vehicle:' + v.id, type: 'vehicle', updatedAt: ts });
for (const e of seedData.equipment) docs.push({ ...e, _id: 'equipment:' + e.id, type: 'equipment', updatedAt: ts });
for (const r of seedData.robots) docs.push({ ...r, _id: 'robot:' + r.id, type: 'robot', updatedAt: ts });
for (const p of seedData.phoneLog) docs.push({ ...p, _id: 'phonelog:' + p.id, type: 'phonelog', updatedAt: ts });
await db.bulkDocs(docs);
}
function useIDBCollection(db, type, seedData) {
const [items, setItems] = useState(seedData); // Show seed instantly while IDB loads
const [loaded, setLoaded] = useState(false);
useEffect(() => {
if (!db) return;
db.find({ selector: { type } })?.then(({ docs }) => {
if (docs.length > 0) setItems(docs);
setLoaded(true);
}).catch(() => setLoaded(true));
const ch = db.changes({ since: 'now', live: true }).on('change', () => {
db.find({ selector: { type } })?.then(({ docs }) => { if (docs.length > 0) setItems(docs); });
});
return () => ch.cancel();
}, [db, type]);
const persist = useCallback(async (updater) => {
setItems(prev => {
const next = typeof updater === 'function' ? updater(prev) : updater;
// Write changes to IDB asynchronously
if (db) {
const ts = new Date().toISOString();
const toWrite = next.map(item => ({
...item,
_id: item._id || (type + ':' + item.id),
type,
updatedAt: ts,
}));
db.bulkDocs(toWrite).catch(err => console.warn('IDB write error:', err));
}
return next;
});
}, [db, type]);
return [items, persist];
}
// -- Module A: Upload Queue (Persistent IndexedDB — survives refresh) ------------
function useUploadQueue() {
const [queue, setQueue] = useState([]);
useEffect(() => {
_idbUploadQueue.getAll().then(setQueue);
return _idbUploadQueue.subscribe(setQueue);
}, []);
return queue;
}
async function enqueueUpload({ file, filename, mimeType, jobId, propertyId, clientId, uploadedBy, tenantId, category = 'photo', visibility = 'internal' }) {
const entry = {
id: makeId('queue'), file, filename, mimeType, sizeBytes: file ? file.size || 0 : 0,
jobId, propertyId, clientId, uploadedBy, tenantId, category, visibility,
status: 'queued', attempts: 0, createdAt: now(), error: null,
};
await _idbUploadQueue.enqueue(entry);
if (navigator.onLine) processUploadQueue({ mediaApiUrl: '', accessToken: '' }).catch(() => {});
return entry;
}
// processUploadQueue — delegates to CloudStorageClient for both demo and production
// In demo mode (mediaApiUrl empty) CloudStorageClient returns a blob: URL immediately.
// In production set CLOUD_CONFIG.mediaApiUrl and this automatically uses signed PUT URLs.
async function processUploadQueue({ mediaApiUrl, accessToken, db: pdb }) {
return processUploadQueueWithCloud({ accessToken: accessToken || '', db: pdb });
}
// ------------------------------------------------------------------------------
// MODULE: CloudStorageClient (modules/core/cloud/CloudStorageClient.js)
// Manages signed URL uploads to S3/Cloudflare R2.
// In demo mode (no CLOUD_CONFIG) it falls back to blob: URLs automatically.
// ------------------------------------------------------------------------------
const CLOUD_CONFIG = {
// Swap these in production:
// mediaApiUrl: "https://media.yourdomain.com"
// provider: "r2" | "s3"
// bucket: "your-bucket-name"
mediaApiUrl: '', // empty = demo mode
provider: 'r2',
bucket: 'tangible-media',
};
const CloudStorageClient = {
isDemoMode() { return !CLOUD_CONFIG.mediaApiUrl; },
// Step 1 — ask your media-api for a signed PUT URL
async getSignedPutUrl({ filename, mimeType, cloudKey, accessToken }) {
const res = await fetch(CLOUD_CONFIG.mediaApiUrl + '/sign', {
method: 'POST',
headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
body: JSON.stringify({ filename, mimeType, cloudKey }),
});
if (!res.ok) throw new Error('sign failed: HTTP ' + res.status);
const { uploadUrl, publicUrl } = await res.json();
return { uploadUrl, publicUrl };
},
// Step 2 — PUT the file directly to R2/S3 using the signed URL
async putFileToCloud(uploadUrl, file, mimeType, onProgress) {
return new Promise((resolve, reject) => {
const xhr = new XMLHttpRequest();
xhr.open('PUT', uploadUrl);
xhr.setRequestHeader('Content-Type', mimeType);
if (onProgress) xhr.upload.onprogress = e => onProgress(e.loaded / e.total);
xhr.onload = () => { if (xhr.status === 200) resolve(); else reject(new Error('PUT ' + xhr.status)); };
xhr.onerror = () => reject(new Error('Network error'));
xhr.send(file);
});
},
// Step 3 — tell media-api to generate a thumbnail
async requestThumbnail({ cloudKey, mediaId, accessToken }) {
if (!CLOUD_CONFIG.mediaApiUrl) return null;
const res = await fetch(CLOUD_CONFIG.mediaApiUrl + '/thumb', {
method: 'POST',
headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
body: JSON.stringify({ cloudKey, mediaId }),
}).catch(() => null);
if (!res || !res.ok) return null;
const { thumbUrl } = await res.json();
return thumbUrl;
},
// Full upload flow: sign → PUT → thumb → return media_meta doc
async uploadFile({ file, filename, mimeType, jobId, propertyId, clientId, uploadedBy, tenantId, category, visibility, accessToken, onProgress }) {
const cloudKey = makeId('media') + '/' + filename.replace(/[^a-zA-Z0-9._-]/g, '_');
const mediaId = makeId('media_meta');
if (CloudStorageClient.isDemoMode()) {
// Demo/artifact mode — use a blob URL so images render without a real bucket
const blobUrl = file ? URL.createObjectURL(file) : '';
return {
_id: mediaId, type: 'media_meta',
filename, mimeType, sizeBytes: file ? file.size : 0,
cloudUrl: blobUrl, thumbUrl: null, cloudKey,
jobId: jobId || null, propertyId: propertyId || null, clientId: clientId || null,
uploadedBy, tenantId, category, visibility,
status: 'uploaded', deletedAt: null, deletedBy: null,
createdAt: now(), updatedAt: now(),
};
}
const { uploadUrl, publicUrl } = await CloudStorageClient.getSignedPutUrl({ filename, mimeType, cloudKey, accessToken });
await CloudStorageClient.putFileToCloud(uploadUrl, file, mimeType, onProgress);
const thumbUrl = mimeType.startsWith('image/') ? await CloudStorageClient.requestThumbnail({ cloudKey, mediaId, accessToken }) : null;
return {
_id: mediaId, type: 'media_meta',
filename, mimeType, sizeBytes: file ? file.size : 0,
cloudUrl: publicUrl, thumbUrl, cloudKey,
jobId: jobId || null, propertyId: propertyId || null, clientId: clientId || null,
uploadedBy, tenantId, category, visibility,
status: 'uploaded', deletedAt: null, deletedBy: null,
createdAt: now(), updatedAt: now(),
};
},
// Get a signed GET URL for private files (time-limited)
async getSignedGetUrl({ cloudKey, accessToken, expiresIn = 3600 }) {
if (CloudStorageClient.isDemoMode()) return cloudKey; // blob URL passes through
const res = await fetch(CLOUD_CONFIG.mediaApiUrl + '/sign-get', {
method: 'POST',
headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
body: JSON.stringify({ cloudKey, expiresIn }),
});
if (!res.ok) throw new Error('sign-get failed');
const { url } = await res.json();
return url;
},
// Soft-delete: mark in DB + queue cloud deletion
async deleteFile({ cloudKey, mediaId, db, accessToken }) {
if (db) {
const doc = await db.get(mediaId).catch(() => null);
if (doc) await db.put({ ...doc, status: 'deleted', deletedAt: now(), updatedAt: now() });
}
if (!CloudStorageClient.isDemoMode()) {
fetch(CLOUD_CONFIG.mediaApiUrl + '/delete', {
method: 'POST',
headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
body: JSON.stringify({ cloudKey }),
}).catch(() => {}); // fire-and-forget; server retries
}
},
};
// -- Wire CloudStorageClient into processUploadQueue --------------------------
// Replaces the raw fetch() in processUploadQueue with the signed-URL flow.
// processUploadQueue now just calls CloudStorageClient.uploadFile() per entry.
async function processUploadQueueWithCloud({ accessToken, db: pdb }) {
const all = await _idbUploadQueue.getAll();
const queued = all.filter(e => e.status === 'queued');
for (const entry of queued) {
await _idbUploadQueue.updateEntry(entry.id, { status: 'uploading' });
try {
const mediaDoc = await CloudStorageClient.uploadFile({
file: entry.file,
filename: entry.filename,
mimeType: entry.mimeType,
jobId: entry.jobId,
propertyId: entry.propertyId,
clientId: entry.clientId,
uploadedBy: entry.uploadedBy,
tenantId: entry.tenantId,
category: entry.category,
visibility: entry.visibility,
accessToken: accessToken || '',
});
if (pdb) await pdb.put(mediaDoc).catch(() => {});
await _idbUploadQueue.remove(entry.id);
} catch (err) {
await _idbUploadQueue.updateEntry(entry.id, {
status: 'queued', attempts: entry.attempts + 1, error: err.message,
});
}
}
}
// ------------------------------------------------------------------------------
// MODULE: SyncEngine (modules/core/sync/syncEngine.js)
// Lightweight background sync: pushes IDB changes to CouchDB when online.
// Falls back gracefully when no COUCH_URL is set (demo mode).
// ------------------------------------------------------------------------------
const SYNC_CONFIG = {
couchUrl: '', // e.g. "https://db.yourdomain.com/tangible_{tenantId}"
retryDelay: 5000, // ms between retries
batchSize: 50,
};
const SyncEngine = {
_status: 'idle', // idle | syncing | synced | offline | error
_listeners: new Set(),
_timer: null,
_pendingCount: 0,
getStatus() { return this._status; },
getPending() { return this._pendingCount; },
_emit(status, pending) {
this._status = status;
if (pending !== undefined) this._pendingCount = pending;
this._listeners.forEach(fn => fn({ status: this._status, pending: this._pendingCount }));
},
subscribe(fn) {
this._listeners.add(fn);
fn({ status: this._status, pending: this._pendingCount });
return () => this._listeners.delete(fn);
},
// Start periodic sync (call once on app boot)
start(db, tenantId, accessToken) {
if (this._timer) return;
const tick = async () => {
if (!navigator.onLine) { this._emit('offline'); return; }
if (!SYNC_CONFIG.couchUrl) {
// Demo mode — just count pending IDB writes as "synced locally"
const info = await db.info().catch(() => ({ doc_count: 0 }));
this._emit('synced', 0);
return;
}
await SyncEngine._syncOnce(db, tenantId, accessToken);
};
tick();
this._timer = setInterval(tick, 30000);
window.addEventListener('online', () => tick());
window.addEventListener('offline', () => this._emit('offline'));
},
stop() {
if (this._timer) { clearInterval(this._timer); this._timer = null; }
},
async _syncOnce(db, tenantId, accessToken) {
this._emit('syncing');
try {
// Get all docs updated since last sync checkpoint
const checkpoint = await db.get('_local/sync_checkpoint').catch(() => ({ _id: '_local/sync_checkpoint', seq: 0 }));
const { rows } = await db.allDocs({ include_docs: true }).catch(() => ({ rows: [] }));
const toSync = rows.filter(r => r.doc && !r.doc._id.startsWith('_local/')).slice(0, SYNC_CONFIG.batchSize);
if (!toSync.length) { this._emit('synced', 0); return; }
const couchUrl = SYNC_CONFIG.couchUrl.replace('{tenantId}', tenantId);
const res = await fetch(couchUrl + '/_bulk_docs', {
method: 'POST',
headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
body: JSON.stringify({ docs: toSync.map(r => r.doc), new_edits: false }),
});
if (!res.ok) throw new Error('CouchDB bulk_docs HTTP ' + res.status);
// Update checkpoint
await db.put({ ...checkpoint, seq: Date.now() }).catch(() => {});
this._emit('synced', 0);
} catch (err) {
console.warn('SyncEngine error:', err.message);
this._emit('error');
}
},
// Force immediate sync (e.g. when user saves something important)
async flush(db, tenantId, accessToken) {
if (!SYNC_CONFIG.couchUrl) return;
return SyncEngine._syncOnce(db, tenantId, accessToken);
},
};
// -- useSyncEngine hook — exposes live status + pending count to UI ------------
function useSyncEngine() {
const [state, setState] = useState({ status: SyncEngine.getStatus(), pending: SyncEngine.getPending() });
useEffect(() => SyncEngine.subscribe(setState), []);
return state;
}
// -- useIDBStats — live document counts from IndexedDB (for DiagnosticsPage) --
function useIDBStats(db) {
const [stats, setStats] = useState({ doc_count: 0, size_kb: 0 });
useEffect(() => {
if (!db) return;
const refresh = () => db.info().then(info => {
setStats({ doc_count: info.doc_count, size_kb: Math.round(info.doc_count * 4.2) });
}).catch(() => {});
refresh();
const ch = db.changes({ since: 'now', live: true }).on('change', refresh);
return () => ch.cancel();
}, [db]);
return stats;
}
// -- useQueueStats — live upload queue depth -----------------------------------
function useQueueStats() {
const [counts, setCounts] = useState({ queued: 0, uploading: 0, done: 0, error: 0 });
useEffect(() => {
const update = (q) => {
const c = { queued: 0, uploading: 0, done: 0, error: 0 };
for (const e of (q || [])) {
if (e.status === 'queued') c.queued++;
else if (e.status === 'uploading') c.uploading++;
else if (e.status === 'done') c.done++;
else c.error++;
}
setCounts(c);
};
_idbUploadQueue.getAll().then(update);
return _idbUploadQueue.subscribe(update);
}, []);
return counts;
}
// -- Module A: useMedia hook ---------------------------------------------------
function useMedia({ jobId, propertyId, clientId } = {}) {
const { db } = useDb();
const [mediaItems, setMediaItems] = useState([]);
const queue = useUploadQueue().filter(e =>
(!jobId || e.jobId === jobId) &&
(!propertyId || e.propertyId === propertyId) &&
(!clientId || e.clientId === clientId)
);
const load = useCallback(async () => {
if (!db) return;
const sel = { type: 'media_meta', status: { $ne: 'deleted' } };
if (jobId) sel.jobId = jobId;
if (propertyId) sel.propertyId = propertyId;
if (clientId) sel.clientId = clientId;
const { docs } = await db.find({ selector: sel, sort: [{ createdAt: 'desc' }] })?.catch(() => ({ docs: [] }));
setMediaItems(docs);
}, [db, jobId, propertyId, clientId]);
useEffect(() => {
load();
const ch = db.changes({ since: 'now', live: true, selector: { type: 'media_meta' } }).on('change', load);
return () => ch.cancel();
}, [db, load]);
const addFiles = useCallback(async (files) => {
for (const file of Array.from(files)) {
await enqueueUpload({ file, filename: file.name, mimeType: file.type, jobId, propertyId, clientId, category: inferMediaCategory(file), visibility: 'internal' });
}
await processUploadQueue({ db }).catch(() => {});
await load();
}, [db, jobId, propertyId, clientId, load]);
const deleteMedia = useCallback(async (mediaId) => {
const doc = await db.get(mediaId).catch(() => null);
if (doc) await db.put({ ...doc, status: 'deleted', deletedAt: now(), updatedAt: now() });
await load();
}, [db, load]);
return { mediaItems, queue, addFiles, deleteMedia, refresh: load };
}
function inferMediaCategory(file) {
if (file.type.startsWith('image/')) return 'photo';
if (file.type.startsWith('video/')) return 'video';
if (file.type === 'application/pdf') return 'pdf';
return 'document';
}
// -- Module B: useProperties hook ---------------------------------------------
function useProperties({ clientId } = {}) {
const { db } = useDb();
const [properties, setProperties] = useState([]);
const [loading, setLoading] = useState(false);
const load = useCallback(async () => {
if (!db) return;
setLoading(true);
const sel = { type: 'property', _deleted: { $ne: true } };
if (clientId) sel.clientId = clientId;
const { docs } = await db.find({ selector: sel, sort: [{ updatedAt: 'desc' }] })?.catch(() => ({ docs: [] }));
setProperties(docs);
setLoading(false);
}, [db, clientId]);
useEffect(() => {
load();
const ch = db.changes({ since: 'now', live: true, selector: { type: 'property' } }).on('change', load);
return () => ch.cancel();
}, [db, load]);
const create = useCallback(async (data) => {
const doc = {
_id: makeId('property'), type: 'property',
...data,
hazards: data.hazards || [], pets: data.pets || [], gateCodes: data.gateCodes || [],
zones: data.zones || [], utilities: data.utilities || {}, maintenancePlans: data.maintenancePlans || [],
createdAt: now(), updatedAt: now(), _deleted: false,
};
await db.put(doc);
return doc;
}, [db]);
const update = useCallback(async (id, changes) => {
const doc = await db.get(id).catch(() => null);
if (doc) await db.put({ ...doc, ...changes, updatedAt: now() });
await load();
}, [db, load]);
const remove = useCallback(async (id) => {
const doc = await db.get(id).catch(() => null);
if (doc) await db.put({ ...doc, _deleted: true, updatedAt: now() });
await load();
}, [db, load]);
const getProperty = useCallback(async (id) => {
return db.get(id).catch(() => null);
}, [db]);
return { properties, loading, create, update, remove, getProperty, refresh: load };
}

export { makeId, ts, rand, now, DbCtx, DbProvider, useDb, ctx, useSyncStatus, seedDatabaseIfEmpty, info, docs, useIDBCollection, ch, persist, next, toWrite, useUploadQueue, enqueueUpload, entry, processUploadQueue, CLOUD_CONFIG, CloudStorageClient, res, xhr, cloudKey, mediaId, blobUrl, thumbUrl, doc, processUploadQueueWithCloud, all, queued, mediaDoc, SYNC_CONFIG, SyncEngine, tick, checkpoint, toSync, couchUrl, useSyncEngine, useIDBStats, refresh, useQueueStats, update, c, useMedia, queue, load, sel, addFiles, deleteMedia, inferMediaCategory, useProperties, create, remove, getProperty };

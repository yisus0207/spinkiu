// Cola de evidencias pendientes (captura offline) guardada en IndexedDB.
// IndexedDB soporta cientos de MB, a diferencia de localStorage (~5 MB),
// por eso aquí sí caben fotos en alta calidad tomadas sin conexión.

const DB_NAME = 'spinkiu';
const DB_VERSION = 1;
const STORE = 'pendingEvidence';
const LEGACY_KEY = 'spinkiu_evidence_pending';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Mueve la cola vieja de localStorage (si existe) a IndexedDB (una sola vez)
async function migrateLegacyQueue(): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      for (const item of list) {
        try { await putPendingEvidence(item); } catch { /* noop */ }
      }
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* noop */ }
}

export async function getAllPendingEvidence(): Promise<any[]> {
  if (typeof indexedDB === 'undefined') return [];
  try {
    await migrateLegacyQueue();
    const db = await openDB();
    return await new Promise<any[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function putPendingEvidence(item: any): Promise<void> {
  if (typeof indexedDB === 'undefined') throw new Error('IndexedDB no disponible');
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function deletePendingEvidence(id: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* noop */
  }
}

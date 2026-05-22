// Stores per-pipeline-mode work-in-progress so that redirecting to
// /buy-credits and coming back does not lose the user's inputs.
// Mode: "image" | "references".

const DB_NAME = "merge-pending-sessions";
const STORE = "pending";
const VERSION = 1;
const memoryPending = new Map();

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePending(mode, data) {
  // Keep an in-memory copy for route changes within the same SPA session.
  // This preserves raw File objects that may be difficult to persist reliably.
  memoryPending.set(mode, data);

  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(data, mode);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadPending(mode) {
  if (memoryPending.has(mode)) {
    return memoryPending.get(mode);
  }

  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(mode);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function clearPending(mode) {
  memoryPending.delete(mode);

  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(mode);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

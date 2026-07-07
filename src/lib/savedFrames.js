// Saved opening/closing frame defaults: the user's last-used frame configs,
// including the uploaded image as a base64 data URL. IndexedDB rather than
// localStorage because a single phone photo as base64 can blow past the
// ~5MB localStorage quota. Mirrors src/lib/pendingSession.js.

const DB_NAME = "merge-saved-frames";
const STORE = "frames";
const VERSION = 1;

export function isEmptyFrame(frame) {
  if (!frame) return true;
  return (
    !frame.enabled &&
    !frame.useUpload &&
    !frame.customPrompt &&
    !frame.textOverlay &&
    !frame.description &&
    !frame.uploadedImage
  );
}

// Strip the frame state down to the persistable fields. The File object is
// not stored (see pendingSession.js); only its name survives, so the File
// can be rebuilt from the data URL on restore.
export function toSavedFrame(frame) {
  frame = frame || {};
  return {
    enabled: !!frame.enabled,
    useUpload: !!frame.useUpload,
    customPrompt: frame.customPrompt || "",
    textOverlay: frame.textOverlay || "",
    description: frame.description || "",
    uploadedImage: frame.uploadedImage || null,
    uploadedName: frame.uploadedFile?.name || null,
  };
}

// Rebuild wizard state from a saved record. The File is reconstructed from
// the data URL (same fetch->blob->File pattern as the pending-draft
// rehydrate in ImagePipelineCreator) so the upload path works unchanged.
export async function hydrateFrameConfig(saved) {
  saved = saved || {};
  const config = {
    enabled: !!saved.enabled,
    useUpload: !!saved.useUpload,
    customPrompt: saved.customPrompt || "",
    textOverlay: saved.textOverlay || "",
    description: saved.description || "",
    uploadedImage: saved.uploadedImage || null,
    uploadedFile: null,
  };
  if (saved.uploadedImage) {
    try {
      const response = await fetch(saved.uploadedImage);
      const blob = await response.blob();
      config.uploadedFile = new File([blob], saved.uploadedName || "frame.png", {
        type: blob.type,
      });
    } catch {
      // Keep the preview-only config; the user can re-upload.
    }
  }
  return config;
}

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

export async function saveSavedFrame(kind, data) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(data, kind);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadSavedFrames() {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const result = { opening: null, closing: null };
      const reqOpening = store.get("opening");
      reqOpening.onsuccess = () => {
        result.opening = reqOpening.result || null;
      };
      const reqClosing = store.get("closing");
      reqClosing.onsuccess = () => {
        result.closing = reqClosing.result || null;
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function clearSavedFrame(kind) {
  const db = await openDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(kind);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

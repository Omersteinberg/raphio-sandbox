# Saved Creation Defaults Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remember the user's last-used creation choices (style, duration, aspect ratio, voice, music, opening/closing frames incl. uploaded images) and pre-fill them on the next new video.

**Architecture:** Scalar choices persist in localStorage via the existing `src/lib/preferences.js` pattern and restore synchronously as `useState` initializers. Frame configs (which carry base64 images) persist in a new IndexedDB module mirroring `src/lib/pendingSession.js` and restore in `ImagePipelineCreator`'s existing mount rehydrate effect. Auto-save effects in the session hooks write through on every change; resets restore saved defaults instead of factory values.

**Tech Stack:** React 19 + Vite, plain localStorage / IndexedDB (no new dependencies).

**Spec:** `docs/superpowers/specs/2026-07-07-saved-creation-defaults-design.md`

## Global Constraints

- **Do NOT commit.** The user commits manually. No `git add` / `git commit` at any step.
- No test infrastructure exists in this repo. Every task verifies via `npm run build` (catches syntax/import errors) plus a manual browser check with the dev server (`npm run dev`, backend `merge-api` running for full-wizard checks).
- No new UI. No backend changes. Do not touch `videoModel`, `enableBridges`, `generatedFrameImages`, or the pending-draft (`pendingSession.js`) behavior.
- The repo has uncommitted changes in `PromptStep.jsx`, `Creator.jsx`, `SettingsPage.jsx`, `BuyCreditsPage.jsx` — leave them intact; none of the files this plan touches overlap except reads.
- After all tasks: run the `vercel-react-best-practices` skill against the modified files and report findings in `file:line` format (per CLAUDE.md).

---

### Task 1: JSON prefs + creation defaults in `preferences.js`

**Files:**
- Modify: `src/lib/preferences.js`

**Interfaces:**
- Produces: `getJsonPref(key, fallback)`, `setJsonPref(key, value)`, `getCreationDefaults() -> { style: string, targetDuration: number, aspectRatio: string, voiceId: string, backgroundMusic: boolean }`, `saveCreationDefaults({ style, targetDuration, aspectRatio, voiceId, backgroundMusic })`, and new `PREF_KEYS` entries `lastStyle`, `lastDuration`, `lastAspectRatio`, `lastVoiceId`, `lastMusic`. Tasks 3–5 import these.

- [ ] **Step 1: Add the new keys**

In `src/lib/preferences.js`, extend `PREF_KEYS`:

```js
export const PREF_KEYS = {
  autoApproveReferences: "autoApprove:references:v1",
  autoApproveScript: "autoApprove:script:v1",
  autoApproveBridges: "autoApprove:bridges:v1",
  autoApproveFrames: "autoApprove:frames:v1",
  autoApproveGenerate: "autoApprove:generate:v1",
  // Last-used creation choices ("saved defaults") — auto-saved by the session
  // hooks, restored as the initial values for the next new video.
  lastStyle: "lastStyle:v1",
  lastDuration: "lastDuration:v1",
  lastAspectRatio: "lastAspectRatio:v1",
  lastVoiceId: "lastVoiceId:v1",
  lastMusic: "lastMusic:v1",
};
```

- [ ] **Step 2: Add JSON helpers and the creation-defaults API**

Append to `src/lib/preferences.js` (after `setBoolPref`, before `getAutoApprove`):

```js
export function getJsonPref(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback; // storage unavailable or corrupt value
  }
}

export function setJsonPref(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable — ignore */
  }
}

// Hardcoded fallbacks matching the session hooks' historical initial state.
const CREATION_FALLBACKS = {
  style: "realistic",
  targetDuration: 30,
  aspectRatio: "16:9",
  voiceId: "adam",
  backgroundMusic: true,
};

const KNOWN_ASPECT_RATIOS = ["16:9", "9:16"];

// One-shot validated read of the saved creation defaults. Stale or corrupt
// storage can never crash the wizard: every field falls back independently.
export function getCreationDefaults() {
  const style = getJsonPref(PREF_KEYS.lastStyle, null);
  const duration = getJsonPref(PREF_KEYS.lastDuration, null);
  const aspect = getJsonPref(PREF_KEYS.lastAspectRatio, null);
  const voice = getJsonPref(PREF_KEYS.lastVoiceId, null);
  const music = getJsonPref(PREF_KEYS.lastMusic, null);
  return {
    style: typeof style === "string" && style ? style : CREATION_FALLBACKS.style,
    targetDuration:
      Number.isFinite(duration) && duration > 0 ? duration : CREATION_FALLBACKS.targetDuration,
    aspectRatio: KNOWN_ASPECT_RATIOS.includes(aspect) ? aspect : CREATION_FALLBACKS.aspectRatio,
    voiceId: typeof voice === "string" && voice ? voice : CREATION_FALLBACKS.voiceId,
    backgroundMusic: typeof music === "boolean" ? music : CREATION_FALLBACKS.backgroundMusic,
  };
}

// Write-through of the last-used choices; called from the session hooks'
// auto-save effects on every change.
export function saveCreationDefaults({ style, targetDuration, aspectRatio, voiceId, backgroundMusic }) {
  setJsonPref(PREF_KEYS.lastStyle, style);
  setJsonPref(PREF_KEYS.lastDuration, targetDuration);
  setJsonPref(PREF_KEYS.lastAspectRatio, aspectRatio);
  setJsonPref(PREF_KEYS.lastVoiceId, voiceId);
  setJsonPref(PREF_KEYS.lastMusic, backgroundMusic);
}
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 4: Manual verify in browser console**

With `npm run dev` running, open the app, and in DevTools console:

```js
localStorage.setItem("merge:pref:lastStyle:v1", JSON.stringify("cinematic"));
localStorage.setItem("merge:pref:lastDuration:v1", JSON.stringify(45));
localStorage.setItem("merge:pref:lastAspectRatio:v1", JSON.stringify("bogus"));
```

Then load the module straight off the dev server and check the validated read:

```js
const p = await import("/src/lib/preferences.js");
p.getCreationDefaults();
// -> { style: "cinematic", targetDuration: 45, aspectRatio: "16:9", voiceId: "adam", backgroundMusic: true }
// (bogus aspect fell back, unset voice/music fell back)
```

Clean up the three keys afterwards (`localStorage.removeItem("merge:pref:lastStyle:v1")` etc.).

---

### Task 2: `savedFrames.js` IndexedDB module

**Files:**
- Create: `src/lib/savedFrames.js`

**Interfaces:**
- Produces: `isEmptyFrame(frame) -> boolean`, `toSavedFrame(frame) -> saved record`, `hydrateFrameConfig(saved) -> Promise<frame state object>`, `saveSavedFrame(kind, data) -> Promise<void>`, `loadSavedFrames() -> Promise<{opening, closing}>`, `clearSavedFrame(kind) -> Promise<void>`. `kind` is `"opening" | "closing"`. Tasks 3 and 5 import these.
- Consumes: nothing.

- [ ] **Step 1: Create the module**

Create `src/lib/savedFrames.js`:

```js
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
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual verify in browser console**

With the dev server open, in DevTools console (top frame):

```js
const m = await import("/src/lib/savedFrames.js");
m.isEmptyFrame({ enabled: false, useUpload: false, customPrompt: "", textOverlay: "", description: "", uploadedImage: null, uploadedFile: null }); // -> true
m.isEmptyFrame({ enabled: true, useUpload: false, customPrompt: "", textOverlay: "", description: "", uploadedImage: null }); // -> false
await m.saveSavedFrame("opening", { enabled: true, useUpload: false, customPrompt: "sunrise", textOverlay: "Ch 1", description: "", uploadedImage: null, uploadedName: null });
await m.loadSavedFrames(); // -> { opening: { enabled: true, customPrompt: "sunrise", ... }, closing: null }
await m.clearSavedFrame("opening");
await m.loadSavedFrames(); // -> { opening: null, closing: null }
```

Expected: outputs as commented. (DB `merge-saved-frames` is visible under DevTools → Application → IndexedDB.)

---

### Task 3: Wire save + restore into `useSession.js` (image pipeline)

**Files:**
- Modify: `src/hooks/session/useSession.js`

**Interfaces:**
- Consumes: `getCreationDefaults`, `saveCreationDefaults` from `@/lib/preferences` (Task 1); `isEmptyFrame`, `toSavedFrame`, `saveSavedFrame` from `@/lib/savedFrames` (Task 2).
- Produces: no API change — the hook's return shape is untouched. Behavior: scalars init from saved defaults, all changes auto-save, `reset()` restores saved defaults.

- [ ] **Step 1: Add imports and move `IMAGE_PIPELINE_STYLES` to module scope**

Add to the imports at the top of `src/hooks/session/useSession.js`:

```js
import { getCreationDefaults, saveCreationDefaults } from "@/lib/preferences";
import { isEmptyFrame, toSavedFrame, saveSavedFrame } from "@/lib/savedFrames";
```

The hook body currently declares (around line 190):

```js
  // Image pipeline only supports original 4 styles
  const IMAGE_PIPELINE_STYLES = ['realistic', 'animated', 'cinematic', 'surreal'];
```

Delete that line from inside the hook and add at module scope (above `export function useSession`), together with a validation helper:

```js
// Image pipeline only supports original 4 styles
const IMAGE_PIPELINE_STYLES = ['realistic', 'animated', 'cinematic', 'surreal'];

// A saved style can come from the references pipeline (full palette); the
// image pipeline falls back rather than starting on an unsupported style.
function imageSafeStyle(style) {
  return IMAGE_PIPELINE_STYLES.includes(style) ? style : "realistic";
}
```

The existing usage `styles.filter(s => IMAGE_PIPELINE_STYLES.includes(s.id))` (in the `fetchStyles` effect, around line 194) keeps working unchanged.

- [ ] **Step 2: Restore saved defaults in the scalar initializers**

Replace (currently lines 89–94):

```js
  const [style, setStyle] = useState("realistic");
  const [targetDuration, setTargetDuration] = useState(30);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [voiceId, setVoiceId] = useState("adam");
  const [videoModel, setVideoModel] = useState("KLING");
  const [backgroundMusic, setBackgroundMusic] = useState(true);
```

with:

```js
  // Last-used creation choices (saved defaults) — read once on mount.
  const [savedDefaults] = useState(getCreationDefaults);
  const [style, setStyle] = useState(() => imageSafeStyle(savedDefaults.style));
  const [targetDuration, setTargetDuration] = useState(savedDefaults.targetDuration);
  const [aspectRatio, setAspectRatio] = useState(savedDefaults.aspectRatio);
  const [voiceId, setVoiceId] = useState(savedDefaults.voiceId);
  const [videoModel, setVideoModel] = useState("KLING");
  const [backgroundMusic, setBackgroundMusic] = useState(savedDefaults.backgroundMusic);
```

- [ ] **Step 3: Add the auto-save effects**

Add after the frame-configuration state declarations (after the `generatedFrameImages` `useState`, around line 132):

```js
  // Auto-save last-used choices so the next new video starts from them.
  // Also fires when a resumed session loads its values ("last touched wins").
  useEffect(() => {
    saveCreationDefaults({ style, targetDuration, aspectRatio, voiceId, backgroundMusic });
  }, [style, targetDuration, aspectRatio, voiceId, backgroundMusic]);

  // Persist frame configs (incl. the uploaded image's data URL) as defaults
  // for the next video. Empty configs are skipped: the mount-time initial
  // state and reset() would otherwise wipe the saved frames before the
  // restore in ImagePipelineCreator applies them.
  useEffect(() => {
    if (isEmptyFrame(openingFrame)) return;
    saveSavedFrame("opening", toSavedFrame(openingFrame)).catch((err) =>
      console.warn("[useSession] frame autosave failed:", err)
    );
  }, [openingFrame]);

  useEffect(() => {
    if (isEmptyFrame(closingFrame)) return;
    saveSavedFrame("closing", toSavedFrame(closingFrame)).catch((err) =>
      console.warn("[useSession] frame autosave failed:", err)
    );
  }, [closingFrame]);
```

- [ ] **Step 4: Make `reset()` restore saved defaults**

In `reset()` (currently lines 1495–1498), replace:

```js
    setStyle("realistic");
    setVoiceId("adam");
    setVideoModel("KLING");
    setBackgroundMusic(true);
```

with:

```js
    const defaults = getCreationDefaults();
    setStyle(imageSafeStyle(defaults.style));
    setVoiceId(defaults.voiceId);
    setVideoModel("KLING");
    setBackgroundMusic(defaults.backgroundMusic);
```

Leave the two `setOpeningFrame({ enabled: false, ... })` / `setClosingFrame({ ... })` lines unchanged — the empty-skip guard in Step 3 keeps those resets from overwriting saved frames.

- [ ] **Step 5: Build check**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Manual verify (scalars round-trip)**

With dev server + backend running, on the image-pipeline prompt step: pick style `animated`, duration `45s`, aspect `9:16`. Reload the page (fresh `/create`, no `?session=`). Expected: those three choices are pre-selected. DevTools → Application → Local Storage shows `merge:pref:lastStyle:v1` = `"animated"`, `merge:pref:lastDuration:v1` = `45`, `merge:pref:lastAspectRatio:v1` = `"9:16"`.

---

### Task 4: Wire save + restore into `useSessionBase.js` and `useIntroSession.js`

**Files:**
- Modify: `src/hooks/session/useSessionBase.js`
- Modify: `src/hooks/session/useIntroSession.js`

**Interfaces:**
- Consumes: `getCreationDefaults`, `saveCreationDefaults`, `setJsonPref`, `PREF_KEYS` from `@/lib/preferences` (Task 1).
- Produces: no API change to either hook. Behavior: references pipeline (and any base-derived pipeline) shares the same saved defaults; intro pipeline shares the aspect ratio.

- [ ] **Step 1: `useSessionBase.js` — imports, initializers, auto-save, reset**

Add to imports:

```js
import { getCreationDefaults, saveCreationDefaults } from "@/lib/preferences";
```

Replace the form-state initializers (currently lines 45–51):

```js
  const [userPrompt, setUserPrompt] = useState("");
  const [style, setStyle] = useState("realistic");
  const [targetDuration, setTargetDuration] = useState(30);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [voiceId, setVoiceId] = useState("adam");
  const [videoModel, setVideoModel] = useState("KLING");
  const [backgroundMusic, setBackgroundMusic] = useState(true);
```

with:

```js
  const [userPrompt, setUserPrompt] = useState("");
  // Last-used creation choices (saved defaults) — read once on mount. The
  // references pipeline supports the full style palette, so no style
  // validation here (unlike useSession.js).
  const [savedDefaults] = useState(getCreationDefaults);
  const [style, setStyle] = useState(savedDefaults.style);
  const [targetDuration, setTargetDuration] = useState(savedDefaults.targetDuration);
  const [aspectRatio, setAspectRatio] = useState(savedDefaults.aspectRatio);
  const [voiceId, setVoiceId] = useState(savedDefaults.voiceId);
  const [videoModel, setVideoModel] = useState("KLING");
  const [backgroundMusic, setBackgroundMusic] = useState(savedDefaults.backgroundMusic);
```

Add the auto-save effect right after the generation-state declarations (after `generationError`, around line 62):

```js
  // Auto-save last-used choices so the next new video starts from them.
  // Also fires when a resumed session loads its values ("last touched wins").
  useEffect(() => {
    saveCreationDefaults({ style, targetDuration, aspectRatio, voiceId, backgroundMusic });
  }, [style, targetDuration, aspectRatio, voiceId, backgroundMusic]);
```

In `resetBase` (currently lines 496–500), replace:

```js
    setStyle("cinematic");
    setAspectRatio("16:9");
    setVoiceId("adam");
    setVideoModel("KLING");
    setBackgroundMusic(true);
```

with:

```js
    // Restore saved defaults, not factory values — otherwise the auto-save
    // effect would overwrite the user's saved choices on every reset. (This
    // also aligns the reset style with the mount default; it was "cinematic"
    // here but "realistic" on mount.)
    const defaults = getCreationDefaults();
    setStyle(defaults.style);
    setAspectRatio(defaults.aspectRatio);
    setVoiceId(defaults.voiceId);
    setVideoModel("KLING");
    setBackgroundMusic(defaults.backgroundMusic);
```

- [ ] **Step 2: `useIntroSession.js` — aspect ratio only**

Add to imports:

```js
import { getCreationDefaults, setJsonPref, PREF_KEYS } from "@/lib/preferences";
```

Replace line 49:

```js
  const [aspectRatio, setAspectRatio] = useState("16:9");
```

with:

```js
  // Aspect ratio shares the cross-pipeline saved default; style stays
  // intro-specific ("cinematic") and is intentionally not persisted.
  const [aspectRatio, setAspectRatio] = useState(() => getCreationDefaults().aspectRatio);
```

Add an auto-save effect directly after the intro's brief-state declarations (after `showcaseFiles`, line 50):

```js
  useEffect(() => {
    setJsonPref(PREF_KEYS.lastAspectRatio, aspectRatio);
  }, [aspectRatio]);
```

In the intro reset (line 219), replace:

```js
    setAspectRatio("16:9");
```

with:

```js
    setAspectRatio(getCreationDefaults().aspectRatio);
```

Line 218's `setStyle("cinematic")` stays unchanged.

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual verify (cross-pipeline sharing)**

In the image pipeline pick voice ≠ `adam` and turn background music off, then open the references pipeline (`/create`, references mode) fresh. Expected: the same voice and music-off are pre-selected there. Local Storage shows `merge:pref:lastVoiceId:v1` and `merge:pref:lastMusic:v1` = `false`.

---

### Task 5: Restore saved frames in `ImagePipelineCreator.jsx` + end-to-end verification

**Files:**
- Modify: `src/pages/ImagePipelineCreator.jsx` (rehydrate effect, lines 124–159)

**Interfaces:**
- Consumes: `loadSavedFrames`, `hydrateFrameConfig` from `@/lib/savedFrames` (Task 2); `setOpeningFrame` / `setClosingFrame` already destructured from `useSession` (lines 88, 90).

- [ ] **Step 1: Extend the rehydrate effect**

Add the import:

```js
import { loadSavedFrames, hydrateFrameConfig } from "@/lib/savedFrames";
```

In the mount effect at line 124, after the pending-draft block (after `if (files.length > 0) addImages(files);` closes its `if`, still inside the `try`), add:

```js
        // Restore saved frame defaults. Skipped when resuming an existing
        // session (?session=): the session's own frames load from the
        // backend. The pending draft above doesn't carry frames, so there is
        // no overlap; draft prompt/style still win over saved defaults.
        if (!new URLSearchParams(window.location.search).has("session")) {
          const savedFrames = await loadSavedFrames();
          if (!cancelled && savedFrames.opening) {
            const config = await hydrateFrameConfig(savedFrames.opening);
            if (!cancelled) setOpeningFrame(config);
          }
          if (!cancelled && savedFrames.closing) {
            const config = await hydrateFrameConfig(savedFrames.closing);
            if (!cancelled) setClosingFrame(config);
          }
        }
```

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: End-to-end manual verification (full spec matrix)**

With dev server + backend running:

1. **Scalars:** pick non-default style/duration/aspect/voice/music → reload `/create` → all pre-filled.
2. **Frames:** enable the opening frame, upload an image, set a text overlay → reload `/create` → frame is enabled with image preview and overlay text back. DevTools → Application → IndexedDB → `merge-saved-frames` shows the record.
3. **Resume:** open an existing session via `/create?session=<id>` → session's own values load; saved frames are NOT applied over them.
4. **Cross-pipeline:** references mode shows the same scalar defaults.
5. **Style fallback:** in DevTools set `localStorage.setItem("merge:pref:lastStyle:v1", JSON.stringify("watercolor"))` (a references-only style) → reload image pipeline → style falls back to `realistic`; references pipeline shows `watercolor`.
6. **Reset safety:** after a full video completes, use "Create New" → wizard starts with saved defaults, and Local Storage / IndexedDB still hold the saved values (not factory-reset ones).

- [ ] **Step 4: React best-practices review (per CLAUDE.md)**

Run the `vercel-react-best-practices` skill against: `src/lib/preferences.js`, `src/lib/savedFrames.js`, `src/hooks/session/useSession.js`, `src/hooks/session/useSessionBase.js`, `src/hooks/session/useIntroSession.js`, `src/pages/ImagePipelineCreator.jsx`. Report findings in `file:line` format.

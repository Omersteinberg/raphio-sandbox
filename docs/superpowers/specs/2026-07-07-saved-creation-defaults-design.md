# Saved Creation Defaults — Design

**Date:** 2026-07-07
**Status:** Approved

## Goal

Remember the user's last-used creation choices — style, video length (target duration), aspect ratio, voice, background music, and the full opening/closing frame configuration (including uploaded frame images) — so the next new video starts pre-filled with them.

## Decisions (from brainstorming)

- **Storage:** client-side only. Scalars in localStorage; frame configs (which carry base64 images) in IndexedDB. No backend changes.
- **Frames scope:** everything, including the uploaded frame image.
- **Pipelines:** one shared set of defaults across all pipelines (image, references, intro). Frames apply only to the image pipeline, the only place they exist.
- **Save trigger:** auto-save silently whenever a choice changes. No new UI.

## Architecture

### Storage layer

**`src/lib/preferences.js` (extend):**
- Add generic `getJsonPref(key, fallback)` / `setJsonPref(key, value)` alongside the existing bool helpers. Same `merge:pref:` prefix, same try/catch guard for storage-disabled browsers, same `:v1` versioned-key convention.
- New keys in `PREF_KEYS`: `lastStyle:v1`, `lastDuration:v1`, `lastAspectRatio:v1`, `lastVoiceId:v1`, `lastMusic:v1`.
- Add `getCreationDefaults()`: one-shot read of all five, with type/value validation and hardcoded fallbacks (`"realistic"`, `30`, `"16:9"`, `"adam"`, `true`).

**`src/lib/savedFrames.js` (new):**
- Mirrors `src/lib/pendingSession.js`: its own small IndexedDB (`merge-saved-frames`, one object store, keys `"opening"` / `"closing"`). No in-memory Map (unlike `pendingSession.js`): nothing non-serializable is stored, and reads happen once on mount.
- API: `saveSavedFrame(kind, config)`, `loadSavedFrames()` (returns `{ opening, closing }`, either may be null), `clearSavedFrame(kind)`.
- Persisted shape per kind: `{ enabled, useUpload, customPrompt, textOverlay, description, uploadedImage, uploadedName }` where `uploadedImage` is the base64 data URL already held in state. The `File` object is NOT persisted; it is rebuilt on restore via `fetch(dataUrl) → blob → new File(...)` — the exact pattern already used by the pending-draft rehydrate in `ImagePipelineCreator.jsx:141`.

### Save path (auto, on change)

- `useSession.js` (image pipeline) and `useSessionBase.js` (references + other base-derived pipelines): one small effect per hook watching `style`, `targetDuration`, `aspectRatio`, `voiceId`, `backgroundMusic`, writing through to localStorage on change. Writing the just-restored value back on mount is harmless (same value).
- `useSession.js` only: an effect watching `openingFrame` / `closingFrame` that persists them to IndexedDB via `saveSavedFrame`. Per-keystroke writes are acceptable — the existing step-0 draft autosave already writes IndexedDB per keystroke, and the frame image is already a data URL in state (no re-encoding).
- **The frames save-effect skips any config that deep-equals the empty default** (`isEmptyFrame()` guard). This covers two clobber paths at once: the mount-time run (initial state is empty, and it would otherwise overwrite saved frames before the async restore in `ImagePipelineCreator` applies them) and `reset()` (which sets frames back to empty). Known trade-off: a user who manually clears every frame field back to exactly-empty won't persist that wipe; disabling the frame (`enabled: false` with other fields intact) persists normally.
- **Resets restore saved defaults, not factory defaults.** `reset()` in `useSession.js`, `resetBase()` in `useSessionBase.js`, and the intro reset currently hard-set style/voice/music/aspect back to hardcoded values — with the auto-save effects, that would silently overwrite the user's saved choices. They will call `getCreationDefaults()` instead (with image-pipeline style validation in `useSession.js`). Side benefit: "start over" lands on the user's preferred settings. Note this changes `resetBase()`'s style from hardcoded `"cinematic"` to the saved/fallback value, aligning it with the mount default (`"realistic"`), which was already inconsistent.
- Known, accepted side effect: resuming an old session loads its values from the backend, which also updates the saved defaults ("last touched video wins").

### Restore path

- **Scalars (synchronous):** `useState(() => getCreationDefaults().x)` initializers in:
  - `useSession.js` — all five; the saved style is validated against `IMAGE_PIPELINE_STYLES`, falling back to `"realistic"` if the saved style is references-only.
  - `useSessionBase.js` — all five.
  - `useIntroSession.js` — aspect ratio only, by **removing its local `aspectRatio` shadow** and destructuring base's instead. (Originally designed as a local initializer + dedicated save effect, but review found base's auto-save effect would clobber the shared pref with its stale shadow copy whenever voice/music changed. Single source of truth in `useSessionBase` closes that and also lets a resumed intro session's aspect ratio reach the intro UI.)
- **Frames (async):** restored in the same mount effect in `ImagePipelineCreator.jsx` that rehydrates the pending draft. That effect already runs only on a fresh wizard mount, so:
  - Session resume (`?session=`) is unaffected — the session's own frames win.
  - The pending draft (work in progress) takes precedence over saved defaults where they overlap.
  - `uploadedFile` is rebuilt from `uploadedImage` before calling `setOpeningFrame` / `setClosingFrame` so the upload path works unchanged.

### Validation & edge cases

- `getCreationDefaults()` validates on read: aspect ratio must be in the known set, duration a positive finite number, style/voice non-empty strings, music coerced to boolean. Anything invalid → hardcoded fallback. Stale or corrupt storage can never crash the wizard.
- Storage unavailable (locked-down browser): localStorage helpers silently return fallbacks (existing behavior); `savedFrames.js` catches and warns like `pendingSession.js` callers do.
- A saved `voiceId` that no longer exists in the fetched voice list is tolerated: it is a plain string default and the voice UI already handles selection from the fetched list.
- Out of scope (intentionally not persisted): `videoModel`, `enableBridges`, user prompt, images grid. YAGNI.

### Testing

No test infrastructure exists in this repo. Manual verification:
1. Pick non-default style/duration/aspect/voice/music, reload, start a new video → choices are pre-filled.
2. Enable an opening frame with an uploaded image + text overlay, reload → frame config and image are back.
3. Switch to the references pipeline → same scalar defaults appear.
4. Resume an existing session → session's own values load, unaffected by saved defaults.
5. Saved references-only style + image pipeline → falls back to `realistic`.

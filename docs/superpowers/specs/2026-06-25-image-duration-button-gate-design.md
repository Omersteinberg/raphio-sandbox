# Image Pipeline — Gate "Create my video" on Image-Count vs. Duration

**Date:** 2026-06-25
**Status:** Design — pending implementation
**Scope:** Frontend only (`merge-frontend`). Reuses the existing backend `/estimate-duration` endpoint; no backend changes.

## Problem

On the image pipeline prompt screen, a user can upload more images than the chosen
video length can hold (an "overshoot"). The pipeline silently makes a longer video
instead of warning or blocking. The advisory component that was built for this
(`DurationEstimate.jsx`) is imported into `PromptStep.jsx` but **never rendered**, so
the user sees no message and the "Create my video" button stays enabled.

## Goal

When the user has **too many images** for the selected duration, surface the existing
advisory **and disable** the "Create my video" button until they resolve it — by
removing images or increasing the duration. Too-few-images is unaffected (still allowed,
handled by AI fill / a shorter video).

## Decisions (from brainstorming)

1. **Block only on too-many.** `too_many_images` disables the button. `exact_fit` and
   `needs_ai_fill` (too few) stay enabled.
2. **Full advisory.** Render the complete `DurationEstimate` banner — too-many blocks,
   and too-few shows its guidance and auto-enables AI fill / suggests shortening, exactly
   as the component was built.
3. **Pre-block while unknown.** The button is disabled until an estimate has resolved to
   a confirmed-safe status. It is not optimistically enabled during the initial/unknown
   window.
4. **Fail open on estimate error.** If the estimate request fails, enable the button — a
   flaky estimate endpoint must not block all generation. The backend tolerates a stray
   too-many start.
5. **Drop "Keep longer video."** The too-many banner's `keep` option dismissed the advisory
   and let the user proceed with an overshoot. That contradicts the hard block, so it is
   removed — the only remedies are "Remove N images" or "Set duration to ~Xs".

## Approach

Render `DurationEstimate` (which already fetches the server-side estimate — the single
source of truth for scene budget) and lift its resolved status up to `PromptStep` via a
new `onStatusChange` callback. `PromptStep` gates the button on that status.

Rejected alternatives:
- **Client-side recompute** of the estimate — duplicates backend scene-budget math that
  the backend explicitly warns against drifting from.
- **Extract the fetch into a shared hook** — cleaner separation but more refactor than
  this change warrants.

## Changes

### `src/components/session/DurationEstimate.jsx`
- Add prop `onStatusChange(status: string | null)`.
- Call `onStatusChange(null)` at the **start** of each (re)evaluation (inputs changed /
  no images), so the parent re-blocks while a fresh estimate is pending.
- Call `onStatusChange(data.status)` after a successful fetch.
- On fetch error, call `onStatusChange('error')` (parent treats as safe → fail open).
- No change to the banner's existing rendering or auto-AI-fill behavior.

### `src/components/session/PromptStep.jsx`
- Add `durationStatus` state, initialized `null`, updated via `onStatusChange`.
- Render `<DurationEstimate />` **in image mode only**, positioned just above the
  "Create my video" CTA block, wired to existing setters:
  - `imageCount={images?.length ?? 0}`, `targetDuration`, `enableBridges`
  - `onSetDuration` → `setTargetDuration`
  - `onToggleAiFill` → `setEnableBridges`
  - `onRemoveImages(n)` → remove the last *n* images using the existing `removeImage`
    (remove from highest index down so lower indices stay stable)
  - `onUploadMore` → open the existing hidden file input
  - `onStatusChange` → `setDurationStatus`
- Extend the image-mode gate:
  ```js
  const SAFE_DURATION_STATUSES = ['exact_fit', 'needs_ai_fill', 'no_target', 'error'];
  const durationOk = SAFE_DURATION_STATUSES.includes(durationStatus);
  const canStart = isReferencesMode
    ? /* unchanged */
    : userPrompt?.trim() && images?.length > 0 && durationOk;
  ```
  (`null` / `too_many_images` → not OK → disabled.)
- When `durationStatus === 'too_many_images'`, change the CTA subtext from
  "Usually ready in 30–60 seconds" to **"Remove some images or increase the length to
  continue."**

## Behavior

| State | Banner | Button |
| --- | --- | --- |
| No images | none | disabled (no images) |
| Estimate pending (initial / after a change) | last banner (if any) | **disabled** |
| Too many images | amber: "Remove N images" / "Set duration to ~Xs" | **disabled** |
| Exact fit | green confirmation | enabled |
| Too few images | guidance (AI fill / shorten / upload more) | enabled |
| Estimate request failed | none | enabled (fail open) |
| References mode | none | unchanged |

## Edge cases

- **Debounce flicker:** after each image add/remove or duration change, the button shows
  disabled for the ~300 ms debounce + fetch before re-enabling. This is the intended
  "disabled until confirmed" behavior.
- **Default duration:** `targetDuration` defaults to 30s, so the `no_target` path does not
  normally occur here; it is treated as safe regardless.
- **Max images:** the existing 10-image hard cap (toast) is unchanged and independent of
  this duration gate.

## Out of scope

- Backend changes.
- References pipeline.
- A hard guard inside `handleStart`/`startSession` (the disabled button is the gate; the
  backend already tolerates a too-many start).

## Testing

Per project preference, no automated test files. Verification is manual + a production
build (`npm run build`) load-check:
- Upload more images than a short duration allows → banner appears, button disables.
- Click "Set duration to ~Xs" or "Remove N images" → status clears, button re-enables.
- Reduce images / increase duration to exact-fit → button enabled.
- Confirm references mode is unchanged.

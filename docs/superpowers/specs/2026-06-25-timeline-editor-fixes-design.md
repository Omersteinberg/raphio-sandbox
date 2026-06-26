# Timeline Editor Fixes — Design

- **Date:** 2026-06-25
- **Status:** Approved (pending spec review)
- **Repos:** `merge-frontend` (editor UI), `merge-api` (export pipeline)
- **Scope:** Two coordinated changes to the timeline editor, plus a regression-safety pass.
  1. **Cut via a Clip Trim Editor** — explicit In/Out trim with preview + confirm, replacing imprecise edge-dragging. No time-stretch.
  2. **Universal-clock playback** — a single Web Audio master clock drives the playhead and slaves video to it, so the playhead never leads the sound and all audio tracks mix in preview.

---

## 1. Background & problem statement

The timeline editor lets users arrange video clips, narration, and background music on a multi-track timeline and export a final video. Two issues surfaced:

- **Resizing/cutting is wrong and the interaction is poor.** Today, dragging a clip's edge *time-stretches* it by recomputing `speed` to fit ([TimelineCanvas.jsx:390-395](../../../src/components/timeline/TimelineCanvas.jsx)) — extending slows it (choppy/warbly), shortening speeds it up. We ruled out smooth speed-ramping (bundled ffmpeg is a 2018 build with no `librubberband`; `minterpolate` is too slow for shared hosting). Separately, **edge-dragging is a bad way to cut**: imprecise, easy to overshoot, fights move/snap, and gives no "this is what I'm removing" confirmation. Decision: **cut only (no speed), driven by an explicit Clip Trim Editor.**

- **Playhead leads the media, and tracks don't mix.** The playhead is advanced by a wall-clock `requestAnimationFrame` loop ([useTimeline.js:340-372](../../../src/hooks/timeline/useTimeline.js)) that starts the instant Play is pressed, while media spins up; drift is only reconciled past 0.3s ([VideoPreview.jsx:47](../../../src/components/timeline/VideoPreview.jsx)). And `VideoPreview` has a **single `<audio>` element**, so it previews narration *or* music but never both — preview doesn't match the mixed export.

## 2. Goals / non-goals

**Goals**
- Cutting/shortening a clip is **explicit and confirmable**: the user sets In/Out points on the clip's source, sees exactly what is kept vs removed, previews it, and confirms with Apply.
- `speed` is always `1.0`; cuts work identically for video, narration, and music; the kept region survives export.
- The playhead stays locked to the audible media from the moment Play is pressed.
- All audio tracks (narration + music + uploads) play together in preview, matching the export mix.
- No new regressions; fix adjacent latent bugs found along the way.

**Non-goals (explicitly deferred)**
- Smooth slow-motion / speed-up (`minterpolate`, `rubberband`, fps ramps); swapping the ffmpeg binary.
- Looping/freeze-frame extension or any clip-lengthening beyond source length.
- Audio while scrubbing (scrub stays silent; audio plays on Play).
- Ripple editing (trimming a clip does not auto-shift later clips; the timeline keeps explicit start times).

---

## 3. Feature 1 — Clip Trim Editor

### 3.1 Interaction model

- **Open:** double-clicking a clip (existing `onItemEdit` → `ItemEditModal`, [TimelineEditor.jsx:308](../../../src/components/timeline/TimelineEditor.jsx)) opens the **Clip Trim Editor**. A small "Trim" affordance on a selected clip / the edit modal can also open it.
- **Remove edge-drag trimming.** Delete the left/right trim handles from `TimelineItem` ([TimelineItem.jsx:133-147](../../../src/components/timeline/TimelineItem.jsx)); keep only the **move** handle (reposition on the timeline). Cutting happens exclusively in the modal.
- The clip's width on the main timeline reflects its trimmed `duration` (read-only there).

### 3.2 Clip Trim Editor — UI

A modal (extend `ItemEditModal` or a new `ClipTrimModal`) that represents the **full source** of the clip and the kept region within it:

- **Preview pane:**
  - Video clip → a `<video>` (the section's `generatedClipUrl`) scrubbable to the current handle.
  - Audio (music/upload/narration) → a **waveform** rendered from `audioAsset.waveformData` (already stored; narration via the `GET /audio/:id/waveform` endpoint), with the kept region highlighted.
- **Trim track:** a horizontal bar spanning `0 → sourceDuration` with two draggable handles — **In** (`trimStart`) and **Out** (`trimEnd`). The kept region is highlighted; removed head/tail are **shaded** ("what you're cutting"). A scrubber shows preview position.
- **Numeric fields:** `Start`, `End`, `Duration` (s, editable, clamped) for precise entry — the "from where" stated exactly.
- **Preview:** a play button that plays only the kept In→Out region so the user hears/sees the result before committing.
- **Confirm:** `Apply` commits; `Cancel` discards. Apply is the explicit confirmation.

Constraints: `In ≥ 0`, `Out ≤ sourceDuration`, `Out − In ≥ minDuration` (0.5s). Cut-only — the kept region can never exceed the source (no extend/stretch).

Source length per item type:
| Item | Source length |
|---|---|
| Video (`sectionId`) | `getSection(sectionId).clipDuration` |
| Narration (`sectionId`, no asset) | `getSection(sectionId).narrationDuration` (fallback `clipDuration`) |
| Music / upload (`audioAssetId`) | `getAudioAsset(audioAssetId).duration` |

### 3.3 Pure trim helper (testable)

`src/lib/timelineTrim.js`:

```js
// computeTrim({ trimStart, trimEnd, sourceDuration, minDuration = 0.5 })
// Clamps In/Out to a valid cut and returns { trimStart, trimEnd, duration, speed: 1.0 }
//   trimStart = clamp(trimStart, 0, sourceDuration - minDuration)
//   trimEnd   = clamp(trimEnd, trimStart + minDuration, sourceDuration)
//   duration  = trimEnd - trimStart
```

The modal calls this on every handle drag / numeric edit to keep the UI valid, and again on Apply.

### 3.4 Commit

On Apply, persist via existing `updateTimelineItem` with `{ trimStart, trimEnd, duration, speed: 1.0 }`. `startTime` (timeline position) is unchanged by trimming — it only changes the clip's length and which source portion plays. The main-timeline clip width updates from the new `duration`.

### 3.5 Why `trimEnd` must be set

The export only cuts when `trimStart > 0 || trimEnd` is truthy:
- Audio: `audioDuration = item.trimEnd ? item.trimEnd - trimStart : item.duration`, trim applied only inside `if (item.trimStart > 0 || item.trimEnd)` ([ffmpeg.service.js:1137](../../../../merge-api/src/services/ffmpeg.service.js)).
- Video: `trimClip` uses `endTime = item.trimEnd || metadata.duration` ([ffmpeg.service.js:898](../../../../merge-api/src/services/ffmpeg.service.js)).

The Trim Editor always writes `trimEnd`, so the cut reaches the export.

### 3.6 Backend guard (merge-api)

`timelineService.updateItem` ([timeline.service.js](../../../../merge-api/src/services/timeline.service.js)): force `speed = 1.0` on any update (defense-in-depth). Continue to accept `trimStart`/`trimEnd`/`duration`/`startTime`/`volume`/`trackIndex`.

### 3.7 Music placement correctness

Clamp the auto-placed music item to `duration = min(timelineDuration, assetDuration)` in `ensureMusicTrackItems` so the clip matches what actually plays and the trim bounds are correct.

### 3.8 Export

No FFmpeg changes. With `speed === 1.0`, `trimClip`/`speedUpAudio` apply the cut and skip `setpts`/`atempo`. Add a test asserting a trimmed item maps to a trim with no speed filter (see §5).

### 3.9 UI cleanup

- Remove the `TimelineItem` trim handles (§3.1) and the speed badge (`hasSpeed`, [TimelineItem.jsx:32,113](../../../src/components/timeline/TimelineItem.jsx)) + unused `Gauge` import.
- Fold any existing speed control in `ItemEditModal` away (keep volume); the modal becomes the Trim Editor (plus volume for audio).
- Show an "trimmed" indicator on trimmed clips on the main timeline (the existing `trimStart > 0` "T" badge, extended to also reflect a set `trimEnd`).

---

## 4. Feature 2 — Universal-clock playback

### 4.1 Principle

One master clock; everything follows it. We use **`AudioContext.currentTime`** — a monotonic, hardware-backed, sample-accurate clock — as the single source of truth for timeline time. Audio is scheduled in the Web Audio graph against this clock; the visual playhead and the video element are *derived from* it. Because the audio you hear **is** the clock, the playhead can never lead it, and there is no drift to reconcile.

References: [web.dev audio sync / `outputLatency`](https://web.dev/articles/audio-output-latency), [MDN BaseAudioContext.currentTime](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime), [paul.cx A/V sync with Web Audio](https://blog.paul.cx/post/audio-video-synchronization-with-the-web-audio-api/), [web.dev rVFC](https://web.dev/articles/requestvideoframecallback-rvfc).

Master time while playing: `timelineTime = playStartOffset + (ctx.currentTime − ctxStartTime)`. `ctx.currentTime` keeps advancing through gaps, so silent stretches need no special handling.

### 4.2 Audio path (the master)

- **Decode cache.** On first Play, `ctx.decodeAudioData` each unique source URL (per-section narration, music, uploads) into an `AudioBuffer`, keyed by URL; cache for the session. Show a brief `audioLoading` state while decoding.
- **Schedule** (on Play / after seek). For each AUDIO item not entirely in the past, build `AudioBufferSourceNode → GainNode(item.volume) → destination` and `source.start(when, offset, duration)`:
  - `when    = ctxStartTime + max(0, item.startTime − playStartOffset)`
  - `offset  = item.trimStart + max(0, playStartOffset − item.startTime)`
  - `duration = item.duration − (offset − item.trimStart)`
  - All tracks scheduled this way **mix natively** — narration + music + uploads play together.
- **Pause / seek / stop.** `AudioBufferSourceNode`s are one-shot: stop and discard all live nodes (tracked in a list), then reschedule from the new playhead if still playing.
- **Autoplay gesture.** The `AudioContext` is created lazily and `resume()`d inside the Play click.

### 4.3 Video path (slave) + playhead

One rAF loop while playing:
1. `t = timelineTime`; set `playheadPosition = t`; stop at `t >= duration`.
2. `active = findActiveItem(videoItems, t)`; update `currentVideoUrl`/thumbnail on change.
3. Correct the muted `<video>` toward the clock: `target = timelineToSource(active, t)`; if `|videoEl.currentTime − target| > 0.05`, seek; ensure it's playing. Shift target by `ctx.outputLatency` (via `getOutputTimestamp()`) so picture matches sound.
4. In a gap, show thumbnail/empty; scheduled audio keeps playing.

Video is muted and purely visual — **all** sound comes from the Web Audio graph (the `<audio>` element is removed).

### 4.4 Architecture — `usePlaybackEngine`

New `src/hooks/timeline/usePlaybackEngine.js` owns: the `AudioContext`, decode cache, live source-node list, `videoRef`, the rAF loop, and `playheadPosition`/`isPlaying`. Exposes `{ playheadPosition, isPlaying, play, pause, stop, seek, videoRef, currentVideoUrl, currentThumbnail, audioLoading }`. `useTimeline` delegates playback to it; `TimelineEditor`'s consumed API is unchanged. `VideoPreview` becomes **presentational** — renders only `<video ref={videoRef} muted preload="auto">`; the hidden `<audio>` element is deleted.

Pure helpers (`src/lib/timelinePlayback.js`, unit-tested):
- `findActiveItem(items, t)`; `buildSchedule(audioItems, playStartOffset)` → `[{ url, when, offset, duration, volume }]`; `timelineToSource(item, t)` / `sourceToTimeline(item, srcT)`.

### 4.5 Removed / fixed
- Delete the redundant rAF loop in `play()` and the wall-clock `useEffect` in `useTimeline` — the engine is the single driver.
- Drop the 0.3s drift threshold; replaced by master clock + 50 ms video correction.
- Remove the dead `registerVideoRef`/`registerAudioRef` stubs and the `<audio>` element in `VideoPreview`.
- The `AssetPanel` per-asset preview `<audio>` is **out of scope** — stays a plain element.

---

## 5. Testing strategy

- **`computeTrim` (frontend, pure):** clamps In ≥ 0, Out ≤ source, `Out − In ≥ minDuration`; `duration = Out − In`; `speed:1`; rejects/repairs inverted or out-of-range In/Out.
- **`timelinePlayback` helpers (frontend, pure):** `findActiveItem` boundaries; `buildSchedule` for past / straddling / future items; `timelineToSource`/`sourceToTimeline` round-trip with `trimStart`.
- **Backend (merge-api):** extend `tests/timeline-music.test.js` — `updateItem` forces `speed:1`; `ensureMusicTrackItems` clamps to `min(timelineDuration, assetDuration)`.
- **Export honors cut (merge-api):** assertion that an item with `trimEnd` maps to a trim and `speed:1` yields no `setpts`/`atempo`.
- Decide the frontend test runner during implementation (Vite); prefer a plain `node` script matching merge-api's style if none configured.
- **Manual:** trim a video clip → preview shows kept region → Apply → main-timeline width shrinks → export reflects the cut; trim music/narration via waveform; Play → playhead and audio start together; narration + music audible simultaneously; seek reschedules; gap coasts.

## 6. Regression-safety pass ("no new bugs")

- Null-guard `.toFixed` calls in `AssetPanel` ([AssetPanel.jsx:214](../../../src/components/timeline/AssetPanel.jsx)) and elsewhere — `Number(x ?? 0)`.
- Ensure pause/stop/unmount stop **all** scheduled source nodes (no lingering audio).
- Verify seek-while-playing fully cancels and reschedules (no double/overlapped audio).
- Confirm delete of a trimmed item recalculates timeline duration (`recalculateTimelineDuration`).
- Guard `decodeAudioData` and waveform-fetch failures per asset (skip, don't crash).

## 7. Rollout / phasing

Two independent phases; verify in order to limit blast radius:
- **Phase 1 — Clip Trim Editor** (isolated UI + data): `computeTrim` + test, the Trim Editor modal, remove edge-drag handles, backend `speed:1` guard, music-duration clamp, UI cleanup. Verifiable without touching playback.
- **Phase 2 — Universal-clock playback** (larger): `usePlaybackEngine` + `timelinePlayback` helpers + Web Audio scheduling, `VideoPreview` presentational, remove old loops/`<audio>`.

## 8. Risks

- **Web Audio rebuild is the biggest, riskiest change.** Mitigated by phasing (Trim Editor ships first), pure-helper tests, and keeping `TimelineEditor`'s consumed API identical.
- **Source-node lifecycle.** One-shot nodes must be tracked and stopped on every pause/seek/stop/unmount or audio leaks/overlaps. (§6)
- **Decode timing / large files.** First Play may pause briefly to decode; `audioLoading` communicates it; failures isolated per asset.
- **A/V alignment.** Use `ctx.outputLatency`/`getOutputTimestamp()`; fall back to no offset if unavailable.
- **Existing items with `speed ≠ 1`** keep stored speed until re-edited; the backend guard normalizes on next update. No data migration (YAGNI).

# First-visit intro video popup

**Date:** 2026-07-10
**Status:** Approved, ready for implementation planning

## Summary

A reusable modal that plays a short tutorial video the first time a user lands on
each of five surfaces. Seen-state is persisted per user in the backend so it never
re-shows on a second device. On the four surfaces that already run a driver.js
coach-mark tour, the video plays first and the tour starts once the video is
dismissed.

## Surfaces and assets

Five videos live in a public GCS bucket under
`https://storage.googleapis.com/merge-images/tutorial-videos/`.

| Key | Surface | Route / condition | Asset | Existing tour |
| --- | --- | --- | --- | --- |
| `myVideos` | My Videos | `/videos` | `Raphio1.mp4` | `TOUR_KEYS.myVideos` |
| `modeChooser` | Mode chooser | `/create` with no mode picked | `Raphio3.mp4` | none |
| `prompt` | Prompt-only creator | `/create?mode=prompt` | `Raphio4.mp4` | `TOUR_KEYS.promptImage` |
| `image` | Image-based creator | `/create?mode=image` | `Raphio5.mp4` | `TOUR_KEYS.promptImage` |
| `references` | References creator | `/create?mode=references` | `Raphio6.mp4` | `TOUR_KEYS.promptReferences` |

There is no `Raphio2.mp4`. The numbering gap is intentional.

`Raphio3.mp4` is wayfinding content: it shows where Settings lives and what it
does. The mode chooser is the first screen of `/create`, which makes it the right
place to orient a new user, so it is mounted there rather than on `/settings`.

### Modal titles

`introVideos.js` owns these alongside the URLs, so a page never hardcodes copy.

| Key | Title |
| --- | --- |
| `myVideos` | Welcome to your videos |
| `modeChooser` | Getting started |
| `prompt` | Creating a video from a prompt |
| `image` | Creating a video from your photos |
| `references` | Creating a video with references |

### Verified asset properties

Probed directly from the bucket on 2026-07-10:

- All five are **1848x1080**, aspect ratio **1.711** (reduces exactly to `77/45`).
  This is *not* 16:9, so Tailwind's `aspect-video` would letterbox them. Use
  `aspect-[77/45]`.
- All five carry an **audio track**. This is why playback is click-to-start rather
  than muted autoplay: browsers only permit autoplay when muted, and a narrated
  tutorial watched on mute is worthless.
- Durations run 42s to 65s; file sizes 9.2MB to 14.4MB.
- **None are `faststart`.** The `moov` atom is at the end of every file, so a
  browser must range-fetch the tail before it can render a frame. Playback still
  works, but the first frame is slower and iOS Safari handles it poorly.

**Recommended asset fix, outside this codebase and not blocking:** remux each file
losslessly and re-upload.

```
ffmpeg -i Raphio1.mp4 -c copy -movflags +faststart Raphio1.mp4
```

## Storage

The backend already has a per-user key/value settings table, `setting_preference`
(`user_id`, `pref_key VARCHAR(191)`, `pref_value TEXT`, unique on
`(user_id, pref_key)`). Its own migration comment states it was built so new
toggles could be added "without another migration."

Each seen video is one row: `pref_key = onboarding.introVideoSeen.<key>`,
`pref_value = 'true'`. This exactly mirrors how `onboarding.autoApproveIntroSeen`
is already stored.

**No migration. No schema change. No new table.**

Rejected alternatives: a native MySQL `JSON` column (the codebase does not use
Prisma at runtime and stores JSON-ish data as `TEXT`), and boolean columns on
`users` (breaks the established key/value pattern and needs a migration per video).

## Backend changes (`merge-api`)

### `src/services/settings.service.js`

Add an allowlist and two functions beside the existing intro-seen pair.

```js
const INTRO_VIDEO_KEYS = ['myVideos', 'modeChooser', 'prompt', 'image', 'references'];
const introVideoKey = (key) => `onboarding.introVideoSeen.${key}`;

// Returns string[] of seen keys.
async function getIntroVideosSeen(userId) { /* single SELECT ... WHERE pref_key IN (...) */ }

async function setIntroVideoSeen(userId, key) { /* INSERT ... ON DUPLICATE KEY UPDATE */ }
```

`getIntroVideosSeen` uses one query with `pref_key IN (?, ?, ?, ?, ?)` over the
five known keys rather than a `LIKE` scan, and returns only keys whose
`pref_value === 'true'`.

`setIntroVideoSeen` throws on a key outside `INTRO_VIDEO_KEYS`.

### `src/controllers/settings.controller.js`

`getSettings` already fans out parallel service reads. Add `getIntroVideosSeen` to
the `Promise.all` and nest the result under the existing `onboarding` object, so
the response shape becomes:

```json
{
  "autoApprove": { },
  "onboarding": {
    "autoApproveIntroSeen": false,
    "introVideosSeen": ["myVideos", "prompt"]
  },
  "fillMode": "ai"
}
```

Add a `markIntroVideoSeen(req, res)` handler. It reads `req.body.key` and
**validates it against `INTRO_VIDEO_KEYS`, responding 400 on anything else.**
This validation is required, not cosmetic: without it any authenticated user can
write unbounded arbitrary rows into `setting_preference`. It is also the one place
this feature differs from `markAutoApproveIntroSeen`, which takes no input and so
needs no validation.

### `src/routes/settings.routes.js`

```js
router.put('/onboarding/intro-video-seen', settingsController.markIntroVideoSeen);
```

The router already applies `authenticate`, so `req.user.userId` is present.

**The API must be restarted for these to take effect.**

## Frontend changes (`merge-frontend`)

### New: `src/lib/introVideos.js`

Owns the key list, the URLs, and the open/tour decision. The base is overridable by
environment so the bucket can differ per environment, while still working with zero
env setup, satisfying the CLAUDE.md rule against hardcoded URLs.

```js
const BASE = import.meta.env.VITE_INTRO_VIDEO_BASE
  || "https://storage.googleapis.com/merge-images/tutorial-videos";

export const INTRO_VIDEO_KEYS = { myVideos: "myVideos", modeChooser: "modeChooser",
  prompt: "prompt", image: "image", references: "references" };

const FILES = { myVideos: "Raphio1.mp4", modeChooser: "Raphio3.mp4",
  prompt: "Raphio4.mp4", image: "Raphio5.mp4", references: "Raphio6.mp4" };

const TITLES = { myVideos: "Welcome to your videos", modeChooser: "Getting started",
  prompt: "Creating a video from a prompt", image: "Creating a video from your photos",
  references: "Creating a video with references" };

export function introVideoSrc(key) {
  return FILES[key] ? `${BASE}/${FILES[key]}` : null;
}

export function introVideoTitle(key) {
  return TITLES[key] ?? "";
}

// Pure. The single source of truth for both the modal and the tour gate.
// `seen` is the string[] of seen keys straight from settings.
// `dismissed` is this mount's local state, set by either dismissal path.
export function resolveIntro({ key, ready, seen, src, dismissed }) {
  const open = Boolean(ready && src && !dismissed && !seen.includes(key));
  return { open, tourEnabled: Boolean(ready) && !open };
}
```

Keeping `resolveIntro` pure and total is what makes the timing logic testable
without a DOM.

### `src/api/settings.js`

- `fetchSettings` additionally returns
  `introVideosSeen: data?.onboarding?.introVideosSeen ?? []`, defaulting to an
  empty array so a stale backend cannot crash the client.
- New `markIntroVideoSeen(key)` sending `PUT /settings/onboarding/intro-video-seen`
  with `{ key }`.

### `src/hooks/useAuth.jsx`

Mirrors the existing `autoApproveIntroSeen` handling line for line:

- `const [introVideosSeen, setIntroVideosSeen] = useState([])`
- `refreshSettings` populates it. `settingsReady` already flips true in a `finally`,
  so a failed settings fetch still releases the gate.
- `markIntroVideoSeen(key)` optimistically appends to local state, then fires the
  PUT and only logs on failure. Losing the write is not worth blocking a user on.
- `logout` resets it to `[]`.

Chosen over a self-contained hook that fetches its own state (which would add a
second GET per page and duplicate the ready-race guard) and over generalizing both
flags into one `onboarding.seen` array (which rewrites a working flag for no
user-visible gain).

### New: `src/hooks/useIntroVideo.js`

The entire public surface for a page.

```js
const intro = useIntroVideo("myVideos");
// -> { open, src, title, close, dismissWithoutSeen, tourEnabled }
```

It reads `user`, `loading`, `settingsReady`, `introVideosSeen` and
`markIntroVideoSeen` from `useAuth`, resolves `src` via `introVideoSrc(key)`, and
delegates to `resolveIntro`.

`ready` is `settingsReady || (!loading && !user)`. All five surfaces are behind
`AppLayout` so a logged-out user cannot reach them, but if auth ever fails to
resolve, the resolved-but-absent user still makes `ready` true, so the tours are
never permanently frozen.

The `!loading` term is not cosmetic. On the first render `user` is `null` and
`loading` is `true`. Without it, `ready` would be true in that window, `tourEnabled`
would go true, and `useStepTour` would start its 350ms timer before auth resolved,
running the tour and marking it seen before the video ever opened.

`close()` calls `markIntroVideoSeen(key)` and hides the modal.
`dismissWithoutSeen()` hides the modal and persists nothing. Both drive the same
local `dismissed` state, which is what flips `open` false and so releases the tour
in either case.

### New: `src/components/IntroVideoModal.jsx`

A framer-motion overlay following the house pattern of
`components/session/InsufficientCreditsModal.jsx`, *not* the Radix
`components/ui/dialog.jsx` (which exists but is imported by nothing).

Props: `{ open, src, title, onClose, onDismissWithoutSeen }`.

The two dismissal paths are distinct on purpose. `onClose` is the normal path and
marks the video seen. `onDismissWithoutSeen` is used only from the load-error state
below, so a failed download never permanently consumes the user's one viewing.

Layout, per the CLAUDE.md mobile rules:

- Overlay: `fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4`.
  The `p-4` is mandatory or the card touches the screen edge.
- Card: `w-full max-w-2xl bg-white rounded-2xl max-h-[90vh] overflow-y-auto`.
- Header: title, and a close `X` sized to at least a 44x44 touch target.
- Video well: `aspect-[77/45] w-full bg-black relative`, containing
  `<video preload="metadata" controls>` and a centered overlay play button
  (64px, brand gradient) that disappears once playback starts.
- Footer: a primary "Got it" button using the required brand gradient
  `linear-gradient(135deg, #F97066, #FB923C)`, full-width and `min-h-[44px]` on
  mobile.

`preload="metadata"` rather than `auto` keeps a 9MB to 14MB download off mobile
data until the user actually taps play.

### Dismissal

Closing is deliberate, because there is no replay affordance and `close()` marks
the video seen forever:

- The `X` button and the "Got it" button close.
- `Escape` closes.
- **Clicking the backdrop does nothing.** This intentionally diverges from
  `InsufficientCreditsModal`, which does close on backdrop click, because that
  modal can be reopened and this one cannot. One stray tap on a phone should not
  permanently destroy a tutorial.
- The video's `ended` event does nothing. The user closes it themselves.

### Mobile playback

Detected with the existing `useIsMobile()` from `src/hooks/useMediaQuery.js`
(`max-width: 767px`).

A 1848x1080 screen recording rendered inline on a 390px phone is about 358x209, a
19% scale at which recorded UI text is illegible. So on mobile, tapping play enters
native fullscreen.

Relying on iOS Safari's implicit behavior (omitting `playsInline` makes it
auto-fullscreen) is not enough, because Android Chrome does not do this and the two
platforms would diverge. Instead the play handler requests fullscreen explicitly,
inside the user-gesture handler:

```js
async function handlePlay() {
  const v = videoRef.current;
  await v.play();                       // must precede fullscreen on iOS
  if (!isMobile) return;                // desktop plays inline
  if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();   // iOS Safari
  else if (v.requestFullscreen) await v.requestFullscreen().catch(() => {});
}
```

`playsInline` is set on desktop and omitted on mobile. If fullscreen is unavailable
the `catch` swallows it and the video simply plays inline, which is degraded but
never broken. Exiting fullscreen returns the user to the still-open modal.

### Mount points

Three files, five keys.

- `src/pages/MyVideosPage.jsx`, key `myVideos`.
- `src/pages/Creator.jsx`, in the `!chosen` branch that renders `ModeChooser`, key
  `modeChooser`. Note `onBackToChooser` can remount this, but the seen flag makes
  that harmless.
- `src/components/session/PromptStep.jsx`, key taken from its existing
  `pipelineMode` prop, whose values are already exactly `prompt` / `image` /
  `references`. All three creators route through this one component, so those three
  surfaces cost one mount point, not three. This mirrors how the component already
  selects its tour key from `isReferencesMode`.

## Tour hand-off

On the four surfaces that have a tour, the only change is the `enabled` option:

```js
const intro = useIntroVideo(INTRO_VIDEO_KEYS.myVideos);
const myVideosTour = useStepTour(TOUR_KEYS.myVideos, startMyVideosTour, {
  enabled: intro.tourEnabled,
  isMobile,
});
```

**`useStepTour` needs no modification.** Two properties of its existing
implementation make this work:

1. Its guard is `if (firedRef.current || !enabled) return;`, so the once-per-mount
   latch is set *after* the enabled check. A tour held at `enabled: false` never
   latches and stays armed.
2. `enabled` is in the effect dependency array, so the false-to-true transition
   re-runs the effect, which then fires the tour after its usual 350ms delay.

The resulting sequence on a genuine first visit: settings load, `ready` flips true,
the modal opens and the tour stays suppressed, the user closes the modal, the key is
marked seen, `open` goes false, `tourEnabled` goes true, and the tour starts 350ms
later against a fully painted page.

For a returning user, `seen` already contains the key, so `open` is never true and
`tourEnabled` is true as soon as settings load. Behavior is identical to today.

The mode chooser has no tour and simply renders the modal.

## Failure behavior

None of these may trap the user or silently suppress a tour.

| Condition | Behavior |
| --- | --- |
| `GET /settings` fails | `settingsReady` flips true in a `finally`; `seen` stays `[]`. The modal opens (a duplicate view at worst). The tour still runs after close. |
| Key has no URL | `src` is `null`, so `open` is false and `tourEnabled` is true. The tour behaves exactly as it does today. This is the mechanism by which a not-yet-uploaded video is a clean no-op. |
| PUT to mark seen fails | Logged, not surfaced. Local state already flipped, so the session proceeds. The video re-shows on the next device or reload. Acceptable. |
| Video 404s or fails to decode | The `error` event replaces the player with a compact "Video unavailable" message, and the footer button becomes "Close", wired to `onDismissWithoutSeen` rather than `onClose`. So the key is **not** marked seen, the tour is released, and the user gets another chance next visit. A transient network blip should not permanently destroy the tutorial. |

## Testing

`merge-frontend` currently has no test infrastructure: no vitest, no jest, no
testing-library, no test files, no config. The load-bearing risk in this feature is
timing, which is precisely what manual clicking fails to catch, so we add the
smallest harness that pins it.

Add `vitest` as a dev dependency and a `"test": "vitest"` script. No jsdom, no
testing-library. `resolveIntro` is pure, so plain vitest suffices.

`src/lib/introVideos.test.js` covers:

- Never opens before `ready`, and the tour is also suppressed in that window.
- Opens when ready, unseen, not dismissed, and a URL exists; the tour is suppressed.
- Does not open when the key is already seen; the tour is enabled.
- Does not open when `src` is `null`; the tour is enabled.
- Does not open when `dismissed` is true, even though `seen` does not contain the
  key. This is the error-path case, and it must still enable the tour.
- `tourEnabled` is the exact complement of `open` whenever `ready` is true. This is
  the invariant that guarantees a tour can never run behind an open modal, nor be
  lost after it closes.
- `introVideoSrc` maps all five keys to their `RaphioN.mp4`, and returns `null` for
  an unknown key.

Beyond that, drive the real app: clear the five `setting_preference` rows, then walk
all five surfaces at a desktop and a mobile viewport, confirming the video plays,
fullscreen engages on mobile, and each tour begins only after the modal closes.

## Out of scope

- Replay. Once dismissed, a video does not return. Adding it later means exposing
  `clearIntroVideoSeen` and hanging it off the existing `HelpFab`.
- Any change to `useStepTour`, `tourState.js`, or the existing tours themselves.
- Migrating `autoApproveIntroSeen` into a shared `onboarding.seen` array.
- Re-encoding the videos to `faststart`. Recommended, but an asset task.

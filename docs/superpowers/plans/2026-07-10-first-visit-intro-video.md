# First-Visit Intro Video Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a one-time tutorial video popup the first time a user lands on each of five surfaces, persisted per user in the backend, handing off to each page's existing coach-mark tour on close.

**Architecture:** Seen-state is one row per video in the backend's existing `setting_preference` key/value table, so there is no migration. A pure `resolveIntro()` function derives both `open` (show the modal) and `tourEnabled` (release the tour) from the same inputs, guaranteeing a tour can never run behind an open modal. A single `IntroVideoModal` renders on three mount points that cover all five surfaces.

**Tech Stack:** React 19, Vite 7, framer-motion 12, Tailwind, lucide-react. Backend: Express + raw `mysql2`, `node:test` for tests. Frontend tests: vitest (added by this plan).

Spec: `docs/superpowers/specs/2026-07-10-first-visit-intro-video-design.md`

## Global Constraints

- **Brand gradient is `linear-gradient(135deg, #C1440E, #E8632A)`.** CLAUDE.md names `#F97066 → #FB923C`, but `#F97066` appears **zero** times in `src/`. The live terracotta tokens are what every current component uses (`AutoApproveIntroModal.jsx`, `ModeChooser.jsx`, `MyVideosPage.jsx`). Match the code, not the stale doc.
- Video aspect ratio is exactly `aspect-[77/45]` (1848x1080). **Never `aspect-video`**, which would letterbox.
- Modal overlay must have `p-4`; the card must have `max-h-[90vh] overflow-y-auto`. (CLAUDE.md mobile rule.)
- Backdrop clicks must **not** close the modal. Dismissal is permanent and there is no replay.
- Modal root uses `z-[100]` and `font-figtree`, matching `AutoApproveIntroModal.jsx`.
- The five intro keys, in this exact spelling, shared by both repos: `myVideos`, `modeChooser`, `prompt`, `image`, `references`.
- Backend `pref_key` format: `onboarding.introVideoSeen.<key>`.
- Keep code comments minimal. Only comment a constraint the code cannot show.
- **Backend changes require an API restart to take effect.**
- Local dev DB host must be the direct origin IP `51.161.174.248:3306`, not `raphio.ai:3306`.

---

### Task 1: Backend intro-video settings service

**Files:**
- Modify: `C:\Users\mikha\merge-api\src\services\settings.service.js` (add after the `setAutoApproveIntroSeen` block ending at line 95; extend `module.exports` at lines 131-142)
- Test: `C:\Users\mikha\merge-api\tests\settings-intro-video.test.js` (create)

**Interfaces:**
- Consumes: `db` from `../config/database` (already imported at line 1).
- Produces:
  - `INTRO_VIDEO_KEYS: string[]`
  - `isIntroVideoKey(key: unknown) => boolean`
  - `getIntroVideosSeen(userId: number) => Promise<string[]>`
  - `setIntroVideoSeen(userId: number, key: string) => Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `C:\Users\mikha\merge-api\tests\settings-intro-video.test.js`. This tests only the pure key allowlist, so it needs no database.

```js
const test = require('node:test');
const assert = require('node:assert');
const { INTRO_VIDEO_KEYS, isIntroVideoKey } = require('../src/services/settings.service');

test('INTRO_VIDEO_KEYS holds exactly the five surfaces', () => {
  assert.deepStrictEqual(INTRO_VIDEO_KEYS, [
    'myVideos', 'modeChooser', 'prompt', 'image', 'references',
  ]);
});

test('isIntroVideoKey accepts every known key', () => {
  for (const key of INTRO_VIDEO_KEYS) {
    assert.strictEqual(isIntroVideoKey(key), true, `expected ${key} to be valid`);
  }
});

test('isIntroVideoKey rejects unknown and non-string input', () => {
  const bad = ['', 'nope', 'myvideos', 'onboarding.introVideoSeen.myVideos',
    null, undefined, 42, {}, [], ['myVideos']];
  for (const value of bad) {
    assert.strictEqual(isIntroVideoKey(value), false, `expected ${JSON.stringify(value)} to be rejected`);
  }
});

test('isIntroVideoKey rejects prototype keys', () => {
  assert.strictEqual(isIntroVideoKey('constructor'), false);
  assert.strictEqual(isIntroVideoKey('__proto__'), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:\Users\mikha\merge-api && node --test tests/settings-intro-video.test.js`
Expected: FAIL. Errors like `TypeError: Cannot read properties of undefined` or an assertion that `INTRO_VIDEO_KEYS` is `undefined`, because the service does not export it yet.

- [ ] **Step 3: Write minimal implementation**

In `src/services/settings.service.js`, insert immediately after `setAutoApproveIntroSeen` (after line 95, before the `FILL_MODE_KEY` comment block on line 97):

```js
// One-time tutorial video per surface. Stored as one row per (user, key) using
// the same setting_preference table, so adding a video needs no migration.
const INTRO_VIDEO_KEYS = ['myVideos', 'modeChooser', 'prompt', 'image', 'references'];
const INTRO_VIDEO_PREFIX = 'onboarding.introVideoSeen.';

function isIntroVideoKey(key) {
  return typeof key === 'string' && INTRO_VIDEO_KEYS.includes(key);
}

function introVideoKey(key) {
  return INTRO_VIDEO_PREFIX + key;
}

async function getIntroVideosSeen(userId) {
  if (!userId) return [];
  const keys = INTRO_VIDEO_KEYS.map(introVideoKey);
  const placeholders = keys.map(() => '?').join(', ');
  const [rows] = await db.execute(
    `SELECT pref_key, pref_value FROM setting_preference WHERE user_id = ? AND pref_key IN (${placeholders})`,
    [userId, ...keys]
  );
  return rows
    .filter((row) => row.pref_value === 'true')
    .map((row) => row.pref_key.slice(INTRO_VIDEO_PREFIX.length));
}

// Rejects unknown keys so an authenticated caller cannot write arbitrary rows.
async function setIntroVideoSeen(userId, key) {
  if (!userId) throw new Error('userId is required');
  if (!isIntroVideoKey(key)) throw new Error(`Unknown intro video key: ${key}`);
  await db.execute(
    `INSERT INTO setting_preference (user_id, pref_key, pref_value)
       VALUES (?, ?, 'true')
     ON DUPLICATE KEY UPDATE pref_value = VALUES(pref_value)`,
    [userId, introVideoKey(key)]
  );
}
```

Then extend `module.exports` (lines 131-142) to add four entries, keeping the existing ones:

```js
module.exports = {
  AUTO_APPROVE_FLAGS,
  defaultAutoApprove,
  getAutoApprove,
  setAutoApprove,
  getAutoApproveIntroSeen,
  setAutoApproveIntroSeen,
  INTRO_VIDEO_KEYS,
  isIntroVideoKey,
  getIntroVideosSeen,
  setIntroVideoSeen,
  getFillMode,
  setFillMode,
  normalizeFillMode,
  VALID_FILL_MODES,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd C:\Users\mikha\merge-api && node --test tests/settings-intro-video.test.js`
Expected: PASS, `# pass 4`, `# fail 0`.

Note: `isIntroVideoKey` uses `Array.includes`, not an object lookup, which is why `'constructor'` and `'__proto__'` are rejected. Do not "optimize" it into a plain-object map.

- [ ] **Step 5: Commit**

```bash
cd C:\Users\mikha\merge-api
git add src/services/settings.service.js tests/settings-intro-video.test.js
git commit -m "feat(settings): add per-user intro video seen flags"
```

---

### Task 2: Backend controller and route

**Files:**
- Modify: `C:\Users\mikha\merge-api\src\controllers\settings.controller.js` (extend `getSettings` at lines 8-20; add handler; extend `module.exports` at lines 85-91)
- Modify: `C:\Users\mikha\merge-api\src\routes\settings.routes.js` (add one route after line 13)

**Interfaces:**
- Consumes: `settingsService.getIntroVideosSeen`, `settingsService.setIntroVideoSeen`, `settingsService.isIntroVideoKey` (Task 1).
- Produces:
  - `GET /api/settings` response gains `onboarding.introVideosSeen: string[]`
  - `PUT /api/settings/onboarding/intro-video-seen` with body `{ key: string }`, responding `{ ok: true }` on success, `400 { error }` on an invalid key.

- [ ] **Step 1: Extend `getSettings`**

In `src/controllers/settings.controller.js`, replace the body of `getSettings` (lines 9-19) with:

```js
  try {
    const [autoApprove, autoApproveIntroSeen, introVideosSeen, fillMode] = await Promise.all([
      settingsService.getAutoApprove(req.user.userId),
      settingsService.getAutoApproveIntroSeen(req.user.userId),
      settingsService.getIntroVideosSeen(req.user.userId),
      settingsService.getFillMode(req.user.userId),
    ]);
    res.json({
      autoApprove,
      onboarding: { autoApproveIntroSeen, introVideosSeen },
      fillMode,
    });
  } catch (error) {
    console.error('[Settings] Failed to read settings:', error.message);
    res.status(500).json({ error: 'Failed to load settings' });
  }
```

- [ ] **Step 2: Add the `markIntroVideoSeen` handler**

Insert after `markAutoApproveIntroSeen` (after line 67):

```js
/**
 * PUT /api/settings/onboarding/intro-video-seen
 * Body: { key }. Marks one tutorial video as seen for this user.
 */
async function markIntroVideoSeen(req, res) {
  // Validate before touching the DB: without this, any authenticated user could
  // write unbounded arbitrary rows into setting_preference.
  const key = req.body?.key;
  if (!settingsService.isIntroVideoKey(key)) {
    return res.status(400).json({
      error: `Invalid intro video key. Valid keys: ${settingsService.INTRO_VIDEO_KEYS.join(', ')}`,
    });
  }
  try {
    await settingsService.setIntroVideoSeen(req.user.userId, key);
    res.json({ ok: true });
  } catch (error) {
    console.error('[Settings] Failed to mark intro video seen:', error.message);
    res.status(500).json({ error: 'Failed to save settings' });
  }
}
```

Then extend `module.exports` (lines 85-91):

```js
module.exports = {
  getSettings,
  getAutoApprove,
  updateAutoApprove,
  markAutoApproveIntroSeen,
  markIntroVideoSeen,
  updateFillMode,
};
```

- [ ] **Step 3: Add the route**

In `src/routes/settings.routes.js`, add after line 13:

```js
router.put('/onboarding/intro-video-seen', settingsController.markIntroVideoSeen);
```

The router already calls `router.use(authenticate)` at line 7, so `req.user.userId` is present.

- [ ] **Step 4: Restart the API and verify by hand**

Restart the API (`npm run dev` in `C:\Users\mikha\merge-api`). Backend changes do not hot-reload into a running process.

Grab a JWT by logging in through the app, then from the browser devtools console on any authenticated page:

```js
// Expect: 400 and an "Invalid intro video key" message
await fetch('/api/settings/onboarding/intro-video-seen', {
  method: 'PUT', headers: {'Content-Type':'application/json'},
  body: JSON.stringify({ key: 'bogus' }), credentials: 'include',
}).then(r => r.status);

// Expect: 200
await fetch('/api/settings/onboarding/intro-video-seen', {
  method: 'PUT', headers: {'Content-Type':'application/json'},
  body: JSON.stringify({ key: 'myVideos' }), credentials: 'include',
}).then(r => r.status);

// Expect: onboarding.introVideosSeen === ["myVideos"]
await fetch('/api/settings', { credentials: 'include' }).then(r => r.json());
```

Expected: `400`, then `200`, then a payload whose `onboarding.introVideosSeen` is `["myVideos"]`.

Clean up so later manual testing starts fresh:

```sql
DELETE FROM setting_preference WHERE pref_key LIKE 'onboarding.introVideoSeen.%';
```

- [ ] **Step 5: Commit**

```bash
cd C:\Users\mikha\merge-api
git add src/controllers/settings.controller.js src/routes/settings.routes.js
git commit -m "feat(settings): expose intro video seen flags over the API"
```

---

### Task 3: Frontend video registry and the pure decision function

**Files:**
- Create: `C:\Users\mikha\merge-frontend\src\lib\introVideos.js`
- Create: `C:\Users\mikha\merge-frontend\src\lib\introVideos.test.js`
- Modify: `C:\Users\mikha\merge-frontend\package.json` (add `vitest` devDependency and a `test` script)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `INTRO_VIDEO_KEYS: { myVideos, modeChooser, prompt, image, references }` (an object whose values equal its keys, so callers write `INTRO_VIDEO_KEYS.myVideos`)
  - `introVideoSrc(key: string) => string | null`
  - `introVideoTitle(key: string) => string`
  - `resolveIntro({ key, ready, seen, src, dismissed }) => { open: boolean, tourEnabled: boolean }`

- [ ] **Step 1: Add vitest**

```bash
cd C:\Users\mikha\merge-frontend
npm install --save-dev vitest
```

Then add a `test` script to `package.json`, so the `scripts` block reads:

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run"
  },
```

No `vitest.config.js` is needed: vitest reads the existing `vite.config.js`, and these tests touch no DOM, so the default `node` environment is correct. Do not add jsdom or testing-library.

- [ ] **Step 2: Write the failing test**

Create `src/lib/introVideos.test.js`:

```js
import { describe, expect, it } from "vitest";
import { INTRO_VIDEO_KEYS, introVideoSrc, introVideoTitle, resolveIntro } from "./introVideos";

const BASE = "https://storage.googleapis.com/merge-images/tutorial-videos";

describe("introVideoSrc", () => {
  it("maps every key to its asset", () => {
    expect(introVideoSrc("myVideos")).toBe(`${BASE}/Raphio1.mp4`);
    expect(introVideoSrc("modeChooser")).toBe(`${BASE}/Raphio3.mp4`);
    expect(introVideoSrc("prompt")).toBe(`${BASE}/Raphio4.mp4`);
    expect(introVideoSrc("image")).toBe(`${BASE}/Raphio5.mp4`);
    expect(introVideoSrc("references")).toBe(`${BASE}/Raphio6.mp4`);
  });

  it("returns null for an unknown key", () => {
    expect(introVideoSrc("nope")).toBeNull();
    expect(introVideoSrc(undefined)).toBeNull();
  });
});

describe("introVideoTitle", () => {
  it("titles every key", () => {
    for (const key of Object.values(INTRO_VIDEO_KEYS)) {
      expect(introVideoTitle(key).length).toBeGreaterThan(0);
    }
  });

  it("returns an empty string for an unknown key", () => {
    expect(introVideoTitle("nope")).toBe("");
  });
});

describe("resolveIntro", () => {
  const base = { key: "myVideos", ready: true, seen: [], src: "x.mp4", dismissed: false };

  it("stays shut and holds the tour until settings are ready", () => {
    expect(resolveIntro({ ...base, ready: false })).toEqual({ open: false, tourEnabled: false });
  });

  it("opens when ready, unseen, undismissed, and a URL exists", () => {
    expect(resolveIntro(base)).toEqual({ open: true, tourEnabled: false });
  });

  it("stays shut and releases the tour when already seen", () => {
    expect(resolveIntro({ ...base, seen: ["myVideos"] })).toEqual({ open: false, tourEnabled: true });
  });

  it("ignores other keys in the seen list", () => {
    expect(resolveIntro({ ...base, seen: ["prompt", "image"] })).toEqual({ open: true, tourEnabled: false });
  });

  it("stays shut and releases the tour when there is no URL", () => {
    expect(resolveIntro({ ...base, src: null })).toEqual({ open: false, tourEnabled: true });
  });

  it("stays shut and releases the tour once dismissed, even if unseen", () => {
    expect(resolveIntro({ ...base, dismissed: true })).toEqual({ open: false, tourEnabled: true });
  });

  it("keeps tourEnabled the exact complement of open whenever ready", () => {
    for (const seen of [[], ["myVideos"]]) {
      for (const src of ["x.mp4", null]) {
        for (const dismissed of [true, false]) {
          const r = resolveIntro({ key: "myVideos", ready: true, seen, src, dismissed });
          expect(r.tourEnabled).toBe(!r.open);
        }
      }
    }
  });

  it("returns booleans, never undefined or a truthy string", () => {
    const r = resolveIntro({ ...base, src: undefined, ready: undefined });
    expect(r.open).toBe(false);
    expect(r.tourEnabled).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd C:\Users\mikha\merge-frontend && npx vitest run src/lib/introVideos.test.js`
Expected: FAIL with `Failed to resolve import "./introVideos"`.

- [ ] **Step 4: Write minimal implementation**

Create `src/lib/introVideos.js`:

```js
// One-time tutorial video per surface. The base is env-overridable so a bucket
// can differ per environment, while still working with no env setup at all.
const BASE =
  import.meta.env.VITE_INTRO_VIDEO_BASE ||
  "https://storage.googleapis.com/merge-images/tutorial-videos";

export const INTRO_VIDEO_KEYS = {
  myVideos: "myVideos",
  modeChooser: "modeChooser",
  prompt: "prompt",
  image: "image",
  references: "references",
};

// There is no Raphio2.mp4. The numbering gap is intentional.
const FILES = {
  myVideos: "Raphio1.mp4",
  modeChooser: "Raphio3.mp4",
  prompt: "Raphio4.mp4",
  image: "Raphio5.mp4",
  references: "Raphio6.mp4",
};

const TITLES = {
  myVideos: "Welcome to your videos",
  modeChooser: "Getting started",
  prompt: "Creating a video from a prompt",
  image: "Creating a video from your photos",
  references: "Creating a video with references",
};

export function introVideoSrc(key) {
  return Object.hasOwn(FILES, key) ? `${BASE}/${FILES[key]}` : null;
}

export function introVideoTitle(key) {
  return Object.hasOwn(TITLES, key) ? TITLES[key] : "";
}

// The single source of truth for both the modal and the tour gate. Pure and
// total. `tourEnabled` is the exact complement of `open` once ready, so a tour
// can never run behind an open modal, nor be lost after the modal closes.
export function resolveIntro({ key, ready, seen, src, dismissed }) {
  const open = Boolean(ready && src && !dismissed && !(seen || []).includes(key));
  return { open, tourEnabled: Boolean(ready) && !open };
}
```

`Object.hasOwn` rather than `FILES[key]` truthiness keeps `introVideoSrc("constructor")` returning `null`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd C:\Users\mikha\merge-frontend && npx vitest run src/lib/introVideos.test.js`
Expected: PASS, 10 tests passed.

- [ ] **Step 6: Commit**

```bash
cd C:\Users\mikha\merge-frontend
git add package.json package-lock.json src/lib/introVideos.js src/lib/introVideos.test.js
git commit -m "feat(intro): add intro video registry and pure open/tour resolver"
```

---

### Task 4: Wire the seen-flags through the API client and auth context

**Files:**
- Modify: `C:\Users\mikha\merge-frontend\src\api\settings.js` (extend `fetchSettings` at lines 20-26; add one function)
- Modify: `C:\Users\mikha\merge-frontend\src\hooks\useAuth.jsx` (import line 10; state near line 23; `refreshSettings` lines 50-60; new callback; `value` lines 84-93; `logout` lines 108-115)

**Interfaces:**
- Consumes: `PUT /settings/onboarding/intro-video-seen` (Task 2).
- Produces, on the `useAuth()` context object:
  - `introVideosSeen: string[]`
  - `markIntroVideoSeen(key: string) => void`
  - (`user`, `loading: boolean` and `settingsReady: boolean` already exist on the
    context and are all three relied on by Task 5. No change needed to them.)

- [ ] **Step 1: Extend the API client**

In `src/api/settings.js`, replace `fetchSettings` (lines 16-26) with:

```js
/**
 * Load all of the signed-in user's settings in one call (used on login).
 * @returns {Promise<{autoApprove: object, autoApproveIntroSeen: boolean, introVideosSeen: string[]}>}
 */
export async function fetchSettings() {
  const { data } = await axios.get(SETTINGS_BASE);
  return {
    autoApprove: { ...EMPTY_AUTO_APPROVE, ...(data?.autoApprove || {}) },
    autoApproveIntroSeen: !!data?.onboarding?.autoApproveIntroSeen,
    // Default to [] so an older backend cannot crash the client.
    introVideosSeen: Array.isArray(data?.onboarding?.introVideosSeen)
      ? data.onboarding.introVideosSeen
      : [],
  };
}
```

Then add after `markAutoApproveIntroSeen` (after line 34):

```js
/**
 * Mark one first-visit tutorial video as seen so it never auto-opens again.
 * @param {string} key one of the keys in INTRO_VIDEO_KEYS
 */
export async function markIntroVideoSeen(key) {
  await axios.put(`${SETTINGS_BASE}/onboarding/intro-video-seen`, { key });
}
```

- [ ] **Step 2: Extend the auth context**

In `src/hooks/useAuth.jsx`:

Replace the import on line 10 with:

```js
import {
  fetchSettings,
  saveAutoApprove,
  markAutoApproveIntroSeen as apiMarkIntroSeen,
  markIntroVideoSeen as apiMarkIntroVideoSeen,
  EMPTY_AUTO_APPROVE,
} from '../api/settings';
```

Add state after line 23 (`const [autoApproveIntroSeen, setIntroSeenState] = useState(false);`):

```js
  // Keys of the first-visit tutorial videos this user has already dismissed.
  const [introVideosSeen, setIntroVideosSeen] = useState([]);
```

In `refreshSettings` (lines 50-60), add one line inside the `try`, after `setIntroSeenState(s.autoApproveIntroSeen);`:

```js
      setIntroVideosSeen(s.introVideosSeen);
```

Add a callback after `markAutoApproveIntroSeen` (after line 82):

```js
  // Optimistic: the local flip is what closes the modal and releases the tour.
  // A failed write only means the video may reappear on another device.
  const markIntroVideoSeen = useCallback((key) => {
    setIntroVideosSeen((prev) => (prev.includes(key) ? prev : [...prev, key]));
    apiMarkIntroVideoSeen(key).catch((err) =>
      console.error('[useAuth] Failed to mark intro video seen:', err.message)
    );
  }, []);
```

Add both to the `value` object, after `markAutoApproveIntroSeen,` on line 92:

```js
    introVideosSeen,
    markIntroVideoSeen,
```

Add one line to `logout` (after `setIntroSeenState(false);` on line 113):

```js
      setIntroVideosSeen([]);
```

- [ ] **Step 3: Verify nothing regressed**

Run: `cd C:\Users\mikha\merge-frontend && npm run lint && npm run build`
Expected: both succeed with no new errors.

Then start the app (`npm run dev`), log in, and in devtools confirm the settings request returns `introVideosSeen`. Expected: `GET /api/settings` responds with `onboarding.introVideosSeen: []`.

- [ ] **Step 4: Commit**

```bash
cd C:\Users\mikha\merge-frontend
git add src/api/settings.js src/hooks/useAuth.jsx
git commit -m "feat(intro): load and persist intro video seen flags via useAuth"
```

---

### Task 5: The `useIntroVideo` hook

**Files:**
- Create: `C:\Users\mikha\merge-frontend\src\hooks\useIntroVideo.js`

**Interfaces:**
- Consumes: `useAuth()` giving `{ user, loading, settingsReady, introVideosSeen, markIntroVideoSeen }` (Task 4); `introVideoSrc`, `introVideoTitle`, `resolveIntro` (Task 3).
- Produces: `useIntroVideo(key: string, opts?: { enabled?: boolean }) => { open, src, title, close, dismissWithoutSeen, tourEnabled }`.

**The `loading` guard is load-bearing.** On the very first render `useAuth` has
`user === null` and `loading === true`. If `ready` were merely `settingsReady || !user`,
it would be `true` in that window, `tourEnabled` would go `true`, and `useStepTour`
would start its 350ms timer before auth resolved. The tour would run, mark itself
seen, and the video would open behind it. Gate on `!loading && !user`.

- [ ] **Step 1: Write the hook**

Create `src/hooks/useIntroVideo.js`:

```js
import { useCallback, useState } from "react";
import { useAuth } from "./useAuth";
import { introVideoSrc, introVideoTitle, resolveIntro } from "@/lib/introVideos";

/**
 * First-visit tutorial video for one surface.
 *
 * `tourEnabled` must be fed into that page's useStepTour `enabled` option: it is
 * false while the modal is open and true once it closes, which is what makes the
 * tour wait for the video instead of racing it.
 *
 * @param {string} key one of INTRO_VIDEO_KEYS
 * @param {{enabled?: boolean}} [opts] `enabled: false` suppresses the video
 *   without marking it seen (e.g. PromptStep when resuming a draft).
 */
export function useIntroVideo(key, { enabled = true } = {}) {
  const { user, loading, settingsReady, introVideosSeen, markIntroVideoSeen } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // A resolved-but-absent user counts as ready: all five surfaces sit behind
  // AppLayout, but if auth ever fails this keeps the tours from freezing forever.
  // `!loading` is required: while auth is still resolving, `user` is null, and
  // treating that as ready would let the tour fire before the video opens.
  const ready = settingsReady || (!loading && !user);
  const suppressed = dismissed || !enabled || !user;

  const src = introVideoSrc(key);
  const { open, tourEnabled } = resolveIntro({
    key,
    ready,
    seen: introVideosSeen,
    src,
    dismissed: suppressed,
  });

  const close = useCallback(() => {
    setDismissed(true);
    markIntroVideoSeen(key);
  }, [key, markIntroVideoSeen]);

  // Load-error path: hide the modal but persist nothing, so a network blip does
  // not permanently consume the user's single viewing.
  const dismissWithoutSeen = useCallback(() => setDismissed(true), []);

  return { open, src, title: introVideoTitle(key), close, dismissWithoutSeen, tourEnabled };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd C:\Users\mikha\merge-frontend && npm run lint && npm run build`
Expected: both succeed. The hook is not yet imported anywhere, so nothing else changes.

- [ ] **Step 3: Commit**

```bash
cd C:\Users\mikha\merge-frontend
git add src/hooks/useIntroVideo.js
git commit -m "feat(intro): add useIntroVideo hook"
```

---

### Task 6: The `IntroVideoModal` component

**Files:**
- Create: `C:\Users\mikha\merge-frontend\src\components\IntroVideoModal.jsx`

**Interfaces:**
- Consumes: `useIsMobile` from `@/hooks/useMediaQuery`.
- Produces: default export `IntroVideoModal({ open, src, title, onClose, onDismissWithoutSeen })`.

Pattern reference: `src/components/session/AutoApproveIntroModal.jsx`. Match its overlay, card, and gradient. Note it deliberately has **no** backdrop `onClick`, which is the behavior we want here too.

- [ ] **Step 1: Write the component**

Create `src/components/IntroVideoModal.jsx`:

```jsx
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, AlertTriangle } from "lucide-react";
import { useIsMobile } from "@/hooks/useMediaQuery";

const C = { dark: "#2D2235", muted: "#6B5E7B", border: "rgba(45,34,53,0.10)" };
const GRADIENT = "linear-gradient(135deg, #C1440E, #E8632A)";

export default function IntroVideoModal({ open, src, title, onClose, onDismissWithoutSeen }) {
  const videoRef = useRef(null);
  const isMobile = useIsMobile();
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStarted(false);
    setFailed(false);
  }, [open, src]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") (failed ? onDismissWithoutSeen : onClose)();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, failed, onClose, onDismissWithoutSeen]);

  // These are 1848x1080 screen recordings: inline on a phone the recorded UI is
  // illegible, so mobile playback goes fullscreen. Requesting it explicitly (not
  // relying on iOS dropping playsInline) keeps Android and iOS consistent.
  async function handlePlay() {
    const v = videoRef.current;
    if (!v) return;
    try {
      await v.play();
    } catch {
      return;
    }
    setStarted(true);
    if (!isMobile) return;
    if (typeof v.webkitEnterFullscreen === "function") {
      v.webkitEnterFullscreen();
    } else if (typeof v.requestFullscreen === "function") {
      await v.requestFullscreen().catch(() => {});
    }
  }

  if (!open || !src) return null;

  const dismiss = failed ? onDismissWithoutSeen : onClose;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: "rgba(28,25,23,0.55)", backdropFilter: "blur(4px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <motion.div
          className="w-full max-w-2xl rounded-3xl bg-white overflow-hidden font-figtree max-h-[90vh] overflow-y-auto"
          style={{ boxShadow: "0 20px 60px rgba(45,34,53,0.30)" }}
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
        >
          <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 sm:px-6">
            <h2
              className="font-extrabold tracking-tight"
              style={{ color: C.dark, fontSize: 19, letterSpacing: "-0.01em" }}
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className="shrink-0 inline-flex items-center justify-center rounded-full transition-colors hover:bg-black/5"
              style={{ width: 44, height: 44, color: C.muted }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-5 sm:px-6">
            {failed ? (
              <div
                className="flex items-start gap-2 rounded-2xl p-4"
                style={{ background: "rgba(193,68,14,0.06)", border: "1px solid rgba(193,68,14,0.22)" }}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#C1440E" }} />
                <p style={{ color: "#C1440E", fontSize: 13, lineHeight: 1.5, fontWeight: 600 }}>
                  We couldn&apos;t load this video. You can carry on, and we&apos;ll try again next time.
                </p>
              </div>
            ) : (
              // 1848x1080 exactly. aspect-video (16:9) would letterbox it.
              <div className="relative w-full aspect-[77/45] rounded-2xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  src={src}
                  controls
                  preload="metadata"
                  playsInline={!isMobile}
                  onError={() => setFailed(true)}
                  onPlay={() => setStarted(true)}
                  className="absolute inset-0 w-full h-full object-contain"
                />
                {!started && (
                  <button
                    type="button"
                    onClick={handlePlay}
                    aria-label="Play video"
                    className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/15"
                  >
                    <span
                      className="inline-flex items-center justify-center rounded-full"
                      style={{ width: 64, height: 64, background: GRADIENT, boxShadow: "0 8px 24px rgba(193,68,14,0.45)" }}
                    >
                      <Play className="w-7 h-7 text-white translate-x-0.5" fill="currentColor" />
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="p-5 sm:p-6">
            <button
              type="button"
              onClick={dismiss}
              className="w-full inline-flex items-center justify-center rounded-2xl font-bold text-white transition-transform active:scale-[0.99]"
              style={{
                height: 50,
                fontSize: 15,
                background: GRADIENT,
                boxShadow: "0 6px 16px rgba(193,68,14,0.28)",
              }}
            >
              {failed ? "Close" : "Got it"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

Three things that are load-bearing and must not be "cleaned up":
- The overlay has no `onClick`. Backdrop clicks must not dismiss.
- `playsInline={!isMobile}` is deliberate. React omits the attribute when false.
- `preload="metadata"` keeps a 9-14MB download off mobile data until the user taps play.

- [ ] **Step 2: Verify it compiles**

Run: `cd C:\Users\mikha\merge-frontend && npm run lint && npm run build`
Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
cd C:\Users\mikha\merge-frontend
git add src/components/IntroVideoModal.jsx
git commit -m "feat(intro): add reusable IntroVideoModal"
```

---

### Task 7: Mount on My Videos

**Files:**
- Modify: `C:\Users\mikha\merge-frontend\src\pages\MyVideosPage.jsx` (imports; tour call at lines 606-610; render before the closing `</div>` at line 775)

**Interfaces:**
- Consumes: `useIntroVideo` (Task 5), `IntroVideoModal` (Task 6), `INTRO_VIDEO_KEYS` (Task 3).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the imports**

Alongside the existing imports at the top of `src/pages/MyVideosPage.jsx`:

```js
import IntroVideoModal from "@/components/IntroVideoModal";
import { useIntroVideo } from "@/hooks/useIntroVideo";
import { INTRO_VIDEO_KEYS } from "@/lib/introVideos";
```

- [ ] **Step 2: Call the hook and gate the tour**

Replace the `myVideosTour` block (lines 603-610) with:

```js
  const intro = useIntroVideo(INTRO_VIDEO_KEYS.myVideos);

  // First-run onboarding tour for users who just signed up (no videos yet).
  // Runs once (persisted), after the welcome state + header have settled. On
  // mobile the tour opens/closes the nav drawer itself (see myVideosTour.js).
  // `intro.tourEnabled` holds it back until the intro video is dismissed.
  const myVideosTour = useStepTour(TOUR_KEYS.myVideos, startMyVideosTour, {
    enabled: checkedNew && isNewUser && intro.tourEnabled,
    delay: 650,
    isMobile,
  });
```

Note the tour keeps its existing `checkedNew && isNewUser` condition. The video shows to any user who has not seen it; the tour still only runs for brand-new users. These are independent on purpose.

- [ ] **Step 3: Render the modal**

Replace lines 773-775 with:

```jsx
      {/* Help FAB: replays the tour on demand (shared HelpFab component). */}
      <HelpFab onClick={myVideosTour.replay} />

      <IntroVideoModal
        open={intro.open}
        src={intro.src}
        title={intro.title}
        onClose={intro.close}
        onDismissWithoutSeen={intro.dismissWithoutSeen}
      />
    </div>
```

- [ ] **Step 4: Verify by hand**

Clear the flag, then load `/videos`:

```sql
DELETE FROM setting_preference WHERE pref_key = 'onboarding.introVideoSeen.myVideos';
```

Run: `cd C:\Users\mikha\merge-frontend && npm run dev`, then visit `/videos` as a **brand-new** account.
Expected: the modal opens, `Raphio1.mp4` plays on click with sound, no coach-mark tour appears while it is open, and the tour begins about 650ms after "Got it". Reload: the modal does not return and the tour does not re-run.

- [ ] **Step 5: Commit**

```bash
cd C:\Users\mikha\merge-frontend
git add src/pages/MyVideosPage.jsx
git commit -m "feat(intro): show intro video on My Videos before its tour"
```

---

### Task 8: Mount on the mode chooser

**Files:**
- Modify: `C:\Users\mikha\merge-frontend\src\pages\Creator.jsx` (imports at lines 1-6; hook call after line 15; the `!chosen` branch at lines 50-57)

**Interfaces:**
- Consumes: `useIntroVideo` (Task 5), `IntroVideoModal` (Task 6), `INTRO_VIDEO_KEYS` (Task 3).
- Produces: nothing consumed by later tasks.

The mode chooser has no coach-mark tour, so there is nothing to gate here. The hook must still be called before the `if (!chosen)` early return, or React will see a different hook count between renders.

- [ ] **Step 1: Add the imports**

In `src/pages/Creator.jsx`, after line 6:

```js
import IntroVideoModal from "@/components/IntroVideoModal";
import { useIntroVideo } from "@/hooks/useIntroVideo";
import { INTRO_VIDEO_KEYS } from "@/lib/introVideos";
```

- [ ] **Step 2: Call the hook unconditionally**

Immediately after line 15 (`const [searchParams, setSearchParams] = useSearchParams();`):

```js
  // Must run before the `!chosen` early return: hooks cannot be conditional.
  const intro = useIntroVideo(INTRO_VIDEO_KEYS.modeChooser);
```

- [ ] **Step 3: Render the modal in the chooser branch**

Replace lines 50-57 with:

```jsx
  if (!chosen) {
    return (
      <>
        <ModeChooser
          initialMode={localStorage.getItem("raphio_pipeline_mode")}
          onPick={handleModeChange}
        />
        <IntroVideoModal
          open={intro.open}
          src={intro.src}
          title={intro.title}
          onClose={intro.close}
          onDismissWithoutSeen={intro.dismissWithoutSeen}
        />
      </>
    );
  }
```

- [ ] **Step 4: Verify by hand**

```sql
DELETE FROM setting_preference WHERE pref_key = 'onboarding.introVideoSeen.modeChooser';
```

Visit `/create` with no `?mode=` and no `?session=`.
Expected: the modal opens over the three-card chooser and plays `Raphio3.mp4`. After "Got it", pick a mode, then use "Change mode" to come back. Expected: the modal does not reappear.

- [ ] **Step 5: Commit**

```bash
cd C:\Users\mikha\merge-frontend
git add src/pages/Creator.jsx
git commit -m "feat(intro): show intro video on the mode chooser"
```

---

### Task 9: Mount on all three creators via PromptStep

**Files:**
- Modify: `C:\Users\mikha\merge-frontend\src\components\session\PromptStep.jsx` (imports; tour call at lines 639-649; render near line 899)

**Interfaces:**
- Consumes: `useIntroVideo` (Task 5), `IntroVideoModal` (Task 6).
- Produces: nothing consumed by later tasks.

`PromptStep` is shared by all three creators, and its `pipelineMode` prop is already exactly `'prompt' | 'image' | 'references'`, which are three of the five intro keys. So one mount point covers three surfaces. Pass `pipelineMode` straight through as the key.

`onModeChange` is passed only when there is no session yet, which is how the existing tour distinguishes a fresh creation from resuming a draft. The intro video must respect the same signal: resuming a half-finished video should not open a tutorial.

- [ ] **Step 1: Add the imports**

Alongside the existing imports at the top of `src/components/session/PromptStep.jsx`:

```js
import IntroVideoModal from "@/components/IntroVideoModal";
import { useIntroVideo } from "@/hooks/useIntroVideo";
```

`INTRO_VIDEO_KEYS` is not needed here: the key is the `pipelineMode` prop.

- [ ] **Step 2: Call the hook and gate the tour**

Replace the `promptTour` block (lines 639-649) with:

```js
  // First-run onboarding for this creation screen. Both the intro video and the
  // tour auto-run once per mode (persisted) and only for a fresh creation: the
  // parent passes `onModeChange` only when there's no session yet, so resuming a
  // draft triggers neither. Switching modes remounts this component (Creator
  // swaps the two pipeline creators), so each mode shows its own video and tour
  // on first entry. The help FAB replays the tour via promptTour.replay.
  const intro = useIntroVideo(pipelineMode, { enabled: !!onModeChange });

  const promptTour = useStepTour(
    isReferencesMode ? TOUR_KEYS.promptReferences : TOUR_KEYS.promptImage,
    isReferencesMode ? startReferencesTour : startImageTour,
    { enabled: !!onModeChange && intro.tourEnabled }
  );
```

- [ ] **Step 3: Render the modal**

After the `AutoApproveIntroModal` block (line 899), insert:

```jsx
      <IntroVideoModal
        open={intro.open}
        src={intro.src}
        title={intro.title}
        onClose={intro.close}
        onDismissWithoutSeen={intro.dismissWithoutSeen}
      />
```

- [ ] **Step 4: Verify by hand**

```sql
DELETE FROM setting_preference WHERE pref_key IN (
  'onboarding.introVideoSeen.prompt',
  'onboarding.introVideoSeen.image',
  'onboarding.introVideoSeen.references'
);
```

Visit each of `/create?mode=prompt`, `/create?mode=image`, `/create?mode=references`.
Expected: each opens its own video (`Raphio4`, `Raphio5`, `Raphio6`), the prompt tour never fires while the modal is open, and it fires about 350ms after "Got it". Note `prompt` and `image` share one tour (`TOUR_KEYS.promptImage`) but have **separate videos**, so the second of the two shows its video with no tour after it. That is correct.

Then resume an in-progress session from `/videos`.
Expected: no intro video and no tour, because `onModeChange` is absent.

- [ ] **Step 5: Commit**

```bash
cd C:\Users\mikha\merge-frontend
git add src/components/session/PromptStep.jsx
git commit -m "feat(intro): show intro video on the three pipeline creators"
```

---

### Task 10: Full-system verification

**Files:** none modified.

- [ ] **Step 1: Run the whole test suite**

```bash
cd C:\Users\mikha\merge-frontend && npm test
cd C:\Users\mikha\merge-api && node --test tests/settings-intro-video.test.js
```
Expected: all pass.

- [ ] **Step 2: Reset every flag**

```sql
DELETE FROM setting_preference WHERE pref_key LIKE 'onboarding.introVideoSeen.%';
```

- [ ] **Step 3: Walk all five surfaces on desktop**

Confirm for each: the video opens once, plays with audio on click, the tour (where one exists) starts only after dismissal, and neither returns on reload.

| Surface | URL | Video |
| --- | --- | --- |
| My Videos | `/videos` | `Raphio1.mp4` |
| Mode chooser | `/create` | `Raphio3.mp4` |
| Prompt-only | `/create?mode=prompt` | `Raphio4.mp4` |
| Image-based | `/create?mode=image` | `Raphio5.mp4` |
| References | `/create?mode=references` | `Raphio6.mp4` |

- [ ] **Step 4: Repeat at a mobile viewport**

Reset the flags again, then use devtools device emulation at 390x844 (and a real phone if available).
Expected: the card never touches the screen edge, nothing scrolls horizontally, the close button is comfortably tappable, and tapping play enters fullscreen. On a desktop browser emulating mobile, `requestFullscreen` is the path taken; on a real iPhone it is `webkitEnterFullscreen`.

- [ ] **Step 5: Verify the failure paths**

- Set `VITE_INTRO_VIDEO_BASE=https://storage.googleapis.com/merge-images/does-not-exist` in `.env`, restart `npm run dev`, and load `/videos`. Expected: the "We couldn't load this video" message, the tour still runs after Close, and the flag is **not** written (confirm with `SELECT * FROM setting_preference WHERE pref_key LIKE 'onboarding.introVideoSeen.%'`). Remove the override afterwards.
- Stop the API, then load `/videos`. Expected: `settingsReady` still flips true via its `finally`, so the page is usable and the tour is not frozen.

- [ ] **Step 6: Run the React best-practices check**

Per CLAUDE.md, run the Vercel React Best Practices skill against every modified file and report findings in `file:line` format.

- [ ] **Step 7: Commit any fixes**

```bash
cd C:\Users\mikha\merge-frontend
git add -A
git commit -m "fix(intro): address verification findings"
```

---

## Follow-ups (not in this plan)

- **Re-encode the videos with `faststart`.** All five have their `moov` atom at the end, so the browser must range-fetch the tail before rendering a frame. Lossless fix: `ffmpeg -i Raphio1.mp4 -c copy -movflags +faststart Raphio1.mp4`, then re-upload. Nothing in the code depends on it.
- **CLAUDE.md is stale** on the brand gradient. It names `#F97066 → #FB923C`; the codebase uses `#C1440E → #E8632A` everywhere and `#F97066` appears nowhere. Worth correcting separately.
- Replay affordance, if wanted later: expose `clearIntroVideoSeen` and hang it off the existing `HelpFab`.

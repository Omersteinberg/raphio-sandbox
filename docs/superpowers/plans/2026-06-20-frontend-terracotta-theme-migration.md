# Frontend Terracotta Theme Migration: Implementation Plan

> **For agentic workers:** This is a visual/CSS refactor, not feature work. There are no
> unit-test cycles, each task's verification is `npm run build` (must compile) plus a
> visual on-brand check. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert every off-theme page/component in `merge-frontend` to consume the central
terracotta token layer, so the whole app re-themes from `index.css` going forward.

**Architecture:** A token layer (CSS variables in `index.css` + utility classes in
`tailwind.config.js`) is the single source of truth. Components stop hardcoding hex/Tailwind
color literals and instead use the brand utilities (`bg-terra`, `text-ink`, `bg-app-gradient`,
`bg-brand-gradient`, …) or the shadcn semantic classes (`bg-primary`, `text-foreground`, …),
both of which already resolve to terracotta.

**Tech Stack:** React 19, Vite, Tailwind v3 (shadcn token pattern), framer-motion, lucide-react.

## Global Constraints

- **Single commit at end.** Make ALL changes first; do not commit between tasks. One commit when the whole migration is done. No `Co-Authored-By` line.
- **Style only: never change behavior.** Do not touch state, props, handlers, data flow, API calls, or copy. Only swap colors / fonts / background utilities.
- **Do NOT touch the already-on-theme files** (they look correct and are out of scope for this pass): `LandingPage.jsx`, `AuthPage.jsx`, `BuyCreditsPage.jsx`, `MyVideosPage.jsx`, `VideoCard.jsx`, `AppHeader.jsx`, `ScriptLoadingScreen.jsx`, `PromptStep.jsx`.
- **`npm run build` must pass** after every task (run from `C:\Users\mikha\merge-frontend`).
- **Leave `bg-black` / video-frame surfaces alone**: video players and media frames are intentionally black.

## Conversion Dictionary (apply everywhere)

The deterministic find→replace recipe. Match on intent, not just string.

| Old (off-brand) | New (token) |
|---|---|
| `font-montserrat` | `font-figtree` |
| `linear-gradient(135deg, #F97066, #FB923C)` (coral primary gradient) | `var(--gradient-brand)` (inline) / `bg-brand-gradient` (class) |
| `linear-gradient(180deg, #FFF8F5 …#F8F7FF)` & other page bgs | `var(--gradient-app)` / `bg-app-gradient` |
| `#F97066` (coral) solid | `var(--terra)` / `bg-terra` / `text-terra` |
| `#FB923C` | `var(--terra-light)` / `bg-terra-light` |
| `#F0EAFF` (lavender wash) | `var(--surface-alt)` (`#F0EAE5`) / `bg-terra/5` |
| `#9B8FA8` (muted lavender) | `text-ink-muted` (`#6B5E7B`) |
| `#FFF0E6` (warm peach, current-step) | keep, or `bg-terra/5` |
| `bg-purple-600` / `bg-purple-500` (button/accent) | `bg-terra` |
| `hover:bg-purple-700` | `hover:bg-terra-dark` (or `hover:opacity-90`) |
| `text-purple-300/600/700/800` | `text-terra` |
| `border-purple-200/300/400/500` | `border-terra` / `border-terra/40` |
| `bg-purple-100` (light wash) | `bg-terra/10` |
| `ring-purple-200`, `bg-purple-500/20` | `ring-terra/30`, `bg-terra/20` |
| `indigo-*` / `blue-[456]00` / `violet-*` accents | terracotta equivalents (same rules as purple) |
| `border-gray-200/300` | `border-border` (warm) or `border-ink/10` |
| `text-gray-400/500` | `text-ink-muted` |
| `text-gray-700/900` | `text-ink` / `text-ink/80` |
| `bg-gray-50/100` | `bg-surface-alt` / `bg-cream` |
| shadcn semantics (`text-foreground`, `bg-primary`, `bg-card`, `bg-muted`, `border-border`, `text-destructive`) | **leave as-is**: already terracotta after the token retune |

---

## Task 0: Token layer ✅ DONE

**Files:** `src/index.css`, `tailwind.config.js`

Already complete: `:root` retuned to terracotta; brand variables added (`--terra`, `--terra-rgb`,
`--terra-light`, `--terra-dark`, `--cream`, `--cream-alt`, `--surface`, `--surface-alt`, `--ink`,
`--ink-rgb`, `--ink-warm`, `--muted-warm`, `--gradient-app`, `--gradient-brand`); Tailwind classes
`terra`/`cream`/`surface`/`ink` + `bg-app-gradient`/`bg-brand-gradient` wired; stale indigo/green
gradients removed.

## Task 1: VideoDetailPage ✅ DONE

**File:** `src/pages/VideoDetailPage.jsx`

Already complete: `font-figtree`, `var(--gradient-app)` background, green `bg-secondary` CTAs → `bg-primary`.

---

## Task 2: Create-flow step components (the main batch)

**Files (modify):**
- `src/components/session/ScriptStep.jsx`, heaviest: `bg-purple-*`, `text-purple-*`, `border-purple-*`, `ring-purple-200`, coral gradient, `border-gray-200/300`. Also uses shadcn `Button`/`Input`/`Textarea` (leave the imports; restyle inline classes).
- `src/components/session/FramesStep.jsx`: coral gradient + purple + `bg-muted`.
- `src/components/session/GeneratingStep.jsx`: coral gradient + purple progress visuals.
- `src/components/session/ResultStep.jsx`: coral gradient CTAs + purple.
- `src/components/session/EditingStep.jsx`: purple/gray; renders `TimelineEditor` (handled in Task 3).
- `src/components/session/ImagesStep.jsx`: purple + gray.
- `src/components/session/ReferenceLockStep.jsx`: purple + coral.
- `src/components/session/FrameGenerationStep.jsx`: coral gradient + purple.
- `src/components/session/VoiceConfigStep.jsx`: purple + gray; embeds `VoiceSelector`.
- `src/components/session/VoiceSelector.jsx`: purple/blue + shadcn `Input`; play/pause accent → `text-terra`.
- `src/components/session/BridgeSectionCard.jsx`: purple/indigo card accents.
- `src/components/session/ClipEditModal.jsx`: purple + gray modal.
- `src/components/session/IntroBriefStep.jsx`: `const GRADIENT = "linear-gradient(135deg, #F97066, #FB923C)"` → `var(--gradient-brand)`; purple + shadcn inputs.
- `src/components/session/IntroScriptStep.jsx`: coral gradient + purple.

**Per-file procedure (repeat for each):**

- [ ] **Step 1:** Open the file; grep it for off-brand markers: `purple|indigo|violet|blue-|#F97066|#FB923C|#F0EAFF|#9B8FA8|gray-|montserrat`.
- [ ] **Step 2:** Apply the Conversion Dictionary to each match. For any local `const GRADIENT`/color constant, repoint it to `var(--gradient-brand)` / `var(--terra)`.
- [ ] **Step 3:** Leave all shadcn semantic classes, behavior, props, and copy untouched.
- [ ] **Step 4:** `npm run build` → expect `✓ built`. Fix any breakage before moving on.

**Verification (end of Task 2):**
- [ ] `npm run build` passes.
- [ ] Grep the whole `src/components/session/` dir for `purple|indigo|#F97066|#FB923C|#F0EAFF|montserrat` → only `PromptStep.jsx`/`ScriptLoadingScreen.jsx` (already-done, may have 0) should remain; ideally zero new hits.

## Task 3: Timeline editor suite

> **Note / open question:** these files lean on shadcn semantics (`bg-card`, `bg-muted`,
> `text-foreground`) that now resolve to the LIGHT warm theme, so the editor will render
> light instead of its old dark look. That's the intended brand direction, but it's a
> bigger visual shift; eyeball it for contrast (e.g. timeline tracks on cream) and bump
> opacities if anything washes out.

**Files (modify):**
- `src/components/timeline/TimelineEditor.jsx`: shell + shadcn `Button`; hardcoded accents → terra.
- `src/components/timeline/TimelineControls.jsx`: play/zoom controls; semantic + gray.
- `src/components/timeline/TimelineCanvas.jsx`
- `src/components/timeline/TimelineTrack.jsx`
- `src/components/timeline/TimelineItem.jsx`: selected/active state → `border-terra`/`ring-terra`.
- `src/components/timeline/TimelineRuler.jsx`
- `src/components/timeline/TimelinePlayhead.jsx`: playhead accent → `bg-terra`.
- `src/components/timeline/AssetPanel.jsx`: heaviest semantic usage; gray/slate → ink/border.
- `src/components/timeline/VideoPreview.jsx`: keep black media frame; restyle chrome only.
- `src/components/timeline/modals/TTSModal.jsx`
- `src/components/timeline/modals/AudioUploadModal.jsx`
- `src/components/timeline/modals/ItemEditModal.jsx`
- `src/components/timeline/modals/NarrationEditModal.jsx`

**Procedure:** same per-file procedure as Task 2.

**Verification:**
- [ ] `npm run build` passes.
- [ ] Grep `src/components/timeline/` for `purple|indigo|blue-|slate-[5-9]|gray-|#F97066|montserrat` → zero off-brand hits (semantic classes may remain and are fine).

## Task 4: Shared leftovers

**Files (modify):**
- `src/components/merge/MergeFloatingActionButton.jsx`: `hover:text-purple-600 hover:border-purple-300` → `hover:text-terra hover:border-terra/40`; `border-gray-200 text-gray-700 hover:bg-gray-50` → `border-border text-ink-muted hover:bg-surface-alt`.
- `src/components/merge/MergeLoadingOverlay.jsx`: progress bar `linear-gradient(135deg, #F97066, #FB923C)` → `var(--gradient-brand)` (already on dark overlay; rest is fine).
- `src/components/session/DurationEstimate.jsx`: `needs_ai_fill_on` info state uses blue `#1D4ED8`/`#EFF6FF`/`#BFDBFE`; optionally warm it to the `--info` token or leave (semantic info color is acceptable). Low priority.

**Procedure:** same per-file procedure.

**Verification:**
- [ ] `npm run build` passes.

## Task 5: Final verification & commit

- [ ] **Step 1:** Full grep across `src/` for residual off-brand literals: `#F97066|#FB923C|#F0EAFF|#9B8FA8|bg-purple|text-purple|border-purple|font-montserrat`. Expect zero outside the intentionally-untouched on-theme files.
- [ ] **Step 2:** `npm run build` → `✓ built`.
- [ ] **Step 3 (manual):** `npm run dev`, log in, and spot-check a create flow end-to-end (Prompt → Script → Frames → Generating → Result → Edit/timeline) + a completed video detail page. Confirm terracotta consistency, no lavender/purple/coral, readable contrast.
- [ ] **Step 4:** Single commit:
```bash
git add -A
git commit -m "style(frontend): migrate off-theme pages to central terracotta token layer"
```

---

## Self-Review

- **Spec coverage:** every file from the analysis's "needs updating" list maps to a task (Task 2 = create-flow steps, Task 3 = timeline suite, Task 4 = shared bits; Tasks 0-1 already done). On-theme files explicitly excluded.
- **Placeholders:** none, the Conversion Dictionary gives the concrete mapping; per-file notes name the actual off-brand markers present.
- **Consistency:** token names (`terra`, `terra-light`, `terra-dark`, `cream`, `surface`, `surface-alt`, `ink`, `ink-warm`, `ink-muted`, `app-gradient`, `brand-gradient`) match exactly what Task 0 defined in `index.css` + `tailwind.config.js`.

## Risks

- **Timeline goes light** (Task 3), biggest visual change; may need contrast tuning. Flagged inline.
- **shadcn primitives** (`ui/button.jsx`, `ui/input.jsx`, etc.) are intentionally NOT in the task list, they already inherit the retuned tokens. Only touch them if a converted component looks wrong because of a primitive default.
- **Opacity modifiers** require the `*-rgb` triples (already defined for `terra`/`ink`); `cream`/`surface` are solid-only (no `/opacity`).

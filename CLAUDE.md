# Raphio.ai — Claude Code Context

## What This Project Is
Raphio.ai is a SaaS platform where users upload images that are transformed into AI-generated videos. It is currently in pre-launch phase with active frontend development.

## Tech Stack
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Components:** shadcn/ui (New York style)
- **AI UI:** @assistant-ui + Vercel AI SDK
- **Routing:** React Router v7
- **HTTP:** Axios
- **Icons:** Lucide React

## Project Structure
- `src/pages/` — full page components (LandingPage, LoginPage, RegisterPage, MyVideosPage, ImagePipelineCreator, CharacterPipelineCreator, BuyCreditsPage, VideoDetailPage)
- `src/components/` — reusable components
  - `session/` — step components for the video creation wizard (PromptStep, ScriptStep, VoiceConfigStep, ResultStep, ImagesStep)
  - `ui/` — shadcn base components (New York style)
- `src/hooks/` — custom React hooks
  - `session/` — useSession, useSessionBase, useImagePipeline, useCharacterPipeline
  - `useAuth.jsx` — authentication state
- `src/services/` — API call functions
- `src/constants/` — styles.js, other constants
- `src/lib/limits.js` — MAX_IMAGES (10), VIDEO_COST constants
- `public/` — static assets including logo.svg and logo.png

## Brand & Design
- **Primary accent:** `#F97066` (orange/coral) with gradient to `#FB923C`
- **Text dark:** `#2D2235` (dark purple)
- **Text mid:** `#6B5E7B`
- **Text light:** `#9B8FA8`
- **Background:** consistent warm light gradient across all pages
- **Logo:** `/public/logo.svg` — use this everywhere, never use text or placeholder icons
- **Font:** Poppins (loaded via index.html or CSS)
- **Button style:** gradient `linear-gradient(135deg, #F97066, #FB923C)` with white text — apply this consistently to ALL primary buttons across the app

## Video Creation Flow
The main user journey has these steps:
1. **PromptStep** — user enters description, uploads images (ghost grid), picks style
2. **ScriptStep** — AI generates script, user can edit or chat with AI to refine
3. **VoiceConfigStep** — user picks narration voice and toggles background music
4. **Generation** — backend processes video (VEO 3.1, ElevenLabs, FFmpeg)
5. **ResultStep** — user views and downloads final video, can create new

## Key Conventions
- Never use hardcoded `localhost` URLs — use environment variables via `import.meta.env.VITE_API_URL`
- All primary buttons must use the orange/coral gradient — no plain colored buttons
- Background is consistent across all pages — do not add new gradients or solid backgrounds
- Max images per video: 10 (use `MAX_IMAGES` from `@/lib/limits`)
- Session state lives in `useSession.js` — do not duplicate state elsewhere
- Always use React Router v7 `navigate` for navigation — exception: `ResultStep` "Create New" uses `window.location.href = '/create'` intentionally
- shadcn/ui components must use New York style variants

## Active Development Notes
- Credit system is temporarily bypassed for local testing — do not remove bypass code without instruction
- `setTargetDuration` has been removed from `useSession.js` — do not re-add it
- `reset()` in `useSession.js` is intentionally minimal — navigation is handled at component level

## Mobile / Responsive
- **`useIsMobile()` / `useMediaQuery(query)`** (`src/hooks/useMediaQuery.js`) is the single mobile-detection primitive. `useIsMobile()` = `(max-width:767px)` (below Tailwind `md`). Use the hook for **inline-styled** components (they can't use `sm:`/`md:` prefixes); use Tailwind responsive prefixes everywhere else. Breakpoints: phone `< md` (768), desktop `≥ lg` (1024). A few wizard steps (ScriptStep, FramesStep) switch at `< lg` (1023) because that's where their two-pane layout stacks.
- **Mobile modal/sheet pattern:** the overlay needs `p-4` and the card needs `max-h-[90vh] overflow-y-auto`, or it touches the screen edges / clips off-screen. The shared `ui/dialog.jsx` already insets.
- **dnd-kit (`@dnd-kit/core` + `sortable`) is the touch-safe drag library** — use it for ANY reorder/drag that must work on touch. **framer-motion `<Reorder>` is NOT touch-safe** — it mis-fires on touch-scroll and caused an infinite re-render → API-flood loop. (Already used: PromptStep photo grid, the mobile Edit-Clips list.)

## Mobile video editing (important — avoids a re-introduced bug)
- The **Creator → `useSession` wizard loops on mobile** (its URL-sync effects flood the API and the strict global rate-limiter logs the user out). **Do NOT route mobile editing through `/create` / `useSession`.**
- **The intermediate "Edit Clips" list was removed — editing happens entirely in the `TimelineEditor`.**
- **Both desktop and mobile** "Edit Video" (`VideoDetailPage`) navigate to the **single dedicated route `/video/:id/edit` → `EditorPage`** (`src/pages/EditorPage.jsx`, formerly `MobileEditorPage`). It calls `enterEditingMode`, then renders the responsive `TimelineEditor` directly (`onUpdateSection`→`updateClip`, `onRegenerateNarration`→`regenerateNarration`; Back/Export → `/video/:id`). **Do NOT route editing through `/create` / the `useSession` wizard** — its stage round-trip could land desktop on the result screen instead of the editor, and its URL-sync effects loop on mobile (flooding the API → the rate-limiter logs you out).
- `EditingStep.jsx` (the wizard's editing step, a thin `TimelineEditor` wrapper) is now **only reachable by manually visiting `/create?session=`** — not the normal path. The pipeline creators still pass it old clip-op props (`regenerateClip`/`reorderClips`/etc.) — unused/harmless.
- `MobileTimelineEditor.jsx` is **dead/unused** (superseded by the touch-enabled `TimelineEditor`) — don't build on it.

## Timeline editor (`components/timeline/`)
- `TimelineEditor` is **one responsive layout** (no separate mobile component): `isMobile` hides the asset panel, puts preview on top, lets the timeline fill height, and shows a **bottom action bar** (on desktop too).
- **Touch support** lives in `TimelineCanvas` / `TimelineItem` / `TimelinePlayhead`: touch handlers mirror mouse, reading `e.touches?.[0]?.clientX` / `e.changedTouches`; `window` listeners add `touchmove` (`{passive:false}`) + `touchend` alongside mouse. A **movement threshold in `handleDragEnd`** stops a click from saving (it was flashing "Saving…").
- **Trimming = dragging the clip's edge handles on the timeline** (visible when selected; `<`/`>` chevrons; `trim-start` keeps the right edge fixed). The old **`ItemEditModal` trim modal was removed — do not reintroduce it.**
- Bottom action bar is **context-sensitive**: no selection → Assets / Audio / Voice / Zoom±; clip selected → Split / Speed / Delete (+ **Regenerate** for video clips, + **Narration** for narration-audio items). A slim **"Done editing clip"** bar above the action bar deselects. Assets/Speed/Narration open bottom sheets or modals; mobile audio-adds auto-place on the timeline (no drag).
- **Regenerate clip** (video clips): the action opens `modals/RegenerateClipModal` (edit the AI prompt, prefilled from `section.aiPrompt`/`visualDescription`), then calls `sessionService.regenerateClip(sessionId, sectionId, { prompt, imageUrl }, onProgress)` directly (works in both hosts, no prop). Backend job type is `REGENERATE_CLIP`; it reports **no sub-stage progress**, so the editor drives a **simulated** bar in the reused `ExportProgressModal` (title "Regenerating clip"), then `timeline.loadTimeline()` to pick up the new `generatedClipUrl`.
- **Snapping** (`TimelineCanvas`): clips snap (10px) to the edges of clips on **every track** (cross-track alignment), the playhead, 0, and the timeline end — no fine grid (it felt steppy). Both the drag preview and the committed drop use the same `findSnapTarget`/`getSnapPoints`.
- **Onboarding = interactive tour, NOT a text modal** (the old wall-of-text "How to use" modal was removed — don't bring it back). Uses **driver.js** via `src/lib/editorTour.js` (`startOverviewTour`/`startClipTour`, both `isMobile`-parameterized; steps target `data-tour="..."` anchors in `TimelineEditor.jsx` + the canvas's existing `[data-timeline-container]`; steps whose anchor isn't in the DOM are filtered out). **Overview** runs once on first editor open; **clip** tour runs once on first clip selection — both persisted so they don't repeat. The **"How to use" button** replays the overview now AND re-arms the clip tour (the only way to see them again). "Seen once" flags live in `src/lib/tourState.js` (`tourSeen`/`markTourSeen`/`clearTourSeen`, `merge:tour:*` localStorage keys, mirrors `lib/returnTo.js`); per-mount `useRef` guards stop re-triggers within a session. Popover is themed in `src/index.css` (`.driver-popover.raphio-tour`) with brand tokens. To add a new contextual tour, add a launcher in `editorTour.js` + a `tourState` key + a trigger effect.

## Per-clip speed (enabled end-to-end)
- Previously disabled: `merge-api/src/services/timeline.service.js` `updateItem` force-set `speed = 1.0`. Now it **honors `speed`** (clamped 0.25–4×) and `syncTimelineItemDurations` **skips speed≠1 clips** so the re-timed length isn't reset. The FFmpeg renderer (`trimClip` → `setpts`/`atempo`) already applies speed; the frontend re-times `duration = keptSource/speed` and `VideoPreview` sets `playbackRate`. **Backend changes need an API restart.**

## Local dev / backend gotchas (these cost real debugging time)
- **DB host:** `raphio.ai:3306` is behind Cloudflare (which doesn't proxy MySQL) → it times out. Use the **direct origin IP `51.161.174.248:3306`** in `merge-api/.env` for local dev.
- The backend has a **strict in-memory global rate-limiter** — a front-end render/API loop trips it fast, and the failed auth checks then log you out / 429 the login. **Restart the API to clear it.**
- A separate CRA app (Sendatradie CRM) also defaults to **port 3000** and collides with `merge-api` — run one on a different port.

## Skills Available in Claude Code
- **UI/UX Pro Max** — use this before making any design decisions. Query it for color palettes, font pairings, UX guidelines, and component patterns relevant to SaaS video tools
- **Vercel Labs React Best Practices** — run this against any modified files after making changes. Report findings in `file:line` format before considering a task complete

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

## Skills Available in Claude Code
- **UI/UX Pro Max** — use this before making any design decisions. Query it for color palettes, font pairings, UX guidelines, and component patterns relevant to SaaS video tools
- **Vercel Labs React Best Practices** — run this against any modified files after making changes. Report findings in `file:line` format before considering a task complete

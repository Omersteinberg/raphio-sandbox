# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Creators making longer-form AI video (up to ~2 minutes) who want real creative control, not a quick novelty-clip generator. Explicitly not the 5-8 second single-clip audience that most AI video tools serve.

The shipped landing page (`src/pages/LandingPage.jsx`) currently speaks to a broader SMB/self-serve audience (event promo, product launch, restaurant ads; one-time credit packs; no subscription), and the underlying pricing tiers cap at 60s. Confirmed by the user: the intended direction is trending toward a higher-end, professional positioning over "cheap and cheerful," but the pricing/marketing copy has not caught up yet. This is a known, separately-tracked gap - do not silently resolve it inside unrelated design work, and do not assume the current landing copy reflects the target audience going forward.

## Product Purpose

Users provide a prompt, their own photos, or a reference image/style. Raphio generates a narrative AI video (script, scene transitions, voice narration, music) longer than a typical short AI clip, which the user can then edit (trim, reorder, regenerate clips, adjust per-clip speed/volume, multi-track audio) in a dedicated timeline editor before downloading or sharing. Success is a finished, editable, longer-form video the user is confident enough in to publish.

## Positioning

Confirmed directly by the user: **there is currently no mechanism a competitor could not truthfully copy.** Raphio uses the same underlying AI models as other AI-video tools (VEO 3.1, ElevenLabs, FFmpeg per the existing codebase). The one differentiator today is a longer duration ceiling (up to ~2 minutes) versus typical 5-8 second clip generators, combined with three converging input paths (prompt / own photos / reference image) and post-generation editing via the timeline editor. Do not invent a stronger or more defensible claim than this in future copy or design work - the team is aware this is thin and is treating it as an open problem, not a hidden strength to dress up.

## Operating Context

- Multi-step video creation wizard: prompt/photo/reference input -> AI-generated script (editable, chat-refinable) -> voice/music config -> generation -> result.
- Credit-based, one-time-purchase pricing (no subscription); duration-tiered credit cost.
- Post-generation editing lives in a separate dedicated timeline editor (`/video/:id/edit`), not the creation wizard - trim, split, regenerate clips, per-clip speed, multi-track audio (narration/audio/music), snapping, onboarding tour.
- Sessions are resumable (`?session=`) with backend-driven pipeline progress and stuck-generation recovery.
- Admin panel for user/promo/overview management, gated by role.
- Pre-launch phase, active development, small team (Melbourne, Australia-based).

## Capabilities and Constraints

- Multi-input pipeline: prompt-only, user-uploaded photos, or a reference image/style, all converging to one finished video.
- Duration ceiling: product intent is "up to ~2 minutes"; currently-shipped pricing tiers (Free/Starter/Creator/Studio) top out at 60s. Open, undecided: when/how pricing and marketing copy will be updated to match the longer-form positioning - do not assume or invent a resolution.
- Underlying generation models (VEO 3.1, ElevenLabs, FFmpeg) are shared with competitors; not a source of differentiation.
- Editing capabilities (per-clip speed, multi-track volume mixing) are backend-ready and already exposed in the UI.
- Max 10 images per upload (`MAX_IMAGES`).

## Brand Commitments

- Name: Raphio / Raphio.ai. Logo: `/public/logo.svg`.
- Visual identity: warm terracotta/cream/near-black palette (`--terra #C1440E`, `--terra-light #E8603C`, `--cream #F5F0EB`, `--ink #2D2235` in `src/index.css`) is a **fixed brand constraint for now**, confirmed directly by the user. Future design work, critiques, and audits must not flag it or propose replacing it. The user is open to revisiting it later, but not currently in scope - treat any future prompt to "fix the palette" as out of scope unless the user explicitly reopens it.

## Evidence on Hand

Pre-launch: no confirmed testimonials, customer names, logos, press mentions, case studies, or usage statistics exist anywhere in the product today. Future design or copy work must not fabricate any of these.

Real demonstration assets do exist and are genuine Raphio output (not stock/placeholder): a hero background video and a four-item "See it in action" reel (event promo, product ad, brand launch, restaurant ad) in `src/pages/LandingPage.jsx`.

## Product Principles

1. The honest differentiator is video length and post-generation creative control, not model novelty - lead with depth (narrative structure, editing control) rather than implying a proprietary AI advantage that doesn't exist.
2. Direction is trending toward a higher-end, professional positioning; treat "budget/value" framing (subscription-free bargain language, heavy discount badges) as legacy, not aspirational, in new work - while knowing the current shipped copy hasn't caught up yet.
3. Serve creators who explicitly rejected quick-clip novelty tools - design and copy should reinforce depth and control, not novelty or speed.
4. Preserve the terracotta/cream/near-black brand identity as a fixed constraint across all surfaces; do not introduce competing palettes.
5. Never fabricate social proof, testimonials, or usage numbers - the product is pre-launch and has none yet.

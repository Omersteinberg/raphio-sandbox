---
target: ConvergenceStage opening-beat replacement concepts
total_score: 1
max_score: 4
na_heuristics: 1,2,3,4,5,6,7,9,10
p0_count: 1
p1_count: 0
timestamp: 2026-08-10T09-58-37Z
slug: src-pages-landingpage-jsx-convergencestage
---
Method: dual-agent (A: general-purpose concept ideation · B: general-purpose detector/browser/structural evidence)

## Design Health Score (scoped: current shipped ConvergenceStage, post b+a tune)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 8 | Aesthetic and Minimalist Design | 1/4 | Quieting fixed volume, not shape - resolves to a hub-and-spoke diagram whose payload is the brand mark, not the product |
| 1,2,3,4,5,6,7,9,10 | — | n/a - this is a forward concept-exploration session, not a full interface audit; only the "does the current device still communicate the wrong thing" question is meaningfully scorable pre-replacement |
| **Total** | | **1/4 (applicable)** | **Critical on the one applicable axis** |

## Design Specificity Verdict

Stripped of animation, the current (already-tuned) device is a hub-and-spoke diagram: three cards, two curved lines and one straight line, all terminating in a 76px disc containing the bare Raphio "R" mark. The disc shows nothing about video - no frame, no scene, no timeline - so the device's payload is literally the company logo standing in for "the AI," not the product's actual output. That's the generic-AI-product tell PRODUCT.md warns against: it visually sells "magic happens here" for a product whose honest differentiator is finished, editable video. Thinning the lines and removing the loop (the prior tuning pass) fixed the volume of the cliché, not its shape.

Structural note from evidence: Step 1/2/3 currently measure 590px / 172px / 458px tall at 1440px viewport, separated by 48px and ~116px gaps, all sharing one `max-w-5xl`/1024px-wide container - Step 2 (`BuildAssemblyCard`) is comparatively the flattest, quietest beat today (a plain tinted panel, no imagery at all), which is part of why Step 1 currently reads as the section's whole visual personality.

## What's Working (carries into any replacement)

1. **`useBuildTimeline`/`getBuildTimelineState`** - the shared pure-function clock already driving Step 2's status text/dot row and Step 3's progress bar in lockstep - is a clean, reusable mechanism regardless of what replaces Step 1.
2. **The three custom `*CardArt` illustrations** (`PromptCardArt`'s typewriter bubble, `PhotosCardArt`'s real fanned photos + pulsing "+", `ReferenceCardArt`'s real before/after photos) are genuine, product-specific assets worth carrying forward untouched into any concept.
3. **`VideoShowcase`** is already the strongest beat in the section - a real Raphio output still, not a mockup - and should anchor whatever the opening beat becomes.

## Concepts (the core deliverable)

### Concept A - "Assembly Cut" (recommended first build)
**Resting state:** the three `StartCard`s unchanged; below them, a single horizontal strip styled after the real in-product `TimelineTrack`/`TimelineItem` grammar - a thin ruler-tick row over one lane showing three faint dashed-outline empty slots aligned under their respective cards. No node, no logo, no glow.
**Animated sequence (~6-7s, keyed to the existing clock):** the three slots fill in order with small `TimelineItem`-style clip blocks (faded thumbnail); the strip then keeps growing rightward, one new clip block per `BUILD_STAGES` beat (story/style/voice/pace/final), with a second thin narration lane appearing beneath starting at "Adding voice." On the closing beat the last clip's thumbnail crossfades into the exact `FINAL_SCENE` still and the strip's right edge resolves directly into `VideoShowcase`'s frame - same pixels, not a metaphorical stand-in.
**Fate of Step 2/3:** `BuildAssemblyCard` absorbed (status-text crossfade kept, dot row replaced by the strip, same clock instance). `VideoShowcase` adapted, not left alone: its entry becomes a hand-off from the strip's last frame rather than an independent scale-in.
**Implementation surface:** new - the strip/lane component and slot-fill/append sequencing. Reused as-is - `useBuildTimeline`, `STEP1_CARDS`/`StartCard`/the three `*CardArt` components, `FINAL_SCENE`, `VIDEO_FEATURES`. Deleted entirely - `GlowNode`, `PulseRing`, `TravelToken`, the three `*Token` components, and all curved-SVG-path machinery.
**Corrections from evidence (B):** the real timeline editor renders **no waveform visualization anywhere** - audio/narration/music clips are flat colored blocks with an icon + label, nothing more (confirmed by source read, no `<canvas>`/waveform-drawing code exists). A concept claiming "real waveforms" would invent detail the product doesn't have; the strip's audio lane should stay a flat labeled block to match the real product honestly - `BuildWaveform`'s existing 5-bar animation is already more waveform-like than the actual editor and should not be extended into a fake texture. Separately, the real editor color-codes tracks by kind (terracotta/blue/green/purple) - DESIGN.md's One Warm Voice Rule forbids that palette as landing-page decoration, so all clip blocks here should render in terracotta/warm-neutral tones regardless of kind, as a deliberate simplification stated explicitly rather than left looking like an oversight.
**Biggest risk:** shrinking real editor chrome to card scale risks reading as busy/technical clutter - the same failure mode (visual noise dominating the section) resurfacing in a new shape.

### Concept B - "The Storyboard Wall"
**Resting state:** cards unchanged; below them a tinted panel containing ~5 blank storyboard panels (thin borders, faint pencil-corner marks), waiting.
**Animated sequence:** panels fill left to right, one per `BUILD_STAGES` beat, each completing its own sketch-draws-in-then-crossfades-to-full-color-still micro-transition. On the closing beat all five hold, then collapse inward directly into `VideoShowcase`'s frame position.
**Fate of Step 2/3:** `BuildAssemblyCard` absorbed the same way as Concept A. `VideoShowcase` adapted only at its entry trigger (fires off the grid's collapse instead of its own scroll trigger).
**Implementation surface:** new - five miniature two-state (sketch/still) panel components; there is no existing sketch-art asset anywhere in the codebase, so this is real illustration authoring, not just styling. Reused - the clock, `BuildStatusText`, `VideoShowcase` structure. Deleted - same convergence machinery as Concept A.
**Biggest risk:** five hand-authored sketch panels is real scope with no reuse shortcut, and "storyboard panels forming" is itself a fairly common ad/explainer trope - real chance of landing on a different, equally generic device.

### Concept C - "One Seed, One Sequence"
**Resting state:** identical to today, including the existing click affordance on `StartCard`; nothing exists below the cards until one is chosen.
**Animated sequence (~5-6s from click):** the selected card's own illustration transforms in place. For photos - the strongest case, since `PhotosCardArt` already has three real fanned photos - the fan un-stacks/spreads and a thin bar grows beneath each photo, becoming the sequence's first frames without leaving the card's footprint; the other two cards recede. The mini-sequence then extends into narration lane + more frames, growing into `VideoShowcase`'s position.
**Fate of Step 2/3:** `BuildAssemblyCard` fully eliminated as a separate component - the growing sequence born from the chosen card IS step 2, continuously. `VideoShowcase` stops being independently triggered and becomes this device's terminal frame - the largest structural change of the three.
**Implementation surface:** the largest rewrite. `PhotosCardArt`'s fan positions reuse verbatim as a starting layout, but the un-stack choreography is new, and the prompt/reference cards each need their own bespoke equivalent (a chat bubble doesn't "un-stack," two photos don't reduce to "three frames" the same way) - so despite reusing card art visually, the interaction logic can't be shared across all three cards. The clock's shape is reusable as a pattern, not as the same shared instance, since it now needs to originate from a click + a measured card position rather than scroll.
**Biggest risk:** building three fully distinct, equally polished choreographies (one per input type) is a scope risk large enough to become three separate animations to maintain instead of one.

## Recommendation

Build Concept A ("Assembly Cut") first: it most directly answers the brief's core instruction (echo the real product surface rather than invent a decorative one), needs the least net-new authorship of the three (no illustration work, no per-input bespoke choreography), and produces the clearest "video coming to life" read because the payoff frame is literally the same pixels as `VideoShowcase`'s still, not a metaphorical stand-in for it.

Verify in-browser, in this order, before committing further: (1) the resting state's three empty dashed slots read as "waiting to be filled," not as a mysterious absence; (2) the slot-fill beat at real card width - miniature `TimelineItem`-style blocks must not look cramped/technical at landing-page scale, this is the concept's real risk; (3) the handoff moment where the strip's last frame becomes `VideoShowcase`'s poster image actually registers as continuity rather than two adjacent things that happen to match.

## Minor Observations
- Detector scan of the full "How it works" section (lines 123-1607) returned 0 errors, 2 warnings (both `layout-transition`, on small dot/pip elements, not full layout), 20 advisories (all `design-system-color`/`design-system-font-size` drift from DESIGN.md's documented ramp/palette) - no structural blockers for any of the three concepts.
- DESIGN.md scopes the warm-dark `.editor-dark` theme explicitly to the timeline editor ("the one place in the product with a real dark surface") - none of the three concepts should borrow that dark palette for the landing page even though it's the "authentic" editor theme; staying in the light warm-cream system is the correct reading of that boundary.
- All three `*CardArt` illustrations are already reused verbatim by `MobileInputStage` on mobile - any desktop replacement that keeps using them stays consistent with what mobile already ships, at no extra cost.

## Questions to Consider
- Concept A's strip risks feeling like a shrunk-down app screenshot rather than a piece of marketing craft if not kept aggressively minimal - how much of the real editor's chrome (ruler ticks, multi-row lanes) actually needs to survive at card scale for the "this is what building looks like" message to land?
- Is absorbing `BuildAssemblyCard` and `VideoShowcase` into one continuous device (Concepts A/B) worth losing their current independent scroll-triggered reveals, or does a continuous device read as more "premium/considered" per DESIGN.md's Editor's Desk north star specifically because it removes the seams?
- Concept C is the boldest and most technically expensive option - is a bigger one-time investment worth it here, given this section is the landing page's opening beat and gets seen by every visitor?

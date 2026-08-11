---
target: HowItWorks mobile-specific redesign
total_score: 4
max_score: 8
na_heuristics: 1,2,3,4,5,7,9,10
p0_count: 0
p1_count: 1
timestamp: 2026-08-07T07-11-01Z
slug: howitworks-mobile-specific-redesign
---
**Method: dual-agent (Assessment A: design ideation · Assessment B: detector + technical/architecture verification)**
**Fallback signal:** No browser tool in this session — Assessment B substituted code-derived arithmetic and direct source reading for visual/browser evidence.

## Design Health Score (scoped to ConvergenceStage mobile only)

| # | Heuristic | Score | Note |
|---|-----------|-------|------|
| 6 | Recognition Rather Than Recall | 2/4 | The only interactivity cue on a tile is a subtle background-alpha/shadow shift. In practice card 1's support sentence is the only one of three most mobile visitors will ever read - the other two are hidden behind an undiscovered tap |
| 8 | Aesthetic and Minimalist Design | 2/4 | Confirmed by geometry, not impression - see honest critique below |
| - | All others | n/a | Out of scope - single mechanism under review |
| **Total** | | **4/8 (50%)** | **Acceptable, low end** |

## Honest critique of the current state

This is a real structural ceiling for this specific device, not an unpolished execution. Round 1's fix cut the node's top margin from 192px to 32px, a 6x reduction. That's the exact change that breaks the device: each convergence line carries a 9px blurred glow halo plus a 3.5px core plus a 4px flowing overlay, and near the node all three must occupy the same terminal point by definition. The zone where the three glow-halos become visually indistinguishable has a roughly fixed absolute size (~55-60px). On desktop that consumes a small fraction of a ~230px line run. On mobile, compacted to a ~70px run, it consumes most of the line's visible length. You cannot fix this by nudging the margin back up without reintroducing the height problem round 1 solved.

Two more problems layer on top, independently real:

Pacing: the full sequential draw cycle runs ~5.8s. A mobile visitor flick-scrolling past is statistically likely to see line 1 mid-draw and move on, never reaching lines 2 or 3.

Discoverability: nearly two-thirds of the section's explanatory copy (cards 2 and 3's support sentences) is functionally invisible to most mobile visitors today, hidden behind an undiscovered tap.

Three rounds this session fixed real, distinct, correctly-diagnosed symptoms (height, art legibility, caption collision) - that work is worth keeping. But none of it touched the upstream geometric and pacing problems, because those require changing the mechanism, not its sizing.

## Three options

Desktop's ConvergenceStage stays byte-for-byte unchanged in all three.

### Option 1 - Intake tab row + single travelling token into a fused card (recommended)
Three compact tabs (existing MobileArt, 48-56px, plus a one-line label) sit flush atop one persistent card. On scroll-into-view, the section auto-plays once: tab 1 lights, one small token (reusing PromptToken/PhotosToken/ReferenceToken verbatim) travels a short ~20-40px distance into the card and is absorbed with the same arrival-pulse language GlowNode already uses; then tab 2, then tab 3. Only one token exists on screen at a time, so the "lines become indistinguishable near the destination" failure cannot occur. Persistent copy on the card survives even if a user scrolls past before auto-play finishes. Tapping a tab afterward replays that token's travel.

- Inputs: same real MobileArt pieces, now visually subordinate (tab-shaped, not independent elevated tiles).
- Transformation: literal travel + absorption, auto-played so it's seen without requiring discovery.
- Output: unchanged - VideoShowcase stays the section's distinct climax.
- BuildAssemblyCard/VideoShowcase: kept exactly as-is internally. Only outer wrapper margins change on mobile (closing the gap, matching background) so the section reads as one continuous surface.
- New work: compact tab-row layout; short-distance retarget of the existing token/pulse pattern; a small 3-step auto-play sequencer; a CSS-only continuity pass on BuildAssemblyCard's wrapper. No new cross-component state.
- Reduced motion: no token travels. Tab 1 renders statically active on load; the card shows a static text badge instead of an animated arrival. Tapping a tab swaps instantly, no transition.
- DESIGN.md risk: low.
- Scores: transformation shown 9/10, legibility 9/10, implementation risk 7/10 (low).

### Option 2 - Scroll-snap filmstrip, three before-after panels, shared destination thumbnail
A native scroll-snap carousel, three panels at ~85% width so the next one peeks. Each panel: MobileArt (56-64px) -> small fixed arrow -> a small thumbnail that's the same still every time (scene5Img/FINAL_SCENE.src, the actual asset VideoShowcase uses). Swiping through, three different starts visibly resolve to the same destination image.

- BuildAssemblyCard/VideoShowcase: entirely untouched.
- New work: the most net-new code of the three - scroll-snap container, dot pagination, a new panel composition.
- Reduced motion: scroll-snap itself is user-driven, unaffected; entrance fades render static.
- DESIGN.md risk: medium - three same-size panels built from an icon-like element plus imagery sits close to the explicitly banned "same-size cards of icon+heading+text" pattern. Formally distinct, but a strict reading could reasonably flag it. Given this exact pattern was named as something to avoid, this is this option's real weakness.
- Scores: transformation shown 8/10, legibility 9/10, implementation risk 6/10.

### Option 3 - Single rotating hero fused directly into the build card
One card from first paint, styled to abut BuildAssemblyCard below it. A large (96-120px) element crossfades through the three identities on a timer, reusing the exact AnimatePresence mode="wait" pattern BuildStatusText already uses. Three small labeled dots let a user jump directly to an identity. The card continues gaplessly into BuildAssemblyCard's existing status text/dot row.

- BuildAssemblyCard/VideoShowcase: BuildAssemblyCard unmodified internally, wrapper visually fused with the new hero above it. VideoShowcase fully untouched.
- New work: the least of the three - mostly restyling plus one new crossfade-selector component built on an existing pattern.
- Reduced motion: auto-cycle stops; identity 1 renders statically, a tap changes it with an instant swap.
- DESIGN.md risk: lowest.
- Scores: transformation shown 7/10 (only one input is ever visible at once; "three ways in" is inferred through interaction rather than seen together), legibility 10/10, implementation risk 8/10 (lowest).

## Recommendation

Option 1. It's the only one that satisfies the hardest pair of requirements simultaneously: all three real inputs visible together at a legible size, and the transformation shown as an actual event rather than implied by layout - while reusing proven, already-built code instead of inventing new mechanism. Its cost is a small new auto-play sequencer and a margin-continuity pass between two components meant to stay isolated - both low-risk.

Honest trade-off: no option shows all three inputs at maximum legible size and a fully simultaneous, always-visible transformation at once - something has to resolve temporally (a tap, an auto-play, a swipe) rather than spatially. Option 1 resolves that the way that costs and risks the least; it doesn't escape the tension.

## An unrelated bug worth fixing regardless of which option is picked

BuildDotRow (Step 2's dot progress row) takes no reducedMotion parameter at all, and its call site doesn't pass one. The current-stage dot's pulse ring animates unconditionally regardless of the user's OS-level preference - the one place in this section's otherwise-complete reduced-motion story that doesn't actually check it.

## Also confirmed

- Component isolation is real and total - zero shared props/state between Step 1/2/3 today.
- useBuildTimeline (driving Step 2's dots and Step 3's progress bar) is two independent hook calls computing off the same rAF timestamp through a shared pure function - already frame-perfect in sync, so visually fusing Step 1 into Step 2 costs nothing in new coordination code.
- The "numbered feature list" ban doesn't literally apply today - zero numeric badges anywhere in the file. The current 3-card grid is structurally adjacent to the banned pattern, which is the real thing worth avoiding going forward.

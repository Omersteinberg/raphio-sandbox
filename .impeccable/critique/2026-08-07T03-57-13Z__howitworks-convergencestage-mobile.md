---
target: HowItWorks ConvergenceStage mobile
total_score: 6
max_score: 12
na_heuristics: 1,2,3,5,7,9,10
p0_count: 0
p1_count: 0
timestamp: 2026-08-07T03-57-13Z
slug: howitworks-convergencestage-mobile
---
**Method: dual-agent (Assessment A: design review · Assessment B: detector + static/pixel verification)**
**Fallback signal:** No browser tool in this session — Assessment B substituted exact code-derived arithmetic (verified against Tailwind's unmodified spacing/breakpoint scale) for visual/browser evidence.

## Design Health Score (scoped to ConvergenceStage mobile only)

| # | Heuristic | Score | Note |
|---|-----------|-------|------|
| 4 | Consistency and Standards | 2/4 | This section switches at Tailwind's `sm` (640px), while `useIsMobile()` elsewhere in the app uses `md` (768px) — a viewport in 640-768px gets the desktop 3-column layout while every other "mobile" code path still treats it as mobile. Separately: the authored `<br>` in the H2 is `hidden sm:block`, so mobile relies on organic wrapping while desktop gets the deliberate break |
| 6 | Recognition Rather Than Recall | 2/4 | The click-to-preview tap has no discoverability cue on touch (no hover state, `cursor-pointer` is inert on touchscreens) and, as built today, reveals no new information when tapped |
| 8 | Aesthetic and Minimalist Design | 2/4 | Confirmed by real arithmetic: each card is ~349px tall on a 375px viewport, and 209px of that (60%) is a fixed `aspect-[4/3]` illustration frame carrying a small custom graphic |
| — | All others | n/a | Out of scope - single-section mobile layout review |
| **Total** | | **6/12 (50%)** | **Acceptable, low end** |

## Calibration note

Assessment B computed the actual mobile stack: three cards at ~349px each + gaps + the node's `mt-36` margin + node + connector SVG ~= 1,457-1,718px total, roughly 2-2.5 mobile viewport-heights at ~700px visible height - not "several screens" (which implies 4+). The core claim holds completely: the three cards are never simultaneously visible in one viewport, and the top card's convergence line is a real, geometry-derived ~5x longer than the bottom card's (912px vs 182px). But "several screens" overstates severity by roughly 2x.

## Design Specificity Verdict

The convergence lines are fully measurement-driven (`getBoundingClientRect` on live card/node refs, `getTotalLength()` for the dash animation, zero hardcoded geometry) - not a generic "3 icons with a decorative squiggle" template. The risk to watch in any redesign: replacing the bespoke `Illustration` components with generic feature icons while shrinking cards - that's the one move that would make this read as templated. The device itself should survive; only its scale should change.

## Overall Impression

The diagnosis is correct in substance: a 209px illustration frame (60% of card height) forces three full-bleed cards to stack past 2+ screens, stretching the convergence lines into near-vertical dashes. None of this requires touching the SVG line-drawing architecture - it requires changing how much room the cards are given.

## What's Working

1. The line-drawing mechanism - real DOM measurement, resize-aware, `getTotalLength()`-driven - is well-built and portable to a smaller layout with zero SVG code changes.
2. Reduced-motion handling is already correct and complete - the RAF loop no-ops, lines render fully-drawn and static, flowing-overlay paths aren't even mounted, node pulse rings freeze at fixed values.
3. Touch targets have enormous headroom - current card is ~8x the 44px minimum, one single tap target, no nested interactive elements.

## Options for a mobile-specific treatment

### Option A - Compact horizontal triptych (recommended)
Keep three columns at all widths (drop the `grid-cols-1` mobile override); shrink each card hard below 640px - illustration collapses to a small fixed icon tile (~40-48px), support copy moves off the card into a shared caption line below the row driven by the existing `activeId` state. Node's `mt-36` collapses since cards and node are close again.
- Co-visibility: solved directly.
- Height: solved by the same move.
- Click-to-preview: upgraded from decorative to functional - tapping swaps the shared caption.
- SVG mechanism: completely untouched.
- Reduced motion: the existing static-all-drawn state becomes coherent instead of a liability.
- Score: convergence 9/10, height fix 9/10, implementation risk 8/10 (low).

### Option B - Accordion rows, tap-to-reveal
Each card collapses to a compact ~56-60px row by default; tapping expands it in place while collapsing any other open row.
- Co-visibility: solved in the default state.
- Height: solved more thoroughly than A - illustrations aren't shrunk, just hidden until requested.
- Click-to-preview: becomes essential.
- SVG mechanism: needs real new work - re-measurement on expand/collapse, defined behavior for other cards' lines during expansion.
- Score: convergence 8/10, height fix 9/10, implementation risk 5/10.

### Option C - Static merge glyph, drop the measured-line device on mobile
Cards shrink to the same compact row as A, but mobile renders one small, fixed, non-measured graphic above the node instead of computing per-card Bezier paths.
- Co-visibility: solved. Height: solved.
- Click-to-preview: token can still fly, but the "line drawing in" storytelling is gone.
- SVG mechanism: replaced for mobile.
- Score: convergence 6/10, height fix 9/10, implementation risk 9/10 (lowest).

## Recommendation

Option A. It fixes both named problems through one structural change, costs nothing against the well-built SVG measurement layer, and matches this codebase's own stated preference elsewhere for responsive variants over parallel mobile components. Giving the tap a real job (swapping the caption) resolves whether click-to-preview is worth keeping - it's currently decorative and close to dead weight on mobile (no discoverability cue, reduced-motion users already lose the traveling token), but Option A gives it an actual reason to exist.

An existing pattern worth naming so it isn't reinvented by accident: this file already has a working horizontal carousel (`SeeItInAction`/`CarouselCard`) - centered card with depth-staggered neighbors, arrow + dot navigation, auto-advance that stops after manual interaction, clean reduced-motion collapse to one-card-at-a-time. Not a swipe/drag pattern. No equivalent for the shared-node-convergence animation, so not a drop-in fix, but worth knowing before building something parallel to it.

## Minor Observations

- The `sm`(640)/`md`(768, `useIsMobile()`) breakpoint mismatch is low-severity but worth a deliberate decision either way.
- Whichever option is chosen, give the shared caption/label area (Option A) a fixed `min-height` so switching between cards' text never reflows the node's position.

## Questions to Consider
- Is the support copy something visitors need to read before deciding to tap, or is "tap to learn more" acceptable here - this is really the Option A vs. Option B choice in one sentence.
- Given click-to-preview is currently close to dead weight on mobile, does giving it a real job change how you feel about keeping vs. cutting it?

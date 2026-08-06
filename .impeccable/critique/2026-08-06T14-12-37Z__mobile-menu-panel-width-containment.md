---
target: mobile menu panel width/containment
total_score: 2
max_score: 4
na_heuristics: 1,2,3,5,6,7,9,10
p0_count: 0
p1_count: 0
timestamp: 2026-08-06T14-12-37Z
slug: mobile-menu-panel-width-containment
---
**Method: dual-agent (Assessment A: design review · Assessment B: detector + static/pixel verification)**
**Fallback signal:** No browser tool in this session — Assessment B substituted exact pixel arithmetic (verified against `tailwind.config.js`'s unmodified spacing scale, not assumed) for visual/browser evidence.

## Design Health Score (scoped to this containment decision only)

| # | Heuristic | Score | Note |
|---|-----------|-------|------|
| 4 | Consistency and Standards | — | See "History conflict" per option below — this is the crux of the whole decision, not a single score |
| 8 | Aesthetic and Minimalist Design | 2/4 | Confirmed mechanically: at 48px height, the CTA's 6.15–7.25:1 width:height ratio is past the point where `rounded-full` reads as a pill rather than a rounded bar |
| — | All others | n/a | Out of scope — single container-width decision, not a full surface audit |

## Design Specificity Verdict

Both assessments converged: the diagnosis (fix at the container level) is mechanically correct, not just a good instinct. Assessment A quantified why the pill reads as a banner (aspect ratio past ~6:1); Assessment B confirmed the panel has zero horizontal constraint anywhere in the code today.

## The three options

### Option 1 — Inset panel (`mx-4` on the panel itself)
- Left-align: fixed (panel reads as a bounded card).
- CTA pill: only partially fixed at the stated `mx-4` — total inset stacks to 56px/side, CTA drops to 263px @375px (5.5:1), a modest improvement, not a full fix.
- Log in: unaffected.
- History conflict: partially reopens the earlier confirmed "full-bleed panel = continuation of the header" decision.
- Risk: moderate — ambiguous corner treatment (all 4 rounded vs. only bottom), and the full-viewport scrim now shows through new side gutters under an opaque header.
- **Score: 5/10**

### Option 2 — Width-capped panel (~300–320px), anchored under the far-right toggle
- Left-align: best of the three.
- CTA pill: best of the three, and viewport-invariant (220–240px regardless of device width).
- Log in: best of the three (less empty field sharpens the contrast).
- History conflict: full reversal, not tension — this is the floating-card shape the earlier round explicitly rejected.
- Risk correction: Assessment A assumed this needs `position:absolute` + an animation rewrite (high risk). Assessment B read the actual code and found the panel is already normal block flow — a width cap + right-aligned margin achieves it without repositioning, and `translateY(-100%)` is confirmed width-agnostic. One real issue B caught: right-aligning under a far-right toggle makes the left gutter grow with viewport while the right stays pinned — balanced at 375px, visibly lopsided at 428px (84px vs 24px) unless centered instead, which undercuts "anchored to the toggle."
- **Score: 6/10** — real fix, cheaper to build than first assumed, but a full reversal of settled panel identity.

### Option 3 — Full-width panel kept, inner content column added
- Left-align: fragile if under-specified (a column at "somewhat less than today's padding" barely moves the margin) — only converges on ~280–300px does it register as intentional.
- CTA pill: self-limiting — push the column narrow enough to fix the ratio and the still-full-bleed flanking background starts reading as dead space. At a disciplined 300px cap: CTA = 220px (4.6:1), a real fix.
- Log in: unaffected.
- History conflict: none — panel background never changes size/shape.
- Risk: lowest by a clear margin — no repositioning, animation/scrim relationship untouched, and it sidesteps the radius question entirely (panel shape unchanged).
- **Score: 6/10 as literally described, higher ceiling if specified as an exact number, not "narrower."**

## Recommendation

A disciplined Option 3: one shared inner column, capped at ~300px, left-aligned (not centered), wrapping both the nav-link zone and the ask zone. A 300px column gives a 220px CTA (4.6:1) while adding a real 75–128px of visible margin at 375–428px, without touching the panel background — so the earlier "continuation of the header" decision is never reopened, the slide animation and scrim relationship need zero changes, and there's no new radius decision to make. Left-aligned rather than centered because it mirrors the header's own asymmetric composition above it (logo flush left, toggle flush right) rather than introducing a centered, more modal-like composition underneath it. The active-wash should apply to a row spanning this same 300px column, not the full panel width, or the highlight reads too wide for a one-word label.

Option 2 is the strongest pure fix for the two symptoms and cheaper to build than it first looked, but it's a full reversal of a decision made after multiple rounds — worth it only if panel identity itself is being reconsidered, not just wanting a narrower pill. Option 1 pays part of Option 2's reversal cost without fully achieving either option's fix.

## Fold-in changes (apply regardless of which option is picked)

- **Active-wash on nav link rows:** cleanly implementable with zero conflict — these three buttons are the one place in this file with no competing JS-driven inline-style handler. Plain Tailwind `active:bg-surface-alt active:rounded-lg` works directly (`--surface-alt: #F0EAE5` / Clay Wash is already a defined token). iOS Safari's `:active`-requires-a-click-handler quirk is already satisfied since these buttons have `onClick`.
- **CTA↔Log-in gap:** currently `gap-3` (12px). Reduced options: `gap-2` (8px) or `gap-1` (4px), both standard scale values.

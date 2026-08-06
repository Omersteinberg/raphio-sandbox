---
target: mobile navigation header (LandingPage.jsx)
total_score: 17
max_score: 24
na_heuristics: 5,7,9,10
p0_count: 0
p1_count: 2
timestamp: 2026-08-06T10-22-01Z
slug: src-pages-landingpage-jsx-mobile-nav-header
---
**Method: dual-agent (Assessment A: design review · Assessment B: detector + static verification)**
**Fallback signal:** No browser automation tool is exposed in this session, so live-render/screenshot evidence was skipped per protocol. Assessment B substituted careful static code verification (DOM nesting, z-index math, exact class values) for it — flagged wherever that lower-confidence path matters.

## Design Health Score (scoped to the mobile nav header/menu/scrim only)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | Scrim exists and fades correctly, but the header row (Log in/Try it free) stays fully opaque and interactive while it's "on" — the one surface the user is looking at doesn't change |
| 2 | Match System / Real World | 4/4 | Hamburger→X icon-swap is a universal, correctly-implemented convention |
| 3 | User Control and Freedom | 4/4 | Escape key, tap-scrim-to-dismiss, tap-link-to-close all wired correctly |
| 4 | Consistency and Standards | 2/4 | "Try it free" is `rounded-full` (the pill register DESIGN.md reserves for the one highest-emphasis CTA) but filled transparent/outline, not the brand gradient — shape and fill disagree |
| 5 | Error Prevention | n/a | No destructive/error-prone actions in a nav toggle |
| 6 | Recognition Rather Than Recall | 3/4 | Icons are standard and labeled via `aria-label`, but no visible text label accompanies the hamburger/X |
| 7 | Flexibility and Efficiency | n/a | Not applicable to a Persuade-surface nav control |
| 8 | Aesthetic and Minimalist Design | 2/4 | Closed header is over budget at 375px in the current A1 layout |
| 9 | Error Recovery | n/a | No error states in this component |
| 10 | Help and Documentation | n/a | Not applicable to a Persuade-surface nav control |
| **Total** | | **17/24** | **Good (71%), low end** |

## Design Specificity Verdict

**LLM assessment:** The compositional skeleton (logo-left, hamburger, right-aligned CTA, full-bleed slide-down panel, scrim, icon-swap toggle) reads close to interchangeable Stripe/Linear/Vercel-style SaaS nav — but DESIGN.md itself scopes chrome this way: "the same nav, two states, not two components," with expressive license reserved for content, not the header. So genericness here is correct scope, not drift. Where it does show authorship: the scrim and panel shadow both correctly use the Warm Char token (`rgb(var(--ink-warm-rgb)/…)`) rather than defaulting to neutral/pure black — better adherence to the Warm Shadow Rule than the codebase's own acknowledged Radix Dialog gap.

**Deterministic scan:** `detect.mjs --json src/pages/LandingPage.jsx` exited 2 with 33 findings, all `layout-transition`/`design-system-color`/`design-system-font-size` warnings — none inside the nav/menu/scrim block (1704–1877). Nearest hits: line 1612 and line 1908, both outside scope. The detector has no rule for scrim presence, z-index, touch targets, or full-bleed layout, so this clean result isn't evidence the nav is correct — it just means no token-drift was flagged in range.

**Visual overlays:** Not available — no browser tool in this session, so no `[Human]`-tab overlay exists. This is a static-evidence critique.

## Overall Impression

The scrim in question already exists in the uncommitted working tree — Assessment B confirmed it's genuinely there, structurally correct (full-bleed panel, correct z-index math, warm-tinted per the Warm Shadow Rule), and entirely new/unstaged code (343 insertions, all-additions in that region). It has almost certainly never been seen live in a browser. So problem #1 isn't "missing," it's "written but unverified, and even once verified, too subtle to register" — the header row itself doesn't join the dimmed state, so the part of the screen most likely being looked at right after tapping the hamburger doesn't visibly change. Problems #2 and #3 are real and current: the X is spatially sandwiched with no grouping cue, and the header-bar CTA pair crowds a 327px budget.

## What's Working

1. Toggle mechanics are genuinely solid — Escape-to-close, scroll-lock that restores rather than hardcodes the prior `overflow` value, correct `aria-expanded`/`aria-controls`/`aria-label`, true unmount (not `display:none`) via `AnimatePresence`.
2. Token discipline — scrim and panel shadow both correctly reach for `--ink-warm-rgb` rather than a neutral/pure-black shadow, actively avoiding the one drift pattern DESIGN.md calls out as a known gap elsewhere in the app.
3. Full-bleed panel is correctly built, not faked — traced via DOM nesting, the panel is a sibling of the constrained inner row, so it genuinely spans the viewport rather than inheriting `max-w-6xl`/`px-6`.

## Priority Issues

**[P1] Closed header is over budget at 375px in Option A1 (current)**
- Why it matters: logo + hamburger + Log in + Try it free ≈ 340px+ of required width against a 327px usable budget (375px − 2×24px padding) — before accounting for longer strings or larger system fonts. Four separately-tappable elements compete in one 56px row, the direct cause of problem #3.
- Fix: Adopt Option A3 — keep "Try it free" (pill) in the header, move "Log in" into the menu panel only. Closed-header width drops to ≈260px, comfortably inside budget, and it's the only option that makes DESIGN.md's "never more than one pill CTA competing for attention in the same viewport" literally true by construction rather than coincidentally true. Avoids A2's cost of hiding the one conversion action behind an extra tap on the site's single expressive, persuasive surface.
- Suggested command: $impeccable layout

**[P1] "Try it free" pill's shape and fill disagree**
- Why it matters: DESIGN.md's Buttons section reserves the full-pill shape for the CTA register, which should carry `linear-gradient(135deg,#C1440E,#E8603C)` and a lifted warm shadow. This button is pill-shaped but filled transparent/outline (1.5px border) — reads as secondary despite occupying the highest-emphasis shape. Independent of the A/B/C decisions, but worth fixing in the same pass since A3 makes this the only CTA-weight element in the closed header.
- Suggested command: $impeccable polish

**[P2] Header row doesn't participate in the "menu open" mode**
- Why it matters: This is the real explanation for "the scrim reads as missing" even though it exists. The scrim (z-40) sits correctly under the header (z-50) by design, so Log in and Try it free stay fully opaque and interactive, unchanged, right next to the toggle just tapped. A distracted glance won't register the mode change, and in A1 there's a real mis-tap risk (two live nav surfaces stacked: the 3-item panel plus Log in/Try it free) undercutting the "exclusive mode" feeling the scrim exists to create.
- Fix: Once A3 removes Log in from this ambiguity, also consider having the header adopt its `scrolled`-style opaque treatment whenever `mobileMenuOpen` is true (even pre-scroll), or add a hairline separator, so the header visibly joins the dimmed surface instead of floating untouched above it.
- Suggested command: $impeccable polish

**[P2] X sits with no grouping cue separating it from the right-hand cluster**
- Why it matters: This is problem #2 as stated. The icon-swap-in-place pattern (B1) itself isn't the issue — it's a correct, thumb-friendly, fixed-target convention, and matches this codebase's own "same nav, two states" philosophy applied to its toggle. The issue is that nothing visually binds "logo + hamburger/X" as one cluster distinct from "Log in + Try it free" — `gap-2 sm:gap-8` collapses to 8px on mobile, so all four elements read as one undifferentiated row.
- Fix: Keep B1 (do not switch to B2 — moving the X to the open panel's far-right would force a thumb-relocation between open and close, which is worse for a one-handed user). Once A3 clears the right-hand crowding, add explicit spacing/grouping so the toggle reads as spatially owned by the nav.
- Suggested command: $impeccable layout

**[P3] Scrim alpha is plausible but mild**
- Composited over the page's `#F5F0EB` background, 30%-alpha Warm Char lands around `rgb(181,175,171)` — a real but soft tonal shift, on the subtle end for a modal-style scrim (many conventions use 40–60%). Not a defect per se, but worth a look once the header-participation fix lands, since the two compound.
- Suggested command: $impeccable polish

## Persona Red Flags

**Casey (distracted, one-handed mobile user):** Open and close mechanics are good — same top-left target both directions (B1), tap-anywhere-on-scrim-to-dismiss is forgiving. The weak point is exactly the P2 above: because the header row doesn't change when the menu opens, and Log in/Try it free sit immediately next to the toggle just pressed, a distracted glance risks a mis-tap on one of those buttons instead of registering "I'm now in the menu."

**Jordan (first-timer):** No red flags on comprehension — hamburger/X is a well-learned convention and the menu items are text-labeled, not icon-only. Minor: the toggle itself has no visible text label (only `aria-label`), standard practice and not a real barrier here.

## Minor Observations

- Touch targets are correctly built: hamburger/X is exactly 44×44px (inline `style`), Log in and Try it free both use `min-h-[44px]` — no violations found in source. Not confirmed against a rendered DOM; flagged as the one area where a global CSS override could theoretically change this, though none was found in `index.css`.
- Scroll-linked header text color (`scrolled ? C.dark : 'rgba(255,250,247,0.92)'`) is a pre-existing risk this task sharpens: opening the menu unscrolled, over the hero video, could hit low contrast depending on the video frame at that instant. Not verifiable without a browser.

## Questions to Consider

- Does "Log in" actually need equal billing with "Try it free" on a pre-launch product where most 375px visitors are new, not returning? A3 treats it as lower-intent — is that read right for your traffic?
- If the header adopts an opaque `scrolled`-style treatment whenever the menu is open, should that same treatment persist for a beat after close (so the transition back to transparent doesn't feel abrupt), or snap back instantly?

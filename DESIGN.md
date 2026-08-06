---
name: Raphio
description: A warm terracotta editorial system for a longer-form AI video tool, restrained where it is a workspace, expressive only at the marketing threshold.
colors:
  kiln-terracotta: "#C1440E"
  warm-clay: "#E8603C"
  burnt-umber: "#5C1000"
  ink-plum: "#2D2235"
  warm-char: "#1C1917"
  muted-plum-grey: "#6B5E7B"
  warm-chalk: "#F5F0EB"
  pale-chalk: "#FDF6F0"
  warm-paper: "#FFFAF7"
  clay-wash: "#F0EAE5"
  clay-mist: "#EFDCD2"
  brand-red: "#B91C1C"
  system-blue: "#3C83F6"
  system-green: "#0D9669"
  system-amber: "#FB923C"
typography:
  display:
    fontFamily: "'Bricolage Grotesque', sans-serif"
    fontWeight: 750
    letterSpacing: "-0.01em to -0.02em"
    lineHeight: 1.08
  body:
    fontFamily: "Figtree, sans-serif"
    fontWeight: 400
    fontSize: "16px"
    lineHeight: 1.5
  label:
    fontFamily: "Figtree, sans-serif"
    fontWeight: 700
    fontSize: "11px"
    letterSpacing: "0.1em"
rounded:
  functional: "6px"
  functional-lg: "8px"
  card: "12px"
  panel: "16px"
  feature: "24px"
  pill: "9999px"
spacing:
  section-sm: "24px"
  section-md: "48px"
  section-lg: "96px"
  section-xl: "128px"
components:
  button-primary:
    backgroundColor: "{colors.kiln-terracotta}"
    textColor: "#FFFFFF"
    rounded: "{rounded.functional}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.burnt-umber}"
  button-cta:
    backgroundColor: "linear-gradient(135deg, {colors.kiln-terracotta}, {colors.warm-clay})"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "16px 40px"
  card:
    backgroundColor: "{colors.warm-paper}"
    textColor: "{colors.ink-plum}"
    rounded: "{rounded.card}"
    padding: "24px"
---

# Design System: Raphio

## Overview

**Creative North Star: "The Editor's Desk"**

Raphio is a workspace before it is a pitch. The product's job is to give someone who cares about narrative real control over a longer-form AI video, not to dazzle them with the fact that AI made it - so the system defaults to restraint: a warm neutral surface, a single accent color, plain functional type, and shadows that only appear when something genuinely deserves to float. The one place the system allows itself to perform is the landing page, where a heavier display face and lifted, gradient-filled CTAs mark the threshold between "considering the product" and "using the product." Everywhere past that threshold - the wizard, the timeline editor, settings, admin - the desk stays a desk: flat, warm, and unshowy.

The palette itself is deliberately narrow and earthy: terracotta as the only saturated color, a warm off-black rather than a true black, a plum-tinted ink instead of a cool gray, and a family of warm off-whites for surfaces. This is a **fixed brand constraint** (confirmed by the user); it is not to be treated as a gap or proposed for replacement in future design work.

Confirmed anti-references - the system should never read as any of these:
- A generic AI-slop startup (glossy purple gradients, stock "innovation" imagery, an interchangeable-SaaS feel).
- A cheap or bargain consumer app (heavy discount badges, coupon-style deal framing). Product positioning is trending premium/professional; the shipped marketing copy hasn't fully caught up yet, and new design work should not reinforce the bargain framing further (see PRODUCT.md).
- A cold enterprise tool (sterile, corporate, dashboard-cold). Warmth and craft persist even as the product becomes more premium.

**Key Characteristics:**
- One saturated accent (terracotta) against warm, low-saturation neutrals.
- Flat by default; a lifted, warm-tinted shadow is reserved for genuine emphasis.
- A generous, expanding radius scale: tighter for dense functional UI, rounder as a surface becomes more marketing-facing, full-pill for the single highest-emphasis action.
- Two deliberate button registers - a plain functional button for in-flow actions, and a pill-shaped gradient CTA reserved for the one primary ask per screen.
- Figtree carries the entire in-product experience; Bricolage Grotesque is reserved for landing-page headlines only.

## Colors

The palette reads as sun-warmed clay and paper: a single fired-terracotta accent against a family of warm off-whites and a plum-black ink, with almost no cool color anywhere in the system.

### Primary
- **Kiln Terracotta** (`#C1440E`): the one saturated color in the system. Primary buttons, links, active/focus states, icon accents, brand gradient start. Used sparingly - it marks "the thing to act on," not decoration.
- **Warm Clay** (`#E8603C`): the gradient partner to Kiln Terracotta (`linear-gradient(135deg, #C1440E, #E8603C)` - the `--gradient-brand` token). Never used alone as a solid fill; it exists to be the light end of the brand gradient.
- **Burnt Umber** (`#5C1000`): hover/pressed state for terracotta-filled elements (`bg-terra hover:bg-terra-dark`), and occasionally a deeper accent for small text-on-light details.

### Neutral
- **Ink Plum** (`#2D2235`): primary text color (`--foreground`). A warm, faintly violet near-black rather than a true gray - the plum cast is what keeps body text from reading as generic UI copy.
- **Warm Char** (`#1C1917`): a separate, darker near-black used only for large dark surfaces - the landing page's hero, final CTA, and footer bands, and the base of the timeline editor's scoped dark theme. Distinct from Ink Plum; do not substitute one for the other.
- **Muted Plum-Grey** (`#6B5E7B`): secondary/supporting text (`--muted-foreground`). Sits right at the edge of AA contrast on Warm Chalk for small text - hold the line here rather than lightening it further.
- **Warm Chalk** (`#F5F0EB`): the default page background (`--background`).
- **Pale Chalk** (`#FDF6F0`): a lighter background wash, used in soft gradient transitions (e.g. the pricing section's background wash) rather than as a flat fill.
- **Warm Paper** (`#FFFAF7`): card and elevated-surface background (`--card`), a near-white with the same warm cast as the rest of the palette.
- **Clay Wash** (`#F0EAE5`): secondary/muted surface fill - secondary buttons, badges, subtle section backgrounds.
- **Clay Mist** (`#EFDCD2`): the default border and input-border color (`--border`, `--input`) - a warm terracotta-tinted hairline, never a cool gray.

### Functional (status only, not brand-expressive)
- **Brand Red** (`#B91C1C`): destructive actions only (`--destructive`).
- **System Blue** (`#3C83F6`), **System Green** (`#0D9669`), **System Amber** (`#FB923C`): informational/success/warning status only. Notably, toast notifications override all of these back to Kiln Terracotta (`--toastify-color-*`) so the app never flashes green or red in a toast - status is communicated by icon, not by breaking the one-accent rule.

### Named Rules
**The One Warm Voice Rule.** Kiln Terracotta is the only saturated, attention-getting color anywhere in the system. Every other hue - system blue/green/amber, brand red - is reserved strictly for functional status indicators and is never used decoratively or as a section accent.

## Typography

**Display Font:** Bricolage Grotesque (weight 750, optical-size variable), with a sans-serif fallback.
**Body/UI Font:** Figtree (weights 400-800), with a sans-serif fallback.

**Character:** A restrained grotesque sans carries every working screen; a heavier, wider display face is promoted in only at the marketing threshold. The pairing is not decorative variety for its own sake - it marks a real boundary between "the product" and "the pitch for the product."

*Note: Montserrat is loaded and registered in `tailwind.config.js` (`font-montserrat`) but has zero live usages anywhere in `src/`. Treat it as unused legacy configuration, not an active part of the type system - don't reach for it in new work.*

### Hierarchy
- **Display** (weight 750, `clamp(34px,4.4vw,72px)` depending on level, line-height 1.08-1.15): Bricolage Grotesque. Landing-page section headlines and the hero headline only.
- **Headline** (weight 700-800, 24-32px): Figtree. In-product section/page titles, dialog titles.
- **Title** (weight 700, 16-18px): Figtree. Card titles, component headers.
- **Body** (weight 400-500, 14-16px, line-height 1.5): Figtree. Paragraph copy, descriptions.
- **Label** (weight 700, 11-13px, letter-spacing ~0.1em, uppercase): Figtree. Eyebrows, badges, pricing-tier tags, status text.

### Named Rules
**The Desk vs. Pitch Rule.** Figtree carries every in-product surface - the creation wizard, the timeline editor, settings, admin. Bricolage Grotesque is reserved for landing-page headlines only. If a screen lives inside the authenticated product, it does not get the display face.

## Layout

Marketing sections (landing page) use a generous `max-w-5xl`/`max-w-6xl` centered container with large vertical rhythm (`py-24` to `py-32` between sections). In-product surfaces use denser, more conventional app spacing (card padding `p-6`, standard form/toolbar density). Breakpoints follow Tailwind defaults (`sm` 640, `md` 768, `lg` 1024); a few surfaces (e.g. the script/timeline two-pane editors) intentionally break at `lg` 1023 instead of `md`, where their layout actually stacks. Mobile-first throughout; touch targets are held to a 44px minimum as a deliberate constraint, not an incidental Tailwind default.

## Elevation & Depth

**Flat by default, lifted on emphasis** (confirmed). Most surfaces - cards, inputs, the functional button register - sit flat or carry only `shadow-sm`. A visibly lifted, warm-tinted shadow is reserved for things that are genuinely floating (modals) or are the one call-to-action on a view (hero/CTA buttons, the "Most Popular" pricing tier, hovered carousel items). Depth is used to mark emphasis, not to decorate every surface uniformly.

### Shadow Vocabulary
- **Resting** (`shadow-sm`, shadcn default): Cards, inputs, the flat functional button register. The baseline for everything not being emphasized.
- **Emphasis, warm** (e.g. `0 4px 16px rgba(193,68,14,0.30)`, deepening on hover to `0 8px 40px rgba(193,68,14,0.55)`): pill-shaped CTA buttons. Always tinted with the terracotta RGB triple, never neutral.
- **Emphasis, ink** (e.g. `0 24px 60px rgba(28,25,23,0.28)`): large floating marketing surfaces - the centered carousel card, the video showcase frame. Tinted toward Warm Char rather than terracotta when the surface itself is large and dark-toned.

### Named Rules
**The Warm Shadow Rule.** Every intentional shadow in the system is tinted - toward terracotta for emphasis on light/brand surfaces, toward Warm Char for large dark surfaces - never a neutral or pure-black shadow. The one known exception is the Radix Dialog overlay scrim, which still uses a plain `bg-black/50` default; treat that as an unaddressed gap, not a second valid pattern, if the overlay is touched again.

## Shapes

The radius scale widens with a surface's emphasis rather than holding one fixed value. Dense, functional UI (buttons, inputs, dialogs) stays tight; cards open up slightly; marketing/feature surfaces get noticeably rounder; and the single highest-emphasis action per screen is always a full pill.

- **Functional** (6-8px): shadcn buttons, inputs, dialog corners.
- **Card** (12px): the base `Card` primitive used throughout the in-product surfaces.
- **Panel** (16px): marketing feature cards (e.g. the "start with a prompt/photo/reference" cards).
- **Feature** (24px): pricing cards, large marketing panels, the video showcase frame.
- **Pill** (full radius): every primary CTA button, badges, avatar/icon chips.

### Named Rules
**The Rounder-With-Emphasis Rule.** A surface's corner radius is a legible signal of its role: tight corners read as "tool," generous corners read as "feature," and a full pill always means "the one thing to click."

## Components

### Buttons
Two deliberate registers, confirmed intentional rather than an inconsistency to resolve:
- **Functional** (shadcn `Button`, `variant="default"`): `rounded-md` (6px), flat `Kiln Terracotta` fill, white text, `hover:bg-burnt-umber`. Used for in-flow actions - forms, toolbars, wizard navigation, anywhere more than one action competes for attention on the same view.
- **CTA / hero**: full pill (`rounded-full`), `linear-gradient(135deg, Kiln Terracotta, Warm Clay)` fill, white text, warm lifted shadow that deepens and lifts (`translateY(-2px) scale(1.02)`) on hover. Reserved for the single highest-emphasis action on a view - hero CTAs, pricing CTAs, final-section CTAs. Never more than one pill CTA competing for attention in the same viewport.
- **Outline/ghost**: transparent or `warm-paper` fill, `Kiln Terracotta` text/border, filling to the brand gradient on hover. Used for secondary actions sitting next to a CTA (e.g. nav "Log in" next to "Get started").

### Cards / Containers
- **Corner style:** 12px (`rounded-xl`) for the base in-product `Card` primitive; 16-24px for marketing-facing cards (see Shapes).
- **Background:** Warm Paper (`#FFFAF7`), occasionally Clay Wash for a secondary/muted card.
- **Border:** 1px Clay Mist (`#EFDCD2`) on the base primitive; marketing cards often drop the border in favor of the lifted shadow instead.
- **Shadow strategy:** resting (`shadow-sm`) by default; only the single emphasized item in a card row (e.g. "Most Popular" pricing tier) gets the lifted warm shadow and a 2px terracotta border.
- **Internal padding:** 24px (`p-6`) standard.

### Inputs / Fields
- **Style:** Warm Paper background, Clay Mist border (1px), `rounded-md` (6px).
- **Focus:** border/ring shifts to Kiln Terracotta (`--ring`), no glow or elevation change - focus is communicated by color, not depth.
- **Disabled:** reduced opacity, cursor change; standard shadcn disabled treatment.

### Navigation
The landing-page header is transparent-over-video at the top of the page (white text with a soft text-shadow for legibility over footage) and crossfades to an opaque Warm Chalk bar with Ink Plum text once the page scrolls - the same nav, two states, not two components. Link hover is a currentColor underline that grows in from 0% to 100% width rather than a color-only change. In-product navigation (sidebar/toolbar surfaces) stays inside the flat functional register at all times - no transparent/scroll-state treatment outside the marketing header.

### Scoped Dark Theme (signature pattern)
The timeline editor opts a container into a fully dark, warm-toned theme via a single `.editor-dark` class (`src/index.css`), remapping the same shadcn CSS variables (`--background`, `--card`, `--muted`, etc.) to Warm Char-based dark values while deliberately leaving `--primary`/`--ring` pointed at Kiln Terracotta. This is the one place in the product with a real dark surface, and it stays on-brand by keeping the accent color identical to the light system - only the neutrals invert.

## Do's and Don'ts

### Do:
- **Do** keep Kiln Terracotta as the only saturated, decorative color anywhere in the system; every other hue is functional-only (see The One Warm Voice Rule).
- **Do** reserve Bricolage Grotesque strictly for landing-page headlines; everything inside the authenticated product stays in Figtree (The Desk vs. Pitch Rule).
- **Do** tint every intentional shadow toward terracotta or Warm Char; a neutral or pure-black shadow does not belong in this system (The Warm Shadow Rule).
- **Do** let a surface's corner radius signal its role - tighter for tools, rounder for features, full-pill for the one primary action (The Rounder-With-Emphasis Rule).
- **Do** keep the two button registers distinct: flat functional buttons for in-flow actions, pill-gradient CTA for the one highest-emphasis action per screen. Don't use a pill button for a secondary action, and don't use the flat register for a page's primary ask.

### Don't:
- **Don't** introduce glossy purple/blue AI-gradient treatments, stock "innovation" imagery, or anything that would make Raphio look like an interchangeable AI-SaaS template - a confirmed anti-reference.
- **Don't** lean into bargain/discount visual language (heavy "Save X%" badges, coupon framing) in new design work - positioning is trending premium/professional even though the currently-shipped pricing copy hasn't fully caught up (see PRODUCT.md; this is a known, separately-tracked gap, not something to compound).
- **Don't** let the system read as cold or corporate - warmth (the plum-tinted ink, the terracotta accent, the warm off-whites) should persist even as the product becomes more premium.
- **Don't** propose replacing or "fixing" the terracotta/cream/near-black palette. It is a fixed brand constraint for now (confirmed by the user); it is open to revisiting later, but only if the user explicitly reopens that decision.
- **Don't** add a second pure-black or neutral-gray shadow anywhere in the system; the existing Dialog overlay's plain `bg-black/50` is a known, unaddressed exception, not a pattern to extend.

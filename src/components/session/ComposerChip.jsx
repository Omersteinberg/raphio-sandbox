import { createContext, useCallback, useContext, useEffect, useRef, useState, Children } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// Below `sm` (640px) - matches the breakpoint every other responsive rule in
// this file already keys off, not the app-wide 768px `useIsMobile()` (that
// would open a 640-767px zone where classes say "desktop" but this said
// "mobile"). Own constant, not `REDUCED_MOTION_QUERY`-style inline string,
// since it's now read in two places (the panel branch below).
const MOBILE_SHEET_QUERY = "(max-width: 639px)";

/**
 * Shared composer control: a compact chip that either opens an anchored
 * popover (Length, Ratio, Brand kit, Photos, ...) or fires directly
 * (Voice - opens its own modal; Background Music - toggles in place).
 *
 * One row = one open popover at a time, coordinated through this context
 * rather than local state, because two floating panels open together is
 * the thing that pushed the CTA off a phone screen in the pre-chip layout.
 */
const ChipRowContext = createContext(null);

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * `scroll` (opt-in, default false): below `sm` (640px), renders as a single
 * horizontal-scrolling nowrap row instead of a wrapping one. NOT currently
 * used by any caller - PromptStep's Length/Ratio/Voice/Music row used to
 * scroll on mobile, but once each chip dropped its text label there (icon +
 * value only, see ComposerChip's render) all four fit one line without it,
 * so that row switched to a plain wrapping row via `gapClassName` instead
 * (below). Left implemented and reachable, not deleted, in case some future
 * row genuinely needs to scroll instead of wrap - see the IMPORTANT note
 * below before reaching for it again.
 *
 * `gapClassName` (default `"gap-3"`, matching every existing caller
 * byte-for-byte) lets one caller override just the row's gap responsively
 * (e.g. `"gap-1 sm:gap-3"`) without a second `gap-*` class fighting the
 * default in the compiled stylesheet - Tailwind doesn't guarantee which of
 * two same-specificity `gap-*` classes wins by JSX order, so the row
 * template only ever emits one.
 *
 * IMPORTANT, learned the hard way (two failed attempts before the current
 * design): the automatic content-based minimum size that normally stops a
 * flex item shrinking below its text does NOT apply inside a scrolling flex
 * container. Per the flexbox spec, a flex container with `overflow` other
 * than `visible` on an axis (`scroll` mode is `overflow-x-auto`) gives its
 * children a `min-width:auto` of effectively 0 on that axis instead of a
 * content-based floor - so `flex-1` (grow AND shrink) there once silently
 * let chips shrink BELOW their own text, truncating "Music" to "MUSI".
 * Growing to fill and scrolling-without-squeezing are mutually exclusive in
 * a scroll container; you cannot have both from flex-grow/shrink alone. Any
 * future `scroll` row needs the same `shrink-0` + explicit per-chip
 * `min-w-[Npx]` treatment PromptStep's row used to lean on, not bare
 * `flex-1`.
 */
export function ComposerChipRow({ children, className = "", scroll = false, gapClassName = "gap-3" }) {
  const [openId, setOpenId] = useState(null);
  // An open popover is `absolute`, so it adds nothing to page height and the
  // part of it below the fold cannot be scrolled to. The open chip measures
  // how far past the scrollable bottom it reaches and reports that here, and
  // the row carries a spacer of exactly that size for as long as it is open.
  const [panelSpace, setPanelSpace] = useState(0);
  const rowRef = useRef(null);
  const reduced = useMediaQuery(REDUCED_MOTION_QUERY);

  const reportPanelSpace = useCallback((px) => setPanelSpace(px > 0 ? px : 0), []);
  useEffect(() => { if (!openId) setPanelSpace(0); }, [openId]);

  useEffect(() => {
    if (!openId) return undefined;
    const onPointerDown = (e) => {
      if (rowRef.current && !rowRef.current.contains(e.target)) setOpenId(null);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpenId(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openId]);

  const rowClassName = scroll
    // scrollbar-hidden (src/index.css): keeps the native scrollbar off without
    // hiding the row's own overflow-driven scroll behavior. snap-proximity
    // (not mandatory) so a short drag doesn't feel like it's fighting the
    // user - the partially-cut-off trailing chip is the scroll affordance.
    // Every scroll-only utility gets an `sm:` counterpart that puts it back
    // to the plain wrapping row's default (wrap / visible / no snap) - the
    // mobile-only fix from a no-scroll no-wrap footgun regressing desktop.
    ? `flex flex-nowrap sm:flex-wrap items-center ${gapClassName} overflow-x-auto sm:overflow-visible snap-x sm:snap-none snap-proximity scrollbar-hidden ${className}`
    : `flex flex-wrap items-center ${gapClassName} ${className}`;

  return (
    <ChipRowContext.Provider value={{ openId, setOpenId, reportPanelSpace }}>
      <div
        ref={rowRef}
        className={rowClassName}
        style={scroll ? { WebkitOverflowScrolling: "touch" } : undefined}
      >
        {Children.map(children, (child, i) => {
          if (!child) return child;
          // A chip's own `grow` prop (default false on ComposerChip, and
          // ImproveButton has no such prop at all) decides whether ITS
          // wrapper becomes a flex item that expands - this is step 1 of the
          // width chain; see ComposerChip's own comment for steps 2 and 3.
          // Deliberately NOT `min-w-0`: an earlier version added it to let
          // the wrapper shrink freely, but that overrides flex's default
          // `min-width: auto` (= "don't shrink below your content"), which
          // is exactly the thing that makes `flex-wrap` trigger once chips
          // no longer fit a row. Verified with a screenshot at 420px: with
          // `min-w-0`, four growing chips + Improve refused to wrap and
          // instead squeezed until the label/value text overlapped the
          // icons. Without it, the row wraps cleanly instead.
          //
          // `grow` has exactly one real consumer today (PromptStep's
          // Length/Ratio/Voice/Music, all four `grow`-tagged, all in a
          // wrapping - not scroll - row), so its wrapper is unconditional
          // `flex-1` at every width: with a 0% flex-basis, equal grow
          // factors split the row's width equally regardless of each
          // chip's own content length - confirmed identical at desktop
          // (was already `sm:flex-1`) and now safe below `sm` too, since
          // the row stopped being a scroll container (see this function's
          // own comment on why that distinction mattered). A `scroll`-mode
          // child instead keeps the dormant `shrink-0`+`sm:shrink`+
          // `sm:flex-1` combo described there, in case a future row needs
          // to scroll.
          const grow = !!child.props?.grow;
          const wrapperClass = scroll
            ? ["shrink-0", "snap-start", "sm:shrink", grow ? "sm:flex-1" : undefined].filter(Boolean).join(" ")
            : (grow ? "flex-1" : undefined);
          return (
            <motion.div
              className={wrapperClass || undefined}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: reduced ? 0 : i * 0.035, ease: [0.16, 1, 0.3, 1] }}
            >
              {child}
            </motion.div>
          );
        })}

        {/* `w-full` makes it a wrapped flex item on its own line, so it only
            ever adds height. Left out of a `scroll` row, which is nowrap: there
            it would sit beside the chips and add width instead. */}
        {!scroll && panelSpace > 0 && (
          <div aria-hidden className="w-full shrink-0" style={{ height: panelSpace }} />
        )}
      </div>
    </ChipRowContext.Provider>
  );
}

/** Nearest ancestor that actually scrolls vertically, else the page itself. */
function scrollParentOf(node) {
  let el = node.parentElement;
  while (el) {
    const { overflowY } = getComputedStyle(el);
    if (/(auto|scroll|overlay)/.test(overflowY) && el.scrollHeight > el.clientHeight) return el;
    el = el.parentElement;
  }
  return document.scrollingElement || document.documentElement;
}

/** How far past the reachable bottom of its scroll container an element sits. */
function overflowBelow(el, pad = 16) {
  const scroller = scrollParentOf(el);
  const isPage = scroller === document.scrollingElement || scroller === document.documentElement;
  const top = isPage ? 0 : scroller.getBoundingClientRect().top;
  const bottom = el.getBoundingClientRect().bottom - top + scroller.scrollTop;
  return Math.max(0, Math.round(bottom + pad - scroller.scrollHeight));
}

// Four states, deliberately pulled apart rather than sharing one tint:
// modified reads as a flat fill (this has a value set), open reads as an
// outline-plus-lift (this is floating right now) - the shadow on `open`
// does most of that lifting, so the two never collapse into each other.
const TONE = {
  default: "border-border/70 bg-white text-[#6B5E7B] hover:border-[var(--terra)]/40 hover:text-[var(--terra)]",
  modified: "border-[var(--terra)]/35 bg-[var(--terra)]/10 text-[var(--terra)]",
  open: "border-[var(--terra)]/70 bg-[var(--terra)]/8 text-[var(--terra)]",
  disabled: "border-border/40 bg-white text-[#75695F]",
};

// The "outlined chips" treatment (design review Variation 3): a terra border
// at every state instead of TONE's neutral-until-hover one, and no
// background fill ever - the chip reads as a line, not a card. Opt-in via
// `variant`, so existing callers (Brand Intro) are unaffected. Border opacity
// was raised a second time (default /35 -> /50, hover /40 -> /65) after a
// pixel-diff against the reference showed the original read as too faint to
// register as an outline at a glance - modified/open (already /70 and full)
// were already strong enough and are untouched.
//
// Literal `#C1440E` here, not `var(--terra)`: Tailwind's opacity modifier
// (the `/50`, `/65`, `/70`) can only be resolved against a color it can see
// at build time - it cannot inject an alpha channel into an opaque `var()`
// reference. `border-[var(--terra)]/50` silently compiled to NO rule at all
// (confirmed by inspecting the built CSS), so the border fell through to
// Tailwind Preflight's default `border-color: #e5e7eb` - a pale gray, not
// terra. That bug predates this file's mobile-compact pass entirely; it just
// wasn't very noticeable while these chips were 2-3x wider with two lines of
// text giving the box its own visual structure. Once they shrank to
// icon+value-only, the missing border became the chip's only real edge, and
// a wrong pale-gray one reads as "no border" - a plain filled pill, not a
// bordered outline. `text-[var(--terra)]` alone (no modifier) was never
// affected - only the `/NN`-suffixed ones needed the literal hex.
const TONE_OUTLINED = {
  default: "border-[#C1440E]/50 bg-transparent text-[#6B5E7B] hover:border-[#C1440E]/65 hover:text-[#C1440E]",
  modified: "border-[#C1440E]/70 bg-transparent text-[#C1440E]",
  open: "border-[#C1440E] bg-transparent text-[#C1440E]",
  disabled: "border-border/40 bg-transparent text-[#75695F]",
};

// `size` is opt-in and defaults to the original scale, so callers that never
// pass it (Brand Intro) render byte-identical to before. `lg` exists for a
// composer that wants its chips to read as confident controls, not
// badge-scale text. `lg` is used exclusively by PromptStep's Length/Ratio/
// Voice/Music row (confirmed - no other caller passes size="lg"), so its
// padding/gap/text-size are responsive right in this constant rather than
// forcing every call site to repeat the same override: below `sm` it's the
// compact icon+value-only shape (see the outlined+value render below - the
// label is dropped there too, same breakpoint) that fits all four chips in
// one row without scrolling; at `sm:` it's the original two-line stacked
// label/value shape, unchanged. `md` (Brand Intro, not part of that review)
// is untouched.
// `min-h-[44px]` (not `min-h-11`) - Tailwind's default `minHeight` scale only
// defines 0/full/screen/min/max/fit, unlike `height` it does NOT inherit the
// spacing scale, so `min-h-11` silently compiled to no rule at all (confirmed
// absent from the built CSS). That let mobile chips collapse to their natural
// ~30px content height - under the 44px touch-target minimum, and the reason
// the same 12px `rounded-xl` radius read as a pill on mobile (40% of height)
// vs a normal rounded rect on desktop (22.6% of height, since desktop's own
// padding already cleared 44px and masked the missing utility).
// Below `sm`, spacing between icon/value/chevron is no longer one shared
// flex `gap` - icon-to-value and value-to-chevron need different amounts, and
// a single `gap` can't express that. So the button's own `gap` is 0 below
// `sm` (unchanged `sm:gap-2.5` still spaces all three at desktop), and the
// mobile-only spacing lives as explicit margin on the value wrapper and the
// chevron instead (see their `ml-*` below).
// `sm:min-h-[52px]` (lg only): at `sm:` and up, the stacked label/value
// render (see the outlined+value branch below) is two lines of real content -
// roughly 9px label + 2px gap + 14px value, plus the button's own 20px of
// `sm:py-2.5` padding, comes to ~45-48px, which already exceeds the shared
// `min-h-[44px]` floor. A chip with no value (or a value-less outlined chip
// like Brand kit) never grows past that floor, so it renders visibly shorter
// than its stacked siblings in the same row - the two branches were never
// actually the same height once real content was in them. Raising the floor
// past what the stacked branch needs, rather than shrinking the stacked
// branch to fit 44px, means every chip - stacked or single-line - now
// resolves to the same 52px via this one min-height, with the single-line
// branch's shorter content centered inside it by the button's existing
// `items-center`.
const SIZE = {
  md: "px-3.5 min-h-[44px] text-xs gap-2 font-bold border",
  lg: "px-[1px] py-1.5 sm:px-4 sm:py-2.5 min-h-[44px] sm:min-h-[52px] gap-0.5 sm:gap-2.5 text-xs sm:text-sm font-extrabold border-[1.5px]",
};
const ICON_SIZE = { md: "w-3.5 h-3.5", lg: "w-[11px] h-[11px] sm:w-4 sm:h-4 -translate-y-0.4" };
// Trailing dropdown caret on outlined value chips only - see `variant` below.
// `lg` scales down below `sm` to match ICON_SIZE.lg - it was missed in the
// first mobile-compact pass (fixed size at every width), which combined with
// unconditional `justify-between` (see the grow button className below) is
// what made the chip read as mis-proportioned/off compared to desktop: a
// full-size 14px chevron pinned to the far edge of a now much smaller button,
// with only a 10px icon + one short value on the other side, reads as an odd
// gap rather than one balanced control. Unaffected above `sm` - `sm:w-3.5
// sm:h-3.5` is the exact original value.
const CHEVRON_SIZE = { md: "w-3 h-3", lg: "w-[11px] h-[11px] sm:w-3.5 sm:h-3.5" };
// Outlined value chips read as compact controls now (two-line stacked
// label/value), so they get a tighter rounded-rectangle radius instead of
// the full stadium pill - Improve deliberately keeps the pill shape (still
// `filled` or outlined-but-not-stacked) so it stays visually distinct as an
// action rather than a value, per the design reference.
const SHAPE = { filled: "rounded-full", outlined: "rounded-xl" };

// Below `sm`, every alignment resolves to `right-0` regardless of the
// `align` prop, overriding it there and restoring the original value at
// `sm:` and up. A chip's popover is `absolute` inside its OWN trigger's
// `relative` wrapper (not the row), so a `center`/`left` anchor on a chip
// sitting in the right half of the row let the panel's up-to-320px width
// spill past the viewport's right edge - which also grew the page's own
// scrollable width, so the whole page picked up a horizontal scrollbar.
// `right-0` instead grows the panel leftward from the trigger's own right
// edge, which - since every chip's right edge sits at or left of the row's
// own right edge, and the row itself never exceeds the viewport - can
// never push past the right edge no matter which chip in the row opened
// it. This does not perfectly center chips near the LEFT of the row
// (their panel may run past the viewport's left edge instead), but a
// left-edge overflow is visually clipped, not a page-level scrollbar - a
// materially smaller problem than the one being fixed, and the one
// actually confirmed by screenshots. Desktop (`sm:` and up) is completely
// unchanged - only the below-`sm` behavior moves.
const ALIGN_CLASS = {
  left: "right-0 sm:right-auto sm:left-0",
  right: "right-0",
  center: "right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2",
};

/**
 * `panel`, when provided, renders as an anchored popover under the chip -
 * `({ close }) => node` or a plain node. Omit it for a chip that acts
 * directly on click (a toggle, or a trigger that opens its own modal
 * elsewhere, e.g. the voice picker).
 */
export function ComposerChip({
  id,
  icon: Icon,
  label,
  value,
  modified = false,
  disabled = false,
  panel,
  align = "center",
  onClick,
  pressed,
  size = "md",
  variant = "filled",
  grow = false,
  className = "",
}) {
  const ctx = useContext(ChipRowContext);
  const hasPopover = !!panel;
  const open = hasPopover && ctx?.openId === id;
  const reduced = useMediaQuery(REDUCED_MOTION_QUERY);
  const isMobileSheet = useMediaQuery(MOBILE_SHEET_QUERY);

  const state = disabled ? "disabled" : open ? "open" : modified ? "modified" : "default";
  const tone = variant === "outlined" ? TONE_OUTLINED : TONE;

  // Keep the page scrollable far enough to reach the bottom of an open popover.
  // `applied` is what the row is already holding, and each measurement adds only
  // what is still missing: measuring against a page that already carries the
  // spacer would otherwise read a deficit of zero and drop it again on the next
  // pass, which is a loop, not a fix.
  const panelRef = useRef(null);
  const applied = useRef(0);
  const reportPanelSpace = ctx?.reportPanelSpace;
  useEffect(() => {
    if (!open || isMobileSheet || !reportPanelSpace) return undefined;
    const el = panelRef.current;
    if (!el) return undefined;

    const measure = () => {
      const next = applied.current + overflowBelow(el);
      if (next === applied.current) return;
      applied.current = next;
      reportPanelSpace(next);
    };
    measure();

    // One frame later the spacer is in the page, so there is somewhere to scroll
    // to. `nearest` moves only when the panel is actually cut off.
    const frame = requestAnimationFrame(() => {
      el.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
    });
    const observer = new ResizeObserver(measure);
    observer.observe(el);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      applied.current = 0;
      reportPanelSpace(0);
    };
  }, [open, isMobileSheet, reportPanelSpace, reduced]);

  const handleClick = () => {
    if (disabled) return;
    if (hasPopover) {
      ctx?.setOpenId(open ? null : id);
    } else {
      onClick?.();
    }
  };

  const close = () => ctx?.setOpenId(null);

  return (
    // `grow` (default false, so Improve and every other existing caller is
    // unaffected) makes this chip fill its equal share of the row at every
    // width now - a per-chip explicit `min-w-[Npx]` (passed via `className`
    // by the caller) is still the floor that stops any one of them
    // shrinking below its own content, but nothing pins it to content-only
    // sizing below `sm` any more. That requires width to actually propagate
    // down three levels, not just one:
    //   1. ComposerChipRow's per-chip `motion.div` wrapper (the direct flex
    //      child of the row) gets `flex-1` - see the `grow` check there.
    //   2. This wrapping div must switch from `inline-block` (content-width,
    //      ignores its parent's width) to `w-full`, or the motion.div's
    //      extra width goes unused.
    //   3. The <button> itself must also go `w-full` (`inline-flex` sizes to
    //      content regardless of an ancestor's width). `justify-between`
    //      alongside it pins the trailing chevron to the chip's right edge
    //      instead of hugging the text with dead space after it - but only
    //      from `sm:` up, where there's a two-line label/value block giving
    //      the chevron something substantial to balance against. Below `sm`
    //      (icon + one short value only) that same spread reads as an
    //      awkward gap around an isolated chevron, so mobile centers the
    //      packed icon+value+chevron cluster instead (`justify-center`).
    <div className={`relative ${grow ? "w-full" : "inline-block"}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-haspopup={hasPopover ? "dialog" : undefined}
        aria-expanded={hasPopover ? open : undefined}
        aria-controls={hasPopover ? `${id}-popover` : undefined}
        aria-pressed={!hasPopover && pressed != null ? pressed : undefined}
        className={`inline-flex items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra)]/40 disabled:cursor-not-allowed ${SHAPE[variant] || SHAPE.filled} ${SIZE[size]} ${tone[state]} ${grow ? "w-full justify-center sm:justify-between" : ""} ${className}`}
        style={state === "open" ? { boxShadow: "0 4px 14px rgba(193,68,14,0.22)" } : undefined}
      >
        {Icon ? <Icon className={`${ICON_SIZE[size]} shrink-0`} /> : null}
        {/* Outlined value chips (Length/Ratio/Voice/Music): a two-line stack,
            label on top small/muted, value below bold/dark - replacing the old
            single-line "label value" run. Static colors here rather than
            inheriting the button's tone-driven text color, since the reference
            shows plain dark/muted text regardless of state; the border still
            carries the default/modified/open state cues. Filled chips (Brand
            Intro) and any outlined chip with no value keep the original
            single-line layout untouched.
            Below `sm` the label is dropped entirely (`hidden sm:block`) and
            only the value shows next to the icon, matching the icon-only
            pattern the Inspiration/Dictionary/Tips pills already use below
            that breakpoint - that's what let these four chips fit one row
            without scrolling (see SIZE.lg and ComposerChipRow's gapClassName
            usage in PromptStep). `sm:mt-0.5` (was unconditional) only
            separates the value from the label once the label is actually
            there to separate it from.
            `flex-row sm:flex-col` (was unconditional `flex-col`): below `sm`
            this wrapper only ever has one visible child (the label is
            `display:none`), so it already rendered as one line, but the
            container was still structurally the two-line stack meant for
            `sm:` and up - `ml-1` here (the icon-to-value gap) instead relies
            on that being a row. `items-center` matches, so icon/value/chevron
            share one baseline explicitly rather than by coincidence. */}
        {variant === "outlined" && value ? (
          <span className="flex flex-row sm:flex-col items-center sm:items-start leading-none ml-1 sm:ml-0">
            <span className="hidden sm:block text-[9px] font-bold uppercase tracking-wide" style={{ color: '#75695F' }}>
              {label}
            </span>
            {/* Value is deliberately lighter than the label above it (design
                correction: was font-extrabold, heavier than the label, which
                read backwards) - font-medium keeps it legible without
                competing with the label's weight. */}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={value}
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduced ? undefined : { opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-xs sm:text-sm font-medium sm:mt-0.5 ml-0.3"
                style={{ color: 'var(--ink-warm)' }}
              >
                {value}
              </motion.span>
            </AnimatePresence>
          </span>
        ) : (
          <>
            {/* font-medium (not the button's own font-extrabold at size="lg",
                which this would otherwise inherit): matches the weight the
                stacked branch above gives its value line. Without a value,
                this text IS the chip's whole content - the same design
                correction noted above (value dropped from extrabold to
                medium so it stopped reading heavier than its label) applies
                here for the same reason, it just never got carried over to
                this branch since no size="lg" caller went value-less until
                Brand Intro's Brand kit / empty Photos chips. size="md"
                chips are unaffected either way (SIZE.md's own base weight
                is already font-bold, and this branch's text has never
                relied on inheriting it). Color is likewise hardcoded to
                `var(--ink-warm)`, matching the stacked value span exactly
                (which does the same regardless of state) - without this,
                the span instead inherited TONE_OUTLINED's state-driven
                color, `#6B5E7B` grey in the default state, which is
                visibly greyer/lighter than every stacked chip's ink-warm
                value text next to it in the same row. The border still
                carries the modified/open state color cues unchanged (only
                this text color is now constant), the same split the
                stacked branch already uses. */}
            <span className="font-medium" style={{ color: 'var(--ink-warm)' }}>{label}</span>
            {value ? (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={value}
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduced ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="font-semibold opacity-70"
                >
                  {value}
                </motion.span>
              </AnimatePresence>
            ) : null}
          </>
        )}
        {variant === "outlined" && (
          // Below `sm`, a chip with no popover to indicate (Voice opens a
          // modal, Music just toggles - neither has `panel` set, so
          // `hasPopover` is false) drops the chevron entirely: it was never
          // semantically meaningful there (nothing expands), and reclaiming
          // its width was the difference between four equal-width chips
          // fitting one row and Music wrapping to its own line once the
          // chevron's width was correctly folded into every chip's
          // min-width. Desktop is unaffected either way - `hidden sm:block`
          // is only ever a below-`sm` restriction, so a hasPopover-less chip
          // still shows its chevron at `sm:` and up exactly as before.
          <ChevronDown
            aria-hidden="true"
            className={`${CHEVRON_SIZE[size]} shrink-0 opacity-60 transition-transform ml-0.5 sm:ml-0 ${hasPopover ? "" : "hidden sm:block"}`}
            style={{ transform: open ? "rotate(180deg)" : "none" }}
          />
        )}
      </button>

      {/* Two rounds of anchor-math fixes (viewport-clamped align, then a
          height cap) still left the panel positioned relative to its OWN
          trigger, which is fundamentally the wrong model on a phone: a
          floating popover anchored to a small chip in a 4-wide row has no
          good anchor point once the row is nearly as wide as the screen -
          every fix was patching where the panel points, not what kind of
          surface it should be. Below `sm` this renders a bottom sheet
          instead: fixed to the viewport, full width, docked to the bottom
          of the screen regardless of which chip opened it or where that
          chip sits in the row - not an anchor problem to solve, a different
          UI for a different form factor. `sm:` and up is untouched, same
          anchored popover as before, byte-for-byte. */}
      {hasPopover && !isMobileSheet && (
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              id={`${id}-popover`}
              role="dialog"
              aria-label={label}
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -4 }}
              transition={reduced ? { duration: 0.1 } : { type: "spring", stiffness: 420, damping: 32 }}
              style={{
                transformOrigin: "top center",
                // Warm Shadow Rule: every floating surface is terracotta-tinted,
                // never the neutral/black shadow Tailwind's shadow-lg ships.
                boxShadow: "0 8px 24px rgba(193,68,14,0.16), 0 2px 8px rgba(193,68,14,0.10)",
              }}
              // `top: 100%` anchors to the wrapping `relative inline-block`'s
              // rendered height, which is driven solely by the button (this
              // popover is `absolute`, so it never contributes to that height
              // itself). That means it was already height-agnostic before the
              // chips grew taller for the two-line stack - verified by reading
              // the layout, not just assumed, since the taller stacked chips
              // depend on it staying correct.
              //
              // `max-h-[min(360px,60vh)] overflow-y-auto` (matches the Help
              // me start popover's own cap): a chip in the LAST row of its
              // card - true of every chip here in both modes - opens right
              // above whatever sits below that card (a CTA button, footer
              // text). `position:absolute` doesn't push page layout, so an
              // uncapped tall panel (Brand kit's color/font picker content
              // in particular) simply draws over that content instead of
              // pushing it down. This isn't about horizontal anchoring -
              // each popover was already correctly positioned relative to
              // its own trigger - it's that nothing ever stopped one from
              // growing past the card's own bottom edge.
              className={`absolute z-30 top-[calc(100%+8px)] ${ALIGN_CLASS[align]} w-[min(88vw,320px)] max-h-[min(360px,60vh)] overflow-y-auto rounded-2xl bg-surface-alt border border-border/40 p-4`}
            >
              {typeof panel === "function" ? panel({ close }) : panel}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Mobile bottom sheet. Rendered through a portal into `document.body`,
          not as a normal descendant here, for a real reason: every chip in
          this row sits inside ComposerChipRow's own animated `motion.div`
          wrapper (it animates `y` on entrance), and Framer Motion applies
          that as an inline `transform`. A `transform` on ANY ancestor turns
          it into the containing block for `position:fixed` descendants per
          the CSS spec - so a `fixed inset-x-0 bottom-0` sheet rendered as a
          normal child here would dock to that small animated wrapper's own
          box, not the viewport, silently reintroducing the exact
          per-trigger anchoring problem this is replacing. The portal
          sidesteps it entirely: the sheet's DOM is a direct child of
          `<body>`, outside every transformed ancestor, so `fixed` means the
          actual viewport regardless of which chip - or how deep in the row
          - opened it. */}
      {hasPopover && isMobileSheet && createPortal(
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                key="backdrop"
                aria-hidden="true"
                onClick={close}
                className="fixed inset-0 z-40 bg-black/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0.1 : 0.2 }}
              />
              <motion.div
                key="sheet"
                id={`${id}-popover`}
                role="dialog"
                aria-modal="true"
                aria-label={label}
                // Click/touch handled here, not left to bubble to
                // ComposerChipRow's document-level outside-click listener:
                // that listener tests `rowRef.current.contains(e.target)`,
                // and portaled content is a React descendant but not a DOM
                // one, so every tap inside the sheet's own content (picking
                // a length, adjusting a brand color) would read as "outside
                // the row" and close the sheet out from under the tap. The
                // backdrop above is the sheet's actual close-on-outside-tap
                // affordance; this stops that document listener from ever
                // seeing sheet-internal taps at all.
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                initial={reduced ? { opacity: 0 } : { y: "100%" }}
                animate={reduced ? { opacity: 1 } : { y: 0 }}
                exit={reduced ? { opacity: 0 } : { y: "100%" }}
                transition={reduced ? { duration: 0.15 } : { type: "spring", stiffness: 380, damping: 34 }}
                style={{
                  boxShadow: "0 -8px 24px rgba(193,68,14,0.16), 0 -2px 8px rgba(193,68,14,0.10)",
                  paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
                }}
                className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-surface-alt border-t border-border/40 pt-3 px-4"
              >
                {/* Grabber bar: decorative only (no drag-to-dismiss is
                    wired up) - the close affordance is the X button below
                    and the backdrop tap, but the bar is the visual
                    convention that reads "this is a sheet" at a glance. */}
                <div className="flex justify-center mb-1" aria-hidden="true">
                  <div className="w-9 h-1 rounded-full bg-border" />
                </div>
                <div className="flex justify-end mb-1">
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="w-9 h-9 -mr-1.5 rounded-full flex items-center justify-center text-[#6B5E7B] hover:text-[var(--terra)] hover:bg-black/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra)]/40"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="pb-2">
                  {typeof panel === "function" ? panel({ close }) : panel}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

export const ChipPanelLabel = ({ children }) => (
  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-3">{children}</p>
);

/** The segmented option-picker shared by every popover that offers a short list of choices (length, ratio). */
export function ChipSegments({ options, value, onChange, render, layoutId }) {
  return (
    <div className="flex p-1.5 rounded-xl bg-white border border-border/40">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className="flex-1 py-2 px-2 rounded-lg text-xs font-bold tracking-wide transition-all relative z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra)]/40"
          style={{ color: value === opt.key ? "#fff" : "#6B5E7B" }}
        >
          {value === opt.key && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-lg -z-10"
              style={{ background: "var(--gradient-brand)", boxShadow: "0 4px 14px rgba(193,68,14,0.25)" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          {render(opt)}
        </button>
      ))}
    </div>
  );
}

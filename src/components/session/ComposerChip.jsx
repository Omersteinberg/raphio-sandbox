import { createContext, useContext, useEffect, useRef, useState, Children } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

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
  const rowRef = useRef(null);
  const reduced = useMediaQuery(REDUCED_MOTION_QUERY);

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
    <ChipRowContext.Provider value={{ openId, setOpenId }}>
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
      </div>
    </ChipRowContext.Provider>
  );
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
const SIZE = {
  md: "px-3.5 min-h-[44px] text-xs gap-2 font-bold border",
  lg: "px-[1px] py-1.5 sm:px-4 sm:py-2.5 min-h-[44px] gap-0.5 sm:gap-2.5 text-xs sm:text-sm font-extrabold border-[1.5px]",
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

const ALIGN_CLASS = {
  left: "left-0",
  right: "right-0",
  center: "left-1/2 -translate-x-1/2",
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

  const state = disabled ? "disabled" : open ? "open" : modified ? "modified" : "default";
  const tone = variant === "outlined" ? TONE_OUTLINED : TONE;

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
            <span>{label}</span>
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

      {hasPopover && (
        <AnimatePresence>
          {open && (
            <motion.div
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
              className={`absolute z-30 top-[calc(100%+8px)] ${ALIGN_CLASS[align]} w-[min(88vw,320px)] rounded-2xl bg-surface-alt border border-border/40 p-4`}
            >
              {typeof panel === "function" ? panel({ close }) : panel}
            </motion.div>
          )}
        </AnimatePresence>
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

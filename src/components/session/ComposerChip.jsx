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

export function ComposerChipRow({ children, className = "" }) {
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

  return (
    <ChipRowContext.Provider value={{ openId, setOpenId }}>
      <div ref={rowRef} className={`flex flex-wrap items-center gap-3 ${className}`}>
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
          const grow = !!child.props?.grow;
          return (
            <motion.div
              className={grow ? "flex-1" : undefined}
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
const TONE_OUTLINED = {
  default: "border-[var(--terra)]/50 bg-transparent text-[#6B5E7B] hover:border-[var(--terra)]/65 hover:text-[var(--terra)]",
  modified: "border-[var(--terra)]/70 bg-transparent text-[var(--terra)]",
  open: "border-[var(--terra)] bg-transparent text-[var(--terra)]",
  disabled: "border-border/40 bg-transparent text-[#75695F]",
};

// `size` is opt-in and defaults to the original scale, so callers that never
// pass it (Brand Intro) render byte-identical to before. `lg` exists for a
// composer that wants its chips to read as confident controls, not
// badge-scale text. `lg` is now built for the two-line stacked label/value
// layout (see the label+value rendering below) rather than one text line -
// tighter horizontal padding than the old single-line version, since a
// narrower stacked box is the whole point; `md` (Brand Intro, not part of
// that review) is untouched.
const SIZE = {
  md: "px-3.5 min-h-11 text-xs gap-2 font-bold border",
  lg: "px-4 py-2.5 min-h-11 gap-2.5 text-sm font-extrabold border-[1.5px]",
};
const ICON_SIZE = { md: "w-3.5 h-3.5", lg: "w-4 h-4" };
// Trailing dropdown caret on outlined value chips only - see `variant` below.
const CHEVRON_SIZE = { md: "w-3 h-3", lg: "w-3.5 h-3.5" };
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
    // unaffected) makes this chip fill its share of the row instead of
    // hugging its own content. That requires width to actually propagate
    // down three levels, not just one:
    //   1. ComposerChipRow's per-chip `motion.div` wrapper (the direct flex
    //      child of the row) gets `flex-1` - see the `grow` check there.
    //   2. This wrapping div must switch from `inline-block` (content-width,
    //      ignores its parent's width) to `w-full`, or the motion.div's
    //      extra width goes unused.
    //   3. The <button> itself must also go `w-full` (`inline-flex` sizes to
    //      content regardless of an ancestor's width) - `justify-between`
    //      alongside it so the trailing chevron pins to the chip's right
    //      edge instead of hugging the text with dead space after it.
    <div className={`relative ${grow ? "w-full" : "inline-block"}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-haspopup={hasPopover ? "dialog" : undefined}
        aria-expanded={hasPopover ? open : undefined}
        aria-controls={hasPopover ? `${id}-popover` : undefined}
        aria-pressed={!hasPopover && pressed != null ? pressed : undefined}
        className={`inline-flex items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra)]/40 disabled:cursor-not-allowed ${SHAPE[variant] || SHAPE.filled} ${SIZE[size]} ${tone[state]} ${grow ? "w-full justify-between" : ""} ${className}`}
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
            single-line layout untouched. */}
        {variant === "outlined" && value ? (
          <span className="flex flex-col items-start leading-none">
            <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: '#75695F' }}>
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
                className="text-sm font-medium mt-0.5"
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
          <ChevronDown
            aria-hidden="true"
            className={`${CHEVRON_SIZE[size]} shrink-0 opacity-60 transition-transform`}
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

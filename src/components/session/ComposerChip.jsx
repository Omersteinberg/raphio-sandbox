import { createContext, useContext, useEffect, useRef, useState, Children } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      <div ref={rowRef} className={`flex flex-wrap gap-2 ${className}`}>
        {Children.map(children, (child, i) => {
          if (!child) return child;
          return (
            <motion.div
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
  disabled: "border-border/40 bg-white text-[#9C8F85]",
};

// `size` is opt-in and defaults to the original scale, so callers that never
// pass it (Brand Intro) render byte-identical to before. `lg` exists for a
// composer that wants its chips to read as confident controls on a tinted
// tray, not badge-scale text on white.
const SIZE = {
  md: "px-3.5 min-h-11 text-xs gap-2 font-bold border",
  lg: "px-4 min-h-12 text-sm gap-2.5 font-extrabold border-[1.5px]",
};
const ICON_SIZE = { md: "w-3.5 h-3.5", lg: "w-4 h-4" };

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
}) {
  const ctx = useContext(ChipRowContext);
  const hasPopover = !!panel;
  const open = hasPopover && ctx?.openId === id;
  const reduced = useMediaQuery(REDUCED_MOTION_QUERY);

  const state = disabled ? "disabled" : open ? "open" : modified ? "modified" : "default";

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
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        aria-haspopup={hasPopover ? "dialog" : undefined}
        aria-expanded={hasPopover ? open : undefined}
        aria-controls={hasPopover ? `${id}-popover` : undefined}
        aria-pressed={!hasPopover && pressed != null ? pressed : undefined}
        className={`inline-flex items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra)]/40 disabled:cursor-not-allowed ${SIZE[size]} ${TONE[state]}`}
        style={state === "open" ? { boxShadow: "0 4px 14px rgba(193,68,14,0.22)" } : undefined}
      >
        {Icon ? <Icon className={`${ICON_SIZE[size]} shrink-0`} /> : null}
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

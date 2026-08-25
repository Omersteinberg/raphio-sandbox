import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// Text tabs with a single sliding underline - icon + label, no pill/background/
// border on either state. Unlike a segmented pill control (this component's own
// prior version), tab labels here are naturally different widths ("Idea" vs
// "References"), so the underline can't use simple 1/n percentage math the way
// a pill can - it's measured against each tab button's actual rendered
// offsetLeft/offsetWidth instead, the standard approach for variable-width
// underline tabs (Reach UI/Radix use the same technique).
export default function PipelineModeTabs({ options, value, onChange, className = "" }) {
  const n = options.length;
  const activeIndex = Math.max(0, options.findIndex((o) => o.id === value));
  const tabRefs = useRef([]);
  const [indicator, setIndicator] = useState(null);

  const measure = () => {
    const el = tabRefs.current[activeIndex];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  };

  // Re-measure whenever the active tab changes, and on resize - the sm:
  // breakpoint changes each button's own padding, which shifts every
  // offsetLeft/offsetWidth after it.
  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, options]);

  const handleKeyDown = (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    let next = activeIndex;
    if (e.key === "ArrowLeft") next = (activeIndex - 1 + n) % n;
    else if (e.key === "ArrowRight") next = (activeIndex + 1) % n;
    else if (e.key === "Home") next = 0;
    else next = n - 1;
    onChange(options[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Choose how you start"
      onKeyDown={handleKeyDown}
      className={`relative inline-flex items-stretch ${className}`}
    >
      {options.map((opt, i) => {
        const selected = opt.id === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            ref={(el) => (tabRefs.current[i] = el)}
            type="button"
            role="tab"
            id={`pipeline-mode-tab-${opt.id}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.id)}
            className="flex items-center justify-center gap-1.5 px-4 sm:px-5 h-11 rounded-md text-sm font-bold whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1440E]/40"
            style={
              selected
                ? {
                    background: "var(--gradient-brand)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    border: "none",
                  }
                : { color: "#B3A8BA", background: "transparent", border: "none" }
            }
            onMouseEnter={(e) => { if (!selected) e.currentTarget.style.color = "#6B5E7B"; }}
            onMouseLeave={(e) => { if (!selected) e.currentTarget.style.color = "#B3A8BA"; }}
          >
            {Icon && (
              <Icon
                style={{ width: 14, height: 14, color: selected ? "#C1440E" : "currentColor" }}
                strokeWidth={2.5}
              />
            )}
            {opt.label}
          </button>
        );
      })}
      {indicator && (
        <motion.div
          aria-hidden="true"
          className="absolute bottom-0 h-[3px] rounded-full"
          style={{ background: "var(--gradient-brand)", boxShadow: "0 1px 6px rgba(193,68,14,0.55)" }}
          animate={{ x: indicator.left, width: indicator.width }}
          initial={false}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
    </div>
  );
}

import { useRef } from "react";
import { motion } from "framer-motion";

// Segmented mode toggle for the creation screen - controlled, generic version
// of the animated tablist built for LandingPage.jsx's "Choose how you start"
// preview (MobileInputStage, LandingPage.jsx ~1236-1289). Same pattern: a real
// tablist with roving tabIndex + arrow-key navigation, one always-mounted pill
// that translates between segments instead of a per-tab conditional element.
// The landing version also drives an auto-cycling illustration; this one is
// purely a controlled switch (value/onChange), since it's wired to real
// pipelineMode state here, not a decorative preview.
export default function PipelineModeTabs({ options, value, onChange, className = "" }) {
  const n = options.length;
  const activeIndex = Math.max(0, options.findIndex((o) => o.id === value));
  const tabRefs = useRef([]);

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
      // inline-flex (shrink-to-fit) is what makes this compact instead of
      // spanning the whole composer card - but that's also what broke it the
      // first time: flex-1's equal-width distribution only works when the
      // flex container has a DEFINITE width to divide, which a shrink-to-fit
      // container doesn't have (LandingPage's source dodges this because its
      // track is `flex`, not `inline-flex`, filling a sized parent). With no
      // width to distribute, each button fell back to its own content size -
      // different per label, and the sliding pill's percentage math (which
      // assumes equal segments) had nothing consistent to align against.
      // Fixed here by giving every button an explicit min-width floor (sized
      // to the widest label) instead of relying on flex-grow distribution -
      // the container still shrinks to fit, but every segment is now exactly
      // that floor width, so the pill's math lines up again.
      className={`relative inline-flex rounded-full ${className}`}
      style={{ background: "#F0EAE5", padding: 4 }}
    >
      <motion.div
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 rounded-full"
        style={{
          width: `${100 / n}%`,
          background: "var(--gradient-brand)",
          boxShadow: "0 0 0 2px #FFFAF7, 0 0 0 4px rgba(193,68,14,0.35), 0 4px 14px rgba(193,68,14,0.30)",
        }}
        animate={{ x: `${activeIndex * 100}%` }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      />
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
            className="relative z-10 flex-1 min-w-[76px] sm:min-w-[104px] flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 rounded-full text-xs sm:text-[13px] font-bold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1440E]/40"
            style={{ color: selected ? "#fff" : "#75695F", background: "transparent", border: "none", boxShadow: "none" }}
          >
            {Icon && <Icon style={{ width: 14, height: 14 }} strokeWidth={2.5} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

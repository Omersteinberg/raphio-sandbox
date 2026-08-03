import { motion } from "framer-motion";
import { Sparkles, Image as ImageIcon, Wand2, Clapperboard, Check, ArrowRight } from "lucide-react";

// ── Design tokens (mirrors MyVideosPage) ──────────────────────────
const C = {
  bg:      'linear-gradient(160deg, #FDF6F0 0%, #FDFAF8 50%, #F7F4FB 100%)',
  dark:    '#2D2235',
  terra:   '#C1440E',
  terraLt: '#E8632A',
  muted:   '#6B5E7B',
  faint:   'rgba(45,34,53,0.08)',
  border:  'rgba(45,34,53,0.09)',
};

const GRADIENT = `linear-gradient(135deg, ${C.terra}, ${C.terraLt})`;

// The four ways to start a video. `id` matches the pipeline mode keys.
const MODES = [
  {
    id: "prompt",
    Icon: Sparkles,
    title: "Just prompt",
    useCase: "Describe your idea and let AI generate the whole video. No photos needed.",
    pros: ["Fastest way to start, just type", "AI creates every scene for you"],
    con: "AI invents the people and places, not your real ones",
  },
  {
    id: "image",
    Icon: ImageIcon,
    title: "Upload photos",
    useCase: "Turn your own photos into a narrated, styled video.",
    pros: ["Uses your real moments and people", "Add up to 10 photos in any order"],
    con: "You need photos ready to upload",
  },
  {
    id: "references",
    Icon: Wand2,
    title: "Generate with references",
    useCase: "Lock in characters and settings, then build a consistent story across scenes.",
    pros: ["Consistent characters across scenes", "Best for videos that tell a story"],
    con: "Takes longer to set up (about 7 min)",
  },
  {
    id: "intro",
    Icon: Clapperboard,
    title: "Brand intro",
    useCase: "A punchy ~12 second branded stinger with fast cuts, kinetic captions and your logo.",
    pros: ["Fast cuts + animated captions", "Uses your logo and brand colours"],
    con: "Short-form only, one quick scene per beat",
  },
];

/**
 * The video-creation entry point: four selectable cards. Picking a card calls
 * onPick(modeId) - the parent (Creator) persists the mode and enters the pipeline.
 * `initialMode` (the user's last-used mode) gets a subtle highlight; it does NOT
 * auto-advance.
 */
export default function ModeChooser({ onPick, initialMode = null }) {
  return (
    <div
      className="h-full w-full overflow-y-auto font-figtree"
      style={{ background: C.bg }}
    >
      <style>{`
        .mc-grid { display:grid; grid-template-columns:1fr; gap:16px; }
        @media (min-width:640px) { .mc-grid { grid-template-columns:repeat(2,1fr); } }
        @media (min-width:1024px) { .mc-grid { grid-template-columns:repeat(4,1fr); } }
      `}</style>

      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:py-14">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="text-center mb-8 md:mb-10"
        >
          <h1
            className="font-extrabold tracking-tight mb-2"
            style={{ color: C.dark, fontSize: "clamp(24px, 4vw, 36px)", letterSpacing: "-0.025em" }}
          >
            How do you want to make this video?
          </h1>
          <p style={{ color: C.muted, fontSize: 15 }}>
            Pick a starting point. You can change it any time.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="mc-grid">
          {MODES.map((mode, i) => {
            const isLast = mode.id === initialMode;
            const { Icon } = mode;
            return (
              <motion.button
                key={mode.id}
                type="button"
                onClick={() => onPick(mode.id)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut", delay: 0.06 + i * 0.07 }}
                whileHover={{ y: -3 }}
                className="group relative flex flex-col text-left rounded-3xl p-6 focus:outline-none"
                style={{
                  background: "#fff",
                  border: `1px solid ${isLast ? "rgba(193,68,14,0.45)" : C.border}`,
                  boxShadow: isLast
                    ? "0 4px 22px rgba(193,68,14,0.14)"
                    : "0 2px 16px rgba(45,34,53,0.06)",
                  minHeight: 260,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(193,68,14,0.45)";
                  e.currentTarget.style.boxShadow = "0 8px 28px rgba(193,68,14,0.16)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isLast ? "rgba(193,68,14,0.45)" : C.border;
                  e.currentTarget.style.boxShadow = isLast
                    ? "0 4px 22px rgba(193,68,14,0.14)"
                    : "0 2px 16px rgba(45,34,53,0.06)";
                }}
              >
                {isLast && (
                  <span
                    className="absolute top-4 right-4 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: "rgba(193,68,14,0.08)", color: C.terra, letterSpacing: "0.06em" }}
                  >
                    Last used
                  </span>
                )}

                {/* Icon tile */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: GRADIENT, boxShadow: "0 4px 14px rgba(193,68,14,0.25)" }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* Title + use-case */}
                <h2 className="font-extrabold mb-1.5" style={{ color: C.dark, fontSize: 18 }}>
                  {mode.title}
                </h2>
                <p className="mb-4" style={{ color: C.muted, fontSize: 13.5, lineHeight: 1.6 }}>
                  {mode.useCase}
                </p>

                {/* Pros / con */}
                <div className="mt-auto flex flex-col gap-1.5">
                  {mode.pros.map((pro) => (
                    <div key={pro} className="flex items-start gap-2">
                      <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#16A34A" }} />
                      <span style={{ color: C.dark, fontSize: 12.5, lineHeight: 1.5 }}>{pro}</span>
                    </div>
                  ))}
                  <div className="flex items-start gap-2">
                    <span
                      className="flex-shrink-0 mt-0.5 flex items-center justify-center"
                      style={{ width: 16, height: 16, color: C.muted, fontSize: 14, lineHeight: 1 }}
                    >
                      -
                    </span>
                    <span style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.5 }}>{mode.con}</span>
                  </div>
                </div>

                {/* Hover affordance */}
                <span
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: C.terra }}
                >
                  Start
                  <ArrowRight className="w-4 h-4" />
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

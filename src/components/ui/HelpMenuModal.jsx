import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlayCircle, Compass, X } from "lucide-react";

const C = { dark: "#2D2235", muted: "#6B5E7B" };
const GRADIENT = "linear-gradient(135deg, #C1440E, #E8632A)";

export default function HelpMenuModal({ open, onClose, onStartTour, onPlayVideo }) {
  return (
    <AnimatePresence>
      {open ? (
        <HelpMenuDialog onClose={onClose} onStartTour={onStartTour} onPlayVideo={onPlayVideo} />
      ) : null}
    </AnimatePresence>
  );
}

function HelpMenuDialog({ onClose, onStartTour, onPlayVideo }) {
  const firstOptionRef = useRef(null);

  // Reading the handler through a ref keeps this a subscribe-once effect: the
  // callers pass inline arrows, so an `onClose` dependency would tear the
  // listener down and rebuild it on every render of the host screen.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    firstOptionRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(28,25,23,0.55)", backdropFilter: "blur(4px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-menu-title"
    >
      <motion.div
        className="w-full max-w-md rounded-3xl bg-white overflow-hidden font-figtree max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: "0 20px 60px rgba(45,34,53,0.30)" }}
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 sm:px-6">
          <h2
            id="help-menu-title"
            className="font-extrabold tracking-tight"
            style={{ color: C.dark, fontSize: 19, letterSpacing: "-0.01em" }}
          >
            Need a hand?
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 inline-flex items-center justify-center rounded-full transition-colors hover:bg-black/5"
            style={{ width: 44, height: 44, color: C.muted }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3 p-5 pt-2 sm:p-6 sm:pt-2">
          <HelpOption
            ref={firstOptionRef}
            icon={<PlayCircle className="w-5 h-5 text-white" strokeWidth={2.4} />}
            title="Watch the video"
            description="A short walkthrough of this screen"
            onClick={onPlayVideo}
          />
          <HelpOption
            icon={<Compass className="w-5 h-5 text-white" strokeWidth={2.4} />}
            title="Take the tour"
            description="Step-by-step, right here on the page"
            onClick={onStartTour}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function HelpOption({ ref, icon, title, description, onClick }) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-colors hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{ border: "1px solid rgba(45,34,53,0.10)", "--tw-ring-color": "#C1440E" }}
    >
      <span
        className="shrink-0 inline-flex items-center justify-center rounded-xl"
        style={{ width: 44, height: 44, background: GRADIENT, boxShadow: "0 6px 16px rgba(193,68,14,0.28)" }}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-bold" style={{ color: C.dark, fontSize: 15 }}>
          {title}
        </span>
        <span className="block" style={{ color: C.muted, fontSize: 13, lineHeight: 1.45 }}>
          {description}
        </span>
      </span>
    </button>
  );
}

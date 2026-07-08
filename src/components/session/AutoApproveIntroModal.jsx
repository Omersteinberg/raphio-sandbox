import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, AlertTriangle, Check } from "lucide-react";

// Shown once, before a user's first video generation. Offers a single switch
// that turns on ALL of the auto-approve toggles at once (references, script,
// bridges, scene frames, and the credit-spending final generate). Default OFF so
// nobody enables hands-off credit spending by accident - they must opt in.
const C = {
  dark: "#2D2235",
  terra: "#C1440E",
  terraLt: "#E8632A",
  muted: "#6B5E7B",
  border: "rgba(45,34,53,0.10)",
};

function Switch({ on, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="relative shrink-0 rounded-full transition-colors"
      style={{ width: 52, height: 30, background: on ? "linear-gradient(135deg, #C1440E, #E8632A)" : "#E2DAD3" }}
    >
      <span
        className="absolute rounded-full bg-white transition-transform"
        style={{
          width: 24, height: 24, top: 3, left: 3,
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
          transform: on ? "translateX(22px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

export default function AutoApproveIntroModal({ onConfirm, busy = false }) {
  const [on, setOn] = useState(false);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: "rgba(28,25,23,0.55)", backdropFilter: "blur(4px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-full max-w-md rounded-3xl bg-white overflow-hidden font-figtree"
          style={{ boxShadow: "0 20px 60px rgba(45,34,53,0.30)" }}
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
        >
          <div className="p-6 sm:p-7">
            {/* Icon */}
            <div
              className="inline-flex items-center justify-center rounded-2xl mb-4"
              style={{ width: 52, height: 52, background: "linear-gradient(135deg, #C1440E, #E8632A)", boxShadow: "0 6px 16px rgba(193,68,14,0.30)" }}
            >
              <Zap className="w-6 h-6 text-white" />
            </div>

            <h2 className="font-extrabold tracking-tight" style={{ color: C.dark, fontSize: 21, letterSpacing: "-0.01em" }}>
              Make your first video hands-free?
            </h2>
            <p className="mt-2" style={{ color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
              Normally Raphio pauses at each step (the script, the frames, and more) so you can review
              it before moving on. Turn this on and it approves every step for you and runs straight
              through to the finished video.
            </p>

            {/* The single switch */}
            <div
              className="mt-5 flex items-start justify-between gap-4 rounded-2xl p-4"
              style={{ border: `1px solid ${C.border}`, background: "#FBF8F5" }}
            >
              <div className="min-w-0">
                <p className="font-bold" style={{ color: C.dark, fontSize: 15 }}>
                  Approve every step automatically
                </p>
                <p className="mt-0.5" style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.5 }}>
                  Skips all the review checkpoints in one go.
                </p>
              </div>
              <Switch on={on} onChange={setOn} />
            </div>

            {/* Credit warning only when enabled - this includes auto-Generate */}
            <AnimatePresence>
              {on && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div
                    className="mt-3 flex items-start gap-2 rounded-2xl p-3.5"
                    style={{ background: "rgba(193,68,14,0.06)", border: "1px solid rgba(193,68,14,0.22)" }}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: C.terra }} />
                    <p style={{ color: C.terra, fontSize: 12.5, lineHeight: 1.5, fontWeight: 600 }}>
                      This also starts the final video and spends credits automatically, with no last
                      confirmation.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <button
              type="button"
              disabled={busy}
              onClick={() => onConfirm(on)}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-2xl font-bold text-white transition-transform active:scale-[0.99]"
              style={{
                height: 50, fontSize: 15,
                background: "linear-gradient(135deg, #C1440E, #E8632A)",
                boxShadow: "0 6px 16px rgba(193,68,14,0.28)",
                opacity: busy ? 0.7 : 1,
              }}
            >
              {on && <Check className="w-4 h-4" />}
              {on ? "Turn it on and start" : "Start creating"}
            </button>
            <p className="mt-3 text-center" style={{ color: C.muted, fontSize: 11.5 }}>
              You can change this anytime in Settings.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

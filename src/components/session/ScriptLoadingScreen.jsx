import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const SUB_STEPS = [
  { id: "session",  label: "Setting up your session", range: [0, 15]  },
  { id: "upload",   label: "Uploading your images",   range: [15, 40] },
  { id: "analyze",  label: "Analyzing images",         range: [40, 70] },
  { id: "restyle",  label: "Restyling images",         range: [70, 85] },
  { id: "script",   label: "Generating script",        range: [85, 100] },
];

function getStatus(range, progress) {
  if (progress >= range[1]) return "done";
  if (progress >= range[0]) return "active";
  return "pending";
}

export default function ScriptLoadingScreen({ progress = 0, subSteps, estimate = "~5 minutes" }) {
  const steps = subSteps ?? SUB_STEPS;
  const [displayed, setDisplayed] = useState(0);
  const displayedRef = useRef(0);
  const rafRef = useRef(null);
  const targetRef = useRef(progress);

  useEffect(() => {
    targetRef.current = progress;

    const tick = () => {
      const diff = targetRef.current - displayedRef.current;
      if (Math.abs(diff) < 0.3) {
        displayedRef.current = targetRef.current;
        setDisplayed(targetRef.current);
        return; // stop rAF loop — resume when progress changes again
      }
      displayedRef.current += diff * 0.07;
      setDisplayed(Math.round(displayedRef.current));
      rafRef.current = requestAnimationFrame(tick);
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [progress]);

  const dp = Math.round(displayed);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-40 flex flex-col items-center justify-center p-8"
      style={{ background: "#F5F0EB" }}
    >
      {/* Spinning icon */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "linear-gradient(135deg, #C1440E, #E8603C)" }}
      >
        <Sparkles className="w-7 h-7 text-white" />
      </motion.div>

      <h2 className="text-xl font-bold mb-1" style={{ color: "#1C1917" }}>
        Creating your video
      </h2>
      <p className="text-sm mb-8" style={{ color: "#9C8F85" }}>
        Estimated time: {estimate}
      </p>

      {/* Sub-steps list */}
      <div className="flex flex-col gap-3 w-full max-w-xs mb-8">
        {steps.map((s, i) => {
          const status = getStatus(s.range, dp);
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className="flex items-center gap-3"
            >
              <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                {status === "done" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 18 }}
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #C1440E, #E8603C)" }}
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </motion.div>
                )}
                {status === "active" && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 rounded-full border-2"
                    style={{ borderColor: "#C1440E", borderTopColor: "transparent" }}
                  />
                )}
                {status === "pending" && (
                  <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: "rgba(193,68,14,0.12)" }} />
                )}
              </div>

              <span
                className="text-sm font-medium"
                style={{
                  color: status === "active" ? "#1C1917"
                    : status === "done" ? "#9C8F85"
                    : "#C8BFB5",
                }}
              >
                {s.label}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(193,68,14,0.10)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #C1440E, #E8603C)" }}
            animate={{ width: `${dp}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
        <p className="text-xs text-center mt-2 font-medium" style={{ color: "#9C8F85" }}>
          {dp}%
        </p>
      </div>
    </motion.div>
  );
}
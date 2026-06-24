import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function MergeLoadingOverlay({ text = "Loading...", progress = null, estimate = null }) {
  const [simulated, setSimulated] = useState(0);

  useEffect(() => {
    if (progress !== null) return;
    setSimulated(0);
    const interval = setInterval(() => {
      setSimulated((prev) => {
        if (prev >= 90) return prev;
        const remaining = 90 - prev;
        return prev + remaining * 0.04;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [progress]);

  const displayProgress = progress !== null ? progress : Math.round(simulated);

  return (
    <div
      className="absolute inset-0 flex flex-col justify-center items-center z-50 pointer-events-auto p-4"
      style={{ background: "rgba(45,34,53,0.6)", backdropFilter: "blur(8px)" }}
    >
      <div className="text-white text-center text-xl font-bold max-w-xs leading-relaxed mb-2 font-figtree">
        {text}
      </div>

      {estimate && (
        <div className="text-center text-sm font-medium mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
          Estimated time: {estimate}
        </div>
      )}

      <div className="w-64">
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--gradient-brand)" }}
            initial={{ width: 0 }}
            animate={{ width: `${displayProgress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <p className="text-sm text-center mt-2 font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
          {displayProgress}%
        </p>
      </div>
    </div>
  );
}

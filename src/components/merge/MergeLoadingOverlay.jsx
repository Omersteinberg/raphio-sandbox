import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function MergeLoadingOverlay({ text = "Loading...", progress = null }) {
  // Simulated progress when no real progress is provided
  const [simulated, setSimulated] = useState(0);

  useEffect(() => {
    if (progress !== null) return;
    setSimulated(0);
    // Fast at first, then slows down as it approaches 90%
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
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col justify-center items-center z-50 pointer-events-auto p-4">
      <div className="text-white text-center text-xl font-semibold max-w-xs leading-relaxed mb-4">
        {text}
      </div>

      <div className="w-64">
        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-purple-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${displayProgress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <p className="text-white/70 text-sm text-center mt-2">{displayProgress}%</p>
      </div>
    </div>
  );
}

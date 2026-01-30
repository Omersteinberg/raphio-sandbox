import React from "react";
import { motion } from "framer-motion";

export default function MergeLoadingOverlay({ text = "Loading..." }) {
  const blockVariants = {
    animate: {
      x: [-100, 100, -100],
      transition: {
        x: {
          repeat: Infinity,
          repeatType: "loop",
          duration: 2,
          ease: "easeInOut",
        },
      },
    },
  };

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col justify-center items-center z-50 pointer-events-auto p-4">
      <motion.div
        className="w-12 h-4 bg-purple-500 rounded-sm mb-6"
        variants={blockVariants}
        animate="animate"
      />

      <div
        className="text-white text-center text-xl font-semibold max-w-xs leading-relaxed"
      >
        {text}
      </div>
    </div>
  );
}

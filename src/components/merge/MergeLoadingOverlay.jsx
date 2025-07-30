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
    <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col justify-center items-center z-50 pointer-events-auto p-4">
      <motion.div
        className="w-12 h-4 bg-white rounded-sm mb-6"
        variants={blockVariants}
        animate="animate"
      />

      <div
        className="text-primary text-center text-2xl font-bold max-w-xs leading-relaxed"
      >
        {text}
      </div>
    </div>
  );
}

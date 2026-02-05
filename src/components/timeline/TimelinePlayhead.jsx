import { motion } from "framer-motion";

export default function TimelinePlayhead({ position, pixelsPerSecond, height }) {
  const x = position * pixelsPerSecond + 80; // 80px offset for track label

  return (
    <div
      className="absolute top-0 z-30 pointer-events-none"
      style={{
        left: x,
        height,
      }}
    >
      {/* Playhead line */}
      <div className="w-0.5 h-full bg-red-500" />

      {/* Playhead handle */}
      <div
        className="absolute -top-0 -left-2 w-4 h-4 pointer-events-auto cursor-ew-resize"
        style={{
          clipPath: "polygon(50% 100%, 0 0, 100% 0)",
          background: "#ef4444",
        }}
      />
    </div>
  );
}

import { motion } from "framer-motion";
import { Type } from "lucide-react";

// Text-overlay block for the TEXT track row. Deliberately NOT TimelineItem:
// that component always wires a move handle (onDragStart) and a double-click
// edit handle, and gates trim handles only on isSelected - reusing it here
// would prematurely wire drag/trim/edit interactions the overlay track isn't
// ready for yet (Phase 1 scope: selection is a visual no-op). This mirrors
// only TimelineItem's positioning math and resting/selected visual shell.
export default function TimelineOverlayItem({ item, height, pixelsPerSecond, isSelected, onSelect }) {
  const left = item.startTime * pixelsPerSecond;
  const width = Math.max(item.duration * pixelsPerSecond, 20);

  // Emerald - the one hue not already claimed by VIDEO (neutral ink),
  // Narration (blue), or Audio/Music (purple).
  const bgColor = isSelected ? "bg-emerald-500/90" : "bg-emerald-400/75";
  const selectionRing = isSelected
    ? "0 0 0 1px hsl(var(--primary-foreground)), 0 0 0 3px rgb(var(--terra-rgb))"
    : undefined;
  const restingShadow = "0 1px 2px rgb(var(--ink-rgb) / 0.16), 0 1px 4px rgb(var(--ink-rgb) / 0.10)";

  return (
    <motion.div
      data-overlay-id={item.id}
      className={`absolute top-2 rounded-lg ${bgColor} border-2 border-transparent cursor-pointer overflow-hidden`}
      animate={{ left, width }}
      transition={{ type: "spring", stiffness: 500, damping: 32 }}
      style={{ height, boxShadow: [selectionRing, restingShadow].filter(Boolean).join(", ") }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      whileHover={{ scale: 1.01 }}
    >
      <div className="absolute inset-0 flex items-center gap-1.5 min-w-0 px-1.5">
        <Type className="w-3 h-3 flex-shrink-0 text-white/80 drop-shadow" />
        <span className="text-xs font-medium text-white truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          {item.overlay.text}
        </span>
      </div>
    </motion.div>
  );
}

import { useRef, useLayoutEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gauge, Volume2 } from "lucide-react";

const MARGIN = 8; // gap kept between the pill and the clip / viewport edge

/**
 * Floating action pill for the selected timeline clip - replaces the old
 * persistent right-hand ClipDetailsPanel. Positioned with `position: fixed`
 * from the selected clip's own on-screen rect (passed in as `anchorRect`,
 * computed by TimelineEditor from the clip's DOM node), so it tracks the
 * clip through scrolling/zooming without being clipped by the timeline's
 * `overflow-hidden` ancestors. Prefers sitting above the clip; flips below
 * when there isn't room, and clamps horizontally so it never runs off
 * either edge of the viewport.
 */
export default function ClipActionPill({ anchorRect, actions, onSpeed, onVolume, isAudioClip }) {
  const pillRef = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!anchorRect || !pillRef.current) return;
    const rect = pillRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const placeBelow = anchorRect.top - rect.height - MARGIN < 0;
    const top = placeBelow
      ? Math.min(anchorRect.top + anchorRect.height + MARGIN, vh - rect.height - MARGIN)
      : anchorRect.top - rect.height - MARGIN;

    let left = anchorRect.left + anchorRect.width / 2 - rect.width / 2;
    left = Math.max(MARGIN, Math.min(left, vw - rect.width - MARGIN));

    setPos({ top, left });
  }, [anchorRect]);

  return (
    <AnimatePresence>
      {anchorRect && (
        <motion.div
          ref={pillRef}
          className="fixed z-[60] flex items-center gap-0.5 bg-card border border-border rounded-xl shadow-lg p-1"
          style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? "visible" : "hidden" }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onSpeed}
            title="Speed"
            className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-foreground hover:bg-muted"
          >
            <Gauge className="w-4 h-4" />
            Speed
          </button>
          {isAudioClip && (
            <button
              onClick={onVolume}
              title="Volume"
              className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-foreground hover:bg-muted"
            >
              <Volume2 className="w-4 h-4" />
              Volume
            </button>
          )}
          {actions.map(({ Icon, label, onClick, danger }) => (
            <button
              key={label}
              onClick={onClick}
              title={label}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium ${
                danger ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Type } from "lucide-react";
import { PIXELS_PER_SECOND_BASE } from "@/hooks/timeline/useTimeline";

// Text-overlay block for the TEXT track row. Deliberately NOT TimelineItem:
// that component always wires a move handle (onDragStart) and a double-click
// edit handle, and gates trim handles only on isSelected - reusing it here
// would prematurely wire drag/trim/edit interactions the overlay track isn't
// ready for yet (Phase 1 scope: selection is a visual no-op). This mirrors
// only TimelineItem's positioning math and resting/selected visual shell.

// Baseline px of horizontal drag per percentage point of widthPercent, AT
// zoomLevel 1 (pixelsPerSecond === PIXELS_PER_SECOND_BASE). widthPercent
// itself still has no natural geometric mapping to this block's own
// on-screen width (that stays TEMPORAL - inSeconds..outSeconds *
// pixelsPerSecond - while widthPercent is SPATIAL, how wide the text box
// renders on the export canvas; see the module-level comment history), so
// this base rate is still a direct-manipulation choice, not a computed
// conversion. What IS deliberate now: SENSITIVITY scales with zoom exactly
// like every other drag on this timeline (TimelineCanvas's trim/move handlers
// divide pixel delta by the live `pixelsPerSecond`, e.g. `deltaTime =
// dragOffset / pixelsPerSecond`) - dragging the same physical distance
// zoomed in (more px/sec) now changes widthPercent LESS, and zoomed out
// (fewer px/sec) changes it MORE, matching that established feel instead of
// staying a flat px-to-percent ratio regardless of zoom.
const PX_PER_PERCENT_BASE = 3;
const WIDTH_PERCENT_MIN = 5;
const WIDTH_PERCENT_MAX = 100;

export default function TimelineOverlayItem({ item, height, pixelsPerSecond, isSelected, onSelect, onResize }) {
  const left = item.startTime * pixelsPerSecond;
  const width = Math.max(item.duration * pixelsPerSecond, 20);

  // Emerald - the one hue not already claimed by VIDEO (neutral ink),
  // Narration (blue), or Audio/Music (purple).
  const bgColor = isSelected ? "bg-emerald-500/90" : "bg-emerald-400/75";
  const selectionRing = isSelected
    ? "0 0 0 1px hsl(var(--primary-foreground)), 0 0 0 3px rgb(var(--terra-rgb))"
    : undefined;
  const restingShadow = "0 1px 2px rgb(var(--ink-rgb) / 0.16), 0 1px 4px rgb(var(--ink-rgb) / 0.10)";

  // Drag-to-resize (widthPercent, not the block's own time span - see
  // PX_PER_PERCENT above). Local-only draft during the drag, same
  // draft-then-commit-on-release convention TimelineItem's trim handles and
  // ClipActionPill's sliders already use; the badge is the only live
  // feedback since widthPercent has no visible effect on this block itself.
  //
  // Pointer Events + setPointerCapture, not mouse+touch listener pairs: a
  // drag that ENDS outside this block (dragging the left handle further
  // left, past the block's own edge) still needs its release to be treated
  // as "this handle's gesture," not as a click on whatever happens to be
  // under the cursor at that point. Without capture, that stray click was
  // reaching the Tracks Container's deselect-on-click handler (TimelineCanvas)
  // a tick after the resize committed, wiping the selection out from under
  // it. Pointer capture retargets the release (and the click it synthesizes)
  // back to the capturing element, so it bubbles through THIS block's own
  // onClick (which already stopPropagates) instead.
  const dragRef = useRef(null); // { side: 'left' | 'right', startX, startWidthPercent }
  const [resizeDraft, setResizeDraft] = useState(null); // widthPercent while actively dragging

  const startResize = useCallback(
    (side, e) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = { side, startX: e.clientX, startWidthPercent: item.overlay.widthPercent };
      setResizeDraft(item.overlay.widthPercent);
    },
    [item.overlay.widthPercent]
  );

  const moveResize = useCallback(
    (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      // Zoom-scaled sensitivity, same pattern TimelineCanvas's own trim/move
      // handlers use (dividing a pixel delta by the live pixelsPerSecond) -
      // pixelsPerSecond / PIXELS_PER_SECOND_BASE is exactly zoomLevel, so at
      // 2x zoom this doubles px-per-percent (half the widthPercent change for
      // the same physical drag) and at 0.5x zoom it halves it (double the
      // change).
      const pxPerPercent = PX_PER_PERCENT_BASE * (pixelsPerSecond / PIXELS_PER_SECOND_BASE);
      // Both handles grow the box when dragged AWAY from center (left handle
      // left, right handle right) - the usual "drag the edge outward to grow"
      // affordance.
      const rawDelta = (e.clientX - drag.startX) / pxPerPercent;
      const signedDelta = drag.side === "left" ? -rawDelta : rawDelta;
      const next = Math.max(WIDTH_PERCENT_MIN, Math.min(WIDTH_PERCENT_MAX, drag.startWidthPercent + signedDelta));
      setResizeDraft(next);
    },
    [pixelsPerSecond]
  );

  const endResize = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setResizeDraft((current) => {
      if (current != null) onResize?.(current);
      return null;
    });
  }, [onResize]);

  return (
    <motion.div
      data-overlay-id={item.id}
      className={`absolute top-2 rounded-lg ${bgColor} border-2 border-transparent cursor-pointer overflow-hidden group`}
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

      {/* Resize handles - update widthPercent (the overlay's spatial width on
          the export canvas), NOT this block's own time span. Shown when
          selected, same visual language as TimelineItem's trim handles. */}
      {isSelected && (
        <>
          <div
            className="absolute left-0 top-0 bottom-0 w-6 z-20 flex items-center justify-start cursor-ew-resize touch-none"
            onPointerDown={(e) => { e.stopPropagation(); startResize("left", e); }}
            onPointerMove={moveResize}
            onPointerUp={endResize}
            onPointerCancel={endResize}
          >
            <div className="h-full w-1 bg-ink-warm group-hover:w-1.5 transition-all" />
          </div>
          <div
            className="absolute right-0 top-0 bottom-0 w-6 z-20 flex items-center justify-end cursor-ew-resize touch-none"
            onPointerDown={(e) => { e.stopPropagation(); startResize("right", e); }}
            onPointerMove={moveResize}
            onPointerUp={endResize}
            onPointerCancel={endResize}
          >
            <div className="h-full w-1 bg-ink-warm group-hover:w-1.5 transition-all" />
          </div>

          {/* Live widthPercent readout while dragging - the block's own
              width can't visually represent this (it's temporal), so this
              badge is the only feedback during the gesture. */}
          {resizeDraft != null && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-ink-warm text-white text-[11px] font-medium whitespace-nowrap shadow-sm pointer-events-none">
              {Math.round(resizeDraft)}% width
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

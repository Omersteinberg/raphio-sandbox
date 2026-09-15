import { useCallback, useEffect, useState } from "react";
import { TRACK_LABEL_WIDTH } from "@/lib/timelineLayout";

export default function TimelinePlayhead({ position, pixelsPerSecond, height, onSeek }) {
  const x = position * pixelsPerSecond + TRACK_LABEL_WIDTH;
  const [isDragging, setIsDragging] = useState(false);

  const handleDown = useCallback((e) => {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleMove = useCallback(
    (e) => {
      if (!isDragging || !onSeek) return;
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      if (clientX == null) return;
      if (e.cancelable) e.preventDefault(); // stop the timeline scrolling while scrubbing
      // Find the timeline container to calculate position relative to it
      const container = document.querySelector("[data-timeline-container]");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const scrollLeft = container.scrollLeft;
      const x = clientX - rect.left + scrollLeft - TRACK_LABEL_WIDTH;
      const time = Math.max(0, x / pixelsPerSecond);
      onSeek(time);
    },
    [isDragging, onSeek, pixelsPerSecond]
  );

  const handleUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
      window.addEventListener("touchmove", handleMove, { passive: false });
      window.addEventListener("touchend", handleUp);
      window.addEventListener("touchcancel", handleUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
      window.removeEventListener("touchcancel", handleUp);
    };
  }, [isDragging, handleMove, handleUp]);

  return (
    <div
      className="absolute top-0 z-30 pointer-events-none"
      style={{
        left: x,
        height,
      }}
    >
      {/* Playhead line - stays a thin, flat vertical line through the track
          body (unchanged). */}
      <div className="w-0.5 h-full bg-primary" />

      {/* Playhead head - a flagged marker (flat/rounded top, tapering to a
          point) rather than a bare triangle, so it reads as a distinct,
          grabbable control rather than a sliver. Larger invisible touch
          target than what's drawn, same pattern as the trim handles.
          Depth comes from a warm-tinted drop shadow (terracotta + ink, per
          DESIGN.md's Warm Shadow Rule - never a neutral/plain shadow) plus a
          thin inset top highlight for a touch of dimensionality - shadow-sm
          alone read as flat/plain against the rest of the redesigned chrome.
          Nudged up 4px further (-top-2, was -top-1) so it overlaps the
          ruler's bottom edge slightly, visibly anchoring the line to the
          ruler above it rather than starting to feel like it floats. */}
      <div
        className="absolute -top-2 -left-4 w-8 h-8 pointer-events-auto cursor-ew-resize flex justify-center touch-none"
        onMouseDown={handleDown}
        onTouchStart={handleDown}
      >
        <div
          className="w-5 h-5 rounded-t-[4px]"
          style={{
            clipPath: "polygon(0% 0%, 100% 0%, 100% 55%, 50% 100%, 0% 55%)",
            background: "hsl(var(--primary))",
            boxShadow:
              "0 2px 5px rgb(var(--terra-rgb) / 0.35), 0 1px 3px rgb(var(--ink-warm-rgb) / 0.25), inset 0 1px 0 rgba(255,255,255,0.3)",
          }}
        />
      </div>
    </div>
  );
}

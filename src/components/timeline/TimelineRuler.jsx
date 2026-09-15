import { useMemo } from "react";

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, "0")}.${ms}`;
}

export default function TimelineRuler({ duration, pixelsPerSecond, width }) {
  // Calculate tick interval based on zoom level
  const tickInterval = useMemo(() => {
    if (pixelsPerSecond >= 200) return 0.5;
    if (pixelsPerSecond >= 100) return 1;
    if (pixelsPerSecond >= 50) return 2;
    if (pixelsPerSecond >= 25) return 5;
    return 10;
  }, [pixelsPerSecond]);

  // Generate ticks
  const ticks = useMemo(() => {
    const result = [];
    const majorInterval = tickInterval * 5;

    for (let t = 0; t <= duration + tickInterval; t += tickInterval) {
      const isMajor = t % majorInterval < 0.001 || Math.abs(t % majorInterval - majorInterval) < 0.001;
      result.push({
        time: t,
        x: t * pixelsPerSecond,
        isMajor,
        label: isMajor ? formatTime(t) : null,
      });
    }

    return result;
  }, [duration, tickInterval, pixelsPerSecond]);

  return (
    <div
      // No border-b any more - that separator moved up to sit between the
      // toolbar and this ruler instead (TimelineEditor.jsx's transport
      // strip), per feedback that the separators were on the wrong seams:
      // there was a hairline here (ruler/tracks) and none between the
      // toolbar and the ruler. Ruler and track body now read as one
      // uninterrupted surface.
      className="relative h-8 select-none cursor-pointer"
      style={{ width }}
    >
      {/* Track label area - width mirrors TimelineTrack's label column
          (TRACK_LABEL_WIDTH in TimelineCanvas, w-32/128px) so it lines up
          exactly. No fill of its own (the ruler row is already bg-card) -
          just the same hairline border-r the track labels use below it, so
          the whole left edge reads as one continuous seam rather than a
          stack of separately-boxed corners. */}
      <div className="absolute left-0 top-0 w-32 h-full border-r border-border/60" />

      {/* Ticks area - major timestamps read clearly (full-contrast, bolder,
          taller); minor ticks are visible but clearly secondary. Was
          bg-border/40 - the --border token itself is a very light
          warm-terracotta hairline, so at 40% against the cream ruler it read
          as not visible at all rather than "subtle." Switched to
          bg-foreground/25, a color with actual presence against this
          background even at low opacity. */}
      <div className="absolute left-32 top-0 h-full">
        {ticks.map((tick, i) => (
          <div
            key={i}
            className="absolute top-0 h-full"
            style={{ left: tick.x }}
          >
            {/* Tick line */}
            <div
              className={`absolute bottom-0 w-px ${
                tick.isMajor ? "bg-foreground/70 h-4" : "bg-foreground/25 h-2"
              }`}
            />
            {/* Label */}
            {tick.label && (
              <span
                className="absolute bottom-4 text-xs font-semibold text-foreground -translate-x-1/2"
                style={{ left: 0 }}
              >
                {tick.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

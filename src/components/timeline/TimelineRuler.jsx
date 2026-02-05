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
      className="relative h-8 select-none cursor-pointer"
      style={{ width }}
    >
      {/* Track label area */}
      <div className="absolute left-0 top-0 w-20 h-full bg-gray-800 border-r border-gray-700 flex items-center justify-center">
        <span className="text-xs text-gray-400">Time</span>
      </div>

      {/* Ticks area */}
      <div className="absolute left-20 top-0 h-full">
        {ticks.map((tick, i) => (
          <div
            key={i}
            className="absolute top-0 h-full"
            style={{ left: tick.x }}
          >
            {/* Tick line */}
            <div
              className={`absolute bottom-0 w-px ${
                tick.isMajor ? "bg-gray-500 h-4" : "bg-gray-600 h-2"
              }`}
            />
            {/* Label */}
            {tick.label && (
              <span
                className="absolute bottom-4 text-xs text-gray-400 -translate-x-1/2"
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

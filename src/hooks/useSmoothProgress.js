import { useEffect, useRef, useState } from "react";

// Time-based progress for long generation waits: ramps linearly 0 -> `ceil`
// over `rampMs`, holds there, then eases to 100% once `done`. Monotonic, never
// snaps 90 -> 100. The clock starts the first time `active` is true. Returns 0-100.
export default function useSmoothProgress({
  done = false,
  active = true,
  rampMs = 10 * 60 * 1000,
  ceil = 90,
  finishMs = 1800,
} = {}) {
  const [progress, setProgress] = useState(0);
  const startRef = useRef(null);
  const displayedRef = useRef(0);
  const doneAtRef = useRef(null);
  const doneFromRef = useRef(0);

  const doneRef = useRef(done);
  doneRef.current = done;
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      if (startRef.current == null) {
        if (!activeRef.current) return;
        startRef.current = now;
      }

      let next;
      if (doneRef.current) {
        if (doneAtRef.current == null) {
          doneAtRef.current = now;
          doneFromRef.current = displayedRef.current;
        }
        const t = Math.min((now - doneAtRef.current) / finishMs, 1);
        next = doneFromRef.current + (100 - doneFromRef.current) * (1 - Math.pow(1 - t, 2));
      } else {
        const t = Math.min((now - startRef.current) / rampMs, 1);
        next = ceil * t;
      }

      if (next < displayedRef.current) next = displayedRef.current;
      displayedRef.current = next;
      const shown = Math.round(next);
      setProgress((prev) => (prev === shown ? prev : shown));
    };

    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [rampMs, ceil, finishMs]);

  return progress;
}

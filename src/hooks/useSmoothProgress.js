import { useEffect, useRef, useState } from "react";

// Progress for long generation waits, anchored to real backend state.
//
// `target` is where the run actually is (see progressFromTasks); `ceiling` is
// where it would be if the row currently running advanced one increment. The bar
// snaps forward whenever `target` rises, and between those rises it creeps from
// the anchor partway toward `ceiling` so it never sits frozen. Once `done` it
// eases to 100.
//
// There is deliberately no mount-time clock: the displayed value is a function of
// `target`, so a run resumed hours later shows what has really happened instead of
// animating up from 0. Monotonic within a mount. Returns 0-100.
export default function useSmoothProgress({
  target = 0,
  ceiling = 100,
  done = false,
  active = true,
  creepMs = 2 * 60 * 1000,
  creepFraction = 0.5,
  finishMs = 1800,
} = {}) {
  // Seeded from `target`, not 0: the effect's first tick only runs after paint, so
  // a zero seed would flash 0% at someone resuming a run that is already 60% done.
  const seed = Number.isFinite(target) ? Math.min(Math.max(target, 0), 99) : 0;
  const [progress, setProgress] = useState(() => Math.round(seed));
  const displayedRef = useRef(seed);
  // The last real target we saw, and when we saw it. The creep grows from here.
  const anchorRef = useRef(null);
  const doneAtRef = useRef(null);
  const doneFromRef = useRef(0);

  const targetRef = useRef(target);
  targetRef.current = target;
  const ceilingRef = useRef(ceiling);
  ceilingRef.current = ceiling;
  const doneRef = useRef(done);
  doneRef.current = done;
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      let next;

      if (doneRef.current) {
        if (doneAtRef.current == null) {
          doneAtRef.current = now;
          doneFromRef.current = displayedRef.current;
        }
        const t = Math.min((now - doneAtRef.current) / finishMs, 1);
        next = doneFromRef.current + (100 - doneFromRef.current) * (1 - Math.pow(1 - t, 2));
      } else {
        // Inactive, or the session hasn't loaded yet: hold, don't invent motion.
        if (!activeRef.current || targetRef.current == null) return;
        doneAtRef.current = null;

        const anchor = anchorRef.current;
        // A meaningful backward move of durable state means the run restarted
        // (a retry sends the video rows back to pending). Snap down with it -
        // holding the old high-water mark would park the bar at 90% while the
        // clips render from scratch. The 1-point deadband ignores poll jitter.
        const restarted = anchor != null && targetRef.current < anchor.value - 1;
        if (restarted) displayedRef.current = targetRef.current;

        if (anchor == null || restarted || targetRef.current > anchor.value) {
          anchorRef.current = { value: targetRef.current, at: now };
        }
        const { value, at } = anchorRef.current;
        const gap = Math.max(0, (ceilingRef.current ?? 100) - value);
        const t = Math.min((now - at) / creepMs, 1);
        const eased = 1 - Math.pow(1 - t, 2);
        // Capped below 100 so only `done` can complete the bar.
        next = Math.min(value + gap * creepFraction * eased, 99);
      }

      if (next < displayedRef.current) next = displayedRef.current;
      displayedRef.current = next;
      const shown = Math.round(next);
      setProgress((prev) => (prev === shown ? prev : shown));
    };

    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [creepMs, creepFraction, finishMs]);

  return progress;
}

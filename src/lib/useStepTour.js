import { useEffect, useRef } from "react";
import { tourSeen, markTourSeen, clearTourSeen } from "./tourState";

// Owns the "auto-run once, replay on demand" lifecycle every product tour
// shares (previously copy-pasted in PromptStep, TimelineEditor and
// MyVideosPage). `start(isMobile)` must return the driver.js instance (all
// tour modules return runTour(...)), so we can destroy a popover that is
// still open when the step unmounts, e.g. when an auto-approve preference
// advances the wizard mid-tour.
//
// `enabled` gates the auto-run and is truthy-tested. It is also an effect
// dependency on purpose: pass a CHANGING value (like a selected-clip id) when
// a re-armed tour should be able to fire again on the next trigger.
export function useStepTour(key, start, { enabled = true, delay = 350, isMobile } = {}) {
  const firedRef = useRef(false); // once per mount, regardless of seen-state
  const instanceRef = useRef(null);
  const startRef = useRef(start);
  startRef.current = start;
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;

  useEffect(() => {
    if (firedRef.current || !enabled) return;
    firedRef.current = true;
    if (tourSeen(key)) return; // already seen; only replay() shows it again
    const id = window.setTimeout(() => {
      // Wait a frame-ish so the [data-tour] anchors are painted before
      // driver.js measures them (same reasoning as the old inline effects).
      instanceRef.current = startRef.current(resolveIsMobile(isMobileRef.current)) || null;
      markTourSeen(key);
    }, delay);
    return () => window.clearTimeout(id);
  }, [enabled, key, delay]);

  // Unmount: tear down an open popover so it can't outlive its anchors.
  useEffect(() => () => instanceRef.current?.destroy?.(), []);

  // Help-button path: run now, ignoring the seen-guard.
  const replay = () => {
    instanceRef.current = startRef.current(resolveIsMobile(isMobileRef.current)) || null;
  };

  // Allow the auto-run to happen again the next time `enabled` (re)triggers
  // (TimelineEditor re-arms the clip tour from its "How to use" button).
  const rearm = () => {
    firedRef.current = false;
    clearTourSeen(key);
  };

  return { replay, rearm };
}

function resolveIsMobile(v) {
  return typeof v === "boolean" ? v : window.innerWidth < 768;
}

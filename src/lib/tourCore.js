import { driver } from "driver.js";
import "driver.js/dist/driver.css";

// Shared driver.js setup for every interactive product tour (the timeline editor
// and the creation screen). Individual tour modules import `runTour` and pass
// their own steps, so they all get the same warm-dark overlay, progress bar and
// `raphio-tour` styling (see the .driver-popover.raphio-tour rules in index.css).

export const DRIVER_OPTS = {
  showProgress: true,
  allowClose: true,
  overlayColor: "#1C1917", // matches the app's warm-dark ink
  popoverClass: "raphio-tour",
  nextBtnText: "Next",
  prevBtnText: "Back",
  doneBtnText: "Got it",
};

// Drop steps whose anchor isn't on screen, then run the tour. Returns the driver
// instance (or null if nothing to show), so hidden/absent targets never produce
// a broken highlight.
export function runTour(steps) {
  const present = steps.filter((s) => !s.element || document.querySelector(s.element));
  if (!present.length) return null;
  const d = driver({ ...DRIVER_OPTS, steps: present });
  d.drive();
  return d;
}

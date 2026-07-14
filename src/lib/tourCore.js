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

// The one tour that is on screen right now, if any. driver.js renders its overlay
// at a z-index far above our modals and leaves the highlighted element clickable -
// and every tour's last step highlights the help FAB and invites a click on it. So
// a tour that is still running would otherwise stack a second overlay on itself, or
// bury the help menu underneath its own overlay. Both are fixed by tearing the live
// tour down first (see destroyActiveTour, called from HelpFab).
let activeTour = null;

// Drop steps whose anchor isn't on screen, then run the tour. Returns the driver
// instance (or null if nothing to show), so hidden/absent targets never produce
// a broken highlight.
export function runTour(steps) {
  const present = steps.filter((s) => !s.element || document.querySelector(s.element));
  if (!present.length) return null;
  destroyActiveTour();
  activeTour = driver({
    ...DRIVER_OPTS,
    steps: present,
    onDestroyed: () => {
      activeTour = null;
    },
  });
  activeTour.drive();
  return activeTour;
}

export function destroyActiveTour() {
  // destroy() fires onDestroyed, which nulls the ref; the assignment guards the
  // case where driver.js has already torn itself down.
  if (activeTour?.isActive?.()) activeTour.destroy();
  activeTour = null;
}

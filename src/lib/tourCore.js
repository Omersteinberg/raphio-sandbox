import { driver } from "driver.js";
import "driver.js/dist/driver.css";

// Shared driver.js setup for every interactive product tour (the timeline editor
// and the creation screen). Individual tour modules import `runTour` and pass
// their own steps, so they all get the same warm-dark overlay, progress bar and
// `raphio-tour` styling (see the .driver-popover.raphio-tour rules in index.css).

// `allowScroll: false` only ever locks <body> (driver.js's own "driver-no-scroll"
// class), but every wizard step (PromptStep, ReferenceLockStep,
// FrameGenerationStep, ScriptStep's script-sections panel, MyVideosPage via
// AppLayout) scrolls inside its OWN nested `overflow-y-auto` container, not
// <body> - confirmed live: <body> has driver-no-scroll + overflow:hidden, but
// scrollHeight === clientHeight, so locking it is a no-op, while the real
// container two levels down still scrolls freely and drags the (fixed)
// popover along with it as it repositions to track its target.
//
// Fix: find whichever ancestor (or the target itself, e.g. ScriptStep's
// script-sections div, which IS the scrollable element) is the actual scroll
// container at runtime, and lock that specifically. Runtime lookup instead of
// per-component selectors so this keeps working if a step's markup changes.

const SCROLL_LOCK_CLASS = "driver-scroll-lock-target";
let lockedScrollContainer = null;

function isScrollable(el) {
  const style = getComputedStyle(el);
  return (
    (style.overflowY === "auto" || style.overflowY === "scroll") &&
    el.scrollHeight > el.clientHeight
  );
}

// Walk from the element itself (some anchors, like ScriptStep's
// script-sections div, ARE the scroll container) up through ancestors,
// stopping at <body> - <body>'s own scroll is already handled by
// allowScroll: false, so there's no need to duplicate that here.
function findScrollContainer(el) {
  let node = el;
  while (node && node !== document.body && node !== document.documentElement) {
    if (isScrollable(node)) return node;
    node = node.parentElement;
  }
  return null;
}

// Exported so myVideosTour.js (which drives its own driver() instance
// directly, for onNextClick/onPrevClick drawer hooks that runTour() doesn't
// expose) can wire the identical lock into its own DRIVER_OPTS.
export function lockScrollContainerFor(element) {
  if (!element) return;
  const container = findScrollContainer(element);
  if (container) {
    lockedScrollContainer = container;
    container.classList.add(SCROLL_LOCK_CLASS);
  }
}

export function unlockScrollContainer() {
  lockedScrollContainer?.classList.remove(SCROLL_LOCK_CLASS);
  lockedScrollContainer = null;
}

export const DRIVER_OPTS = {
  showProgress: true,
  allowClose: true,
  // Lock <body> for pages where it genuinely is the scroll container. Kept
  // alongside the per-step nested-container lock below rather than replaced
  // by it, since some simpler screens may have no nested wrapper at all.
  allowScroll: false,
  // onDeselected fires for the PREVIOUS element - including on destroy() /
  // early dismissal, confirmed in driver.js's source - so it's the single
  // place that reliably unlocks whatever the last step locked. It fires
  // before onHighlightStarted for the next element, and both fire before
  // driver.js's own scrollIntoView call, so scrollIntoView still runs against
  // the newly-locked container exactly as before (overflow: hidden blocks
  // user-driven wheel/touch scroll, not a script-driven scrollIntoView/
  // scrollTop write).
  onDeselected: () => unlockScrollContainer(),
  onHighlightStarted: (element) => lockScrollContainerFor(element),
  overlayColor: "var(--ink-warm)", // matches the app's warm-dark ink
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
      // Safety net alongside onDeselected's own cleanup - never leave a
      // container locked if the tour is torn down some other way.
      unlockScrollContainer();
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

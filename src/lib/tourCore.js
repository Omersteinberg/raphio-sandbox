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

// Scrolls the page's real scroll container to the top, via the same
// findScrollContainer lookup the lock above uses - window.scrollTo is a
// no-op here since AppLayout's nested `overflow-auto` div is what actually
// scrolls, not <body>/<html> (see the file-level comment). Used by a tour's
// first step (e.g. the mode-tabs step) so the tour always starts from a
// consistent scroll position regardless of where the page was scrolled to
// when the tour launched. Exported for individual tour modules to call from
// a per-step onHighlightStarted - driver.js uses a step's own
// onHighlightStarted INSTEAD of the config-level one above when both are
// present, so a step that needs this must also call lockScrollContainerFor
// itself to keep that behavior.
export function scrollTourToTop(element) {
  const container = element && findScrollContainer(element);
  (container || document.scrollingElement || document.documentElement).scrollTop = 0;
}

// Aligns a highlighted element to the TOP of the viewport, replacing
// driver.js's own default (centered, unless the element is itself taller
// than the viewport - see its internal scrollIntoView call, which only
// uses block: "start" in that one case). Wired into the shared
// onHighlightStarted below, so every step of every tour uses this same
// alignment, forward AND backward: driver.js re-fires onHighlightStarted
// (and re-runs its own scrollIntoView) on Back exactly the same as on Next,
// so Back re-aligns to the previous step's section the same way Next
// scrolled down to it - no separate handling needed for either direction.
// behavior: "auto" (not "smooth") is deliberate: it resolves synchronously,
// so by the time driver.js runs its own scrollIntoView immediately after
// this hook returns, the element is already fully in view and driver.js's
// internal visibility check (isElementVisible) skips its own scroll
// entirely - one scroll happens, not two fighting each other.
export function alignElementToTop(element) {
  element?.scrollIntoView({ block: "start", inline: "nearest", behavior: "auto" });
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
  onHighlightStarted: (element) => {
    alignElementToTop(element);
    lockScrollContainerFor(element);
  },
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

  // Reset to a known scroll position before the first popover appears,
  // regardless of where the page was scrolled to when the tour was
  // launched - both the first-visit auto-run and a manual "Take the tour"
  // replay go through this one function, so this covers both without
  // either caller needing its own scroll-to-top step. alignElementToTop
  // (via onHighlightStarted below) takes over from here for this and
  // every subsequent step.
  const firstElement = typeof present[0].element === "string" ? document.querySelector(present[0].element) : null;
  scrollTourToTop(firstElement);

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

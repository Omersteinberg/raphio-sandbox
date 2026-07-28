import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { lockScrollContainerFor, unlockScrollContainer } from "./tourCore";

// Interactive onboarding tour for the My Videos page + the app header nav,
// for users who just signed up. Built on driver.js (same styling as the editor
// tour in editorTour.js).
//
// Desktop and mobile differ: on desktop the nav (Create / My Videos / credits /
// account) is visible in the top bar, so we highlight it directly. On mobile it
// lives behind the hamburger DRAWER, so the tour opens the drawer, walks through
// its items, and closes it again when finished.
//
// Anchors: `[data-tour="..."]` on AppHeader.jsx (nav-*, drawer-*, nav-menu,
// drawer-close) and MyVideosPage.jsx (mv-new, mv-tabs).

const DRIVER_OPTS = {
  showProgress: true,
  allowClose: true,
  // Kept in sync with tourCore.js's DRIVER_OPTS - this file drives its own
  // driver() instance directly (it needs onNextClick/onPrevClick hooks to
  // open/close the mobile nav drawer between steps) instead of going through
  // runTour(), so it doesn't inherit that shared config automatically.
  allowScroll: false,
  // MyVideosPage itself has no scroll wrapper of its own - it scrolls via
  // AppLayout's shared `flex-1 overflow-auto` shell, which allowScroll:false
  // (body-only) doesn't reach. Same runtime lock as tourCore.js, reused here
  // rather than duplicated since the nav/drawer steps sit in a different DOM
  // subtree (AppHeader) than the page steps (MyVideosPage), so the "right"
  // container genuinely differs step to step.
  onDeselected: () => unlockScrollContainer(),
  onHighlightStarted: (element) => lockScrollContainerFor(element),
  overlayColor: "#1C1917", // matches the app's warm-dark ink
  popoverClass: "raphio-tour",
  nextBtnText: "Next",
  prevBtnText: "Back",
  doneBtnText: "Got it",
};

const q = (sel) => document.querySelector(sel);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Desktop: everything is already on screen, so drop any absent anchor and go.
function startDesktopTour() {
  const steps = [
    {
      element: '[data-tour="mv-new"]',
      popover: {
        title: "Start a new video",
        description: "Click here anytime to begin creating a new video.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: '[data-tour="mv-tabs"]',
      popover: {
        title: "Finished & in progress",
        description: "Switch between your completed videos and ones you're still working on.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="nav-create"]',
      popover: {
        title: "Create",
        description: "Jump into making a new video from the top nav.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="nav-videos"]',
      popover: {
        title: "My Videos",
        description: "Your whole video library lives here, and you're on it right now.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="nav-credits"]',
      popover: {
        title: "Your credits",
        description: "See how many credits you have left and top up whenever you need to.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: '[data-tour="nav-account"]',
      popover: {
        title: "Your account",
        description:
          "Manage your account and sign out from this menu. Settings lives here too, where you can auto-approve review steps to skip the pauses.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: '[data-tour="help"]',
      popover: {
        title: "Need a refresher?",
        description:
          "This help button is always here. Click it anytime to replay this tour or rewatch the video.",
        side: "left",
        align: "end",
      },
    },
  ];

  const present = steps.filter((s) => !s.element || q(s.element));
  if (!present.length) return null;
  const d = driver({
    ...DRIVER_OPTS,
    steps: present,
    // Safety net alongside onDeselected's own cleanup - never leave a
    // container locked if the tour is torn down some other way.
    onDestroyed: () => unlockScrollContainer(),
  });
  d.drive();
  return d;
}

// ── Mobile: page items first, then open the drawer and walk its items, closing
//    the drawer when the tour finishes (or is dismissed).
function startMobileTour() {
  let d;

  const drawerIsOpen = () => !!q('[data-tour="drawer-create"]');
  const openDrawer = async () => {
    if (!drawerIsOpen()) q('[data-tour="nav-menu"]')?.click();
    await wait(320); // let the drawer mount + finish its slide-in
  };
  const closeDrawer = () => {
    if (drawerIsOpen()) q('[data-tour="drawer-close"]')?.click();
  };

  const steps = [
    {
      element: '[data-tour="mv-new"]',
      popover: {
        title: "Start a new video",
        description: "Tap here whenever you want to make a new video.",
        side: "bottom",
        align: "end",
      },
    },
    {
      element: '[data-tour="mv-tabs"]',
      popover: {
        title: "Finished & in progress",
        description: "Switch between your completed videos and ones you're still working on.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="nav-menu"]',
      popover: {
        title: "Your menu",
        description: "Creating, credits and your account all live in this menu. Let's open it.",
        side: "bottom",
        align: "end",
        // Advancing from here opens the drawer, waits for it to render, then
        // continues to the drawer steps. (We must call moveNext ourselves.)
        // NOTE: in driver.js the click hooks live on the popover, not the step.
        onNextClick: async () => {
          await openDrawer();
          d.moveNext();
        },
      },
    },
    {
      element: '[data-tour="drawer-create"]',
      popover: {
        title: "Create",
        description: "Start a brand-new video from here.",
        side: "left",
        align: "start",
        // Going back to the page steps: close the drawer first.
        onPrevClick: async () => {
          closeDrawer();
          await wait(280);
          d.movePrevious();
        },
      },
    },
    {
      element: '[data-tour="drawer-videos"]',
      popover: {
        title: "My Videos",
        description: "Your video library. You're here now.",
        side: "left",
        align: "start",
      },
    },
    {
      element: '[data-tour="drawer-settings"]',
      popover: {
        title: "Settings",
        description:
          "Auto-approve review steps here if you'd rather skip the pauses while your video generates.",
        side: "left",
        align: "start",
      },
    },
    {
      element: '[data-tour="drawer-credits"]',
      popover: {
        title: "Your credits",
        description: "Check your remaining credits and top up anytime.",
        side: "top",
        align: "start",
      },
    },
    {
      element: '[data-tour="drawer-signout"]',
      popover: {
        title: "Your account",
        description: "Sign out here when you're done.",
        side: "top",
        align: "start",
        // Last drawer item: close the drawer before the final (page) step so the
        // help button isn't hidden behind the drawer.
        onNextClick: async () => {
          closeDrawer();
          await wait(280);
          d.moveNext();
        },
      },
    },
    {
      element: '[data-tour="help"]',
      popover: {
        title: "Need a refresher?",
        description:
          "This help button is always here. Tap it anytime to replay this tour or rewatch the video.",
        side: "left",
        align: "end",
        // If the user steps back into the drawer section, re-open the drawer.
        onPrevClick: async () => {
          await openDrawer();
          d.movePrevious();
        },
      },
    },
  ];

  d = driver({
    ...DRIVER_OPTS,
    steps,
    // Whether the tour finishes on the last step or is dismissed early, always
    // leave the drawer closed so the user lands on a clean page. Also a safety
    // net alongside onDeselected's own cleanup for the scroll lock.
    onDestroyed: () => {
      closeDrawer();
      unlockScrollContainer();
    },
  });
  d.drive();
  return d;
}

export function startMyVideosTour(isMobile) {
  return isMobile ? startMobileTour() : startDesktopTour();
}

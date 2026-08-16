import { useCallback, useEffect, useRef, useState } from "react";

// Scrollspy for a fixed set of section headers: reports which one is
// currently "active" as the user scrolls, using each header's position
// relative to a trigger line just below the sticky stepper bar. A pure
// visual indicator, not a wizard gate - nothing here blocks or reorders
// content, it only reads scroll position.
//
// `register(id)` returns a ref-callback to attach to each section's header
// element. Sections that never register (e.g. "Source" in prompt-only mode)
// are simply absent from `ids` and never observed.
//
// Uses IntersectionObserver rather than a scroll listener so this never
// touches React state on every scroll frame. The observer's rootMargin only
// shrinks from the top (to clear the sticky bar) and NOT from the bottom -
// a thin trigger band would let a header scroll past entirely between two
// observer checks (a fast fling, or a programmatic scroll-to) without ever
// registering a crossing. With the full viewport below the bar as the
// observed zone, every header reports fresh position data as soon as any
// part of it is visible at all, and "current" is computed from those
// positions rather than from isIntersecting alone.
const TRIGGER_LINE = 110; // px from viewport top; roughly clears the sticky bar

// Near the bottom of a short page (or mode with few sections), the last
// header(s) may never have enough remaining scroll room to cross
// TRIGGER_LINE - the scroll container clamps at its max scrollTop first, so
// the trigger-line math alone can leave the last one or two sections
// permanently stuck as "upcoming"/"current-1". `registerBottomSentinel`
// gives a ref-callback for a marker element placed after ALL page content;
// once it scrolls into (near) view, that's a direct signal "there is no
// more page below this" regardless of where any individual header sits, so
// it floors the current index at the last section. The last section can
// still only ever reach "current", never "completed" - completing it needs
// hitting Create my video, not scrolling further past a step that doesn't
// exist.
const BOTTOM_NEAR_PX = 32; // "near" the bottom counts a little before the true end

export function useSectionScrollSpy(ids) {
  const elMap = useRef({});
  const topsRef = useRef({}); // id -> last known getBoundingClientRect().top
  const sentinelElRef = useRef(null);
  const atBottomRef = useRef(false);
  const [currentId, setCurrentId] = useState(ids[0] ?? null);
  const idsKey = ids.join("|");

  const register = useCallback(
    (id) => (el) => {
      if (el) elMap.current[id] = el;
      else delete elMap.current[id];
    },
    []
  );

  const registerBottomSentinel = useCallback((el) => {
    sentinelElRef.current = el;
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const orderedIds = idsKey ? idsKey.split("|") : [];
    if (orderedIds.length === 0) return;

    const recompute = () => {
      let lastPassed = -1;
      orderedIds.forEach((id, i) => {
        const top = topsRef.current[id];
        if (top != null && top <= TRIGGER_LINE) lastPassed = i;
      });
      // Floor: once the true bottom of the page is in (near) view, there is
      // nothing left to scroll past, so the last section is at minimum
      // "current" even if its header never individually crossed the line.
      if (atBottomRef.current) lastPassed = Math.max(lastPassed, orderedIds.length - 1);
      setCurrentId(lastPassed >= 0 ? orderedIds[lastPassed] : orderedIds[0]);
    };

    const headerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.dataset.sectionId;
          topsRef.current[id] = entry.boundingClientRect.top;
        });
        recompute();
      },
      { rootMargin: "-100px 0px 0px 0px", threshold: [0, 0.5, 1] }
    );

    orderedIds.forEach((id) => {
      const el = elMap.current[id];
      if (el) {
        el.dataset.sectionId = id;
        // Seed with the element's current position immediately - covers a
        // remount where the page (or its scroll container) is already
        // partway scrolled, rather than waiting on the observer's first
        // async callback.
        topsRef.current[id] = el.getBoundingClientRect().top;
        headerObserver.observe(el);
      }
    });

    let bottomObserver = null;
    if (sentinelElRef.current) {
      bottomObserver = new IntersectionObserver(
        ([entry]) => {
          atBottomRef.current = entry.isIntersecting;
          recompute();
        },
        { rootMargin: `0px 0px ${BOTTOM_NEAR_PX}px 0px`, threshold: 0 }
      );
      bottomObserver.observe(sentinelElRef.current);
    }

    recompute();

    return () => {
      headerObserver.disconnect();
      bottomObserver?.disconnect();
    };
  }, [idsKey]);

  return { register, currentId, registerBottomSentinel };
}

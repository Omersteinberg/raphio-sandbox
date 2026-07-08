import { useState, useEffect } from "react";

/**
 * Responsive breakpoint convention (matches Tailwind defaults):
 *   phone   : < md   (< 768px)
 *   tablet  : md-lg  (768px - 1023px)
 *   desktop : >= lg  (>= 1024px)
 *
 * useMediaQuery / useIsMobile are the single source of truth for
 * "are we on a small screen" so we don't sprinkle ad-hoc width checks
 * across the app. Use these for the inline-styled components that can't
 * rely on Tailwind's `sm:`/`md:` responsive prefixes.
 */

// SSR-safe initial read - guards against a missing `window`/`matchMedia`.
function getMatches(query) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(query).matches;
}

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => getMatches(query));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);

    // Sync immediately in case the query changed between render and effect.
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

// "Mobile" = below Tailwind's `md` breakpoint (i.e. phones, not tablets).
export function useIsMobile() {
  return useMediaQuery("(max-width: 767px)");
}

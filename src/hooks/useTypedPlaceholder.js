import { useEffect, useState } from "react";

// Paced for a full-length example brief. At 45ms/char (what suited a short
// line) 165 characters took seven seconds to appear and the box never sat
// still. Erasing is always faster than typing: nobody needs to read it on
// the way out. HOLD_MS is the "~3s each" the animation spec asks for.
const TYPE_MS = 26;
const ERASE_MS = 10;
const HOLD_MS = 3000;
const GAP_MS = 400;
const LEAD_MS = 600;

export const TYPED_PLACEHOLDER_CARET = "▌";

/**
 * Cycle a list of example phrases through a placeholder, typing then
 * erasing each one. Runs on one chained timeout rather than an interval so
 * the typing, holding and erasing phases can each have their own pace, and
 * so nothing queues up behind a slow frame.
 *
 * Returns null when it is not running, and a string when it is. The
 * distinction matters: the string is legitimately empty twice per cycle,
 * once before the first character and once between phrases, and treating
 * empty as "not running" flashes the caller's static fallback for half a
 * second every rotation.
 *
 * `enabled` should go false the moment the field has real content or focus
 * - the caller decides that, this hook only decides pacing. Also stops
 * (returns a static null, no animation) under prefers-reduced-motion.
 */
export function useTypedPlaceholder(phrases, enabled) {
  const [typed, setTyped] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setTyped(null);
      return undefined;
    }
    // Someone who has asked for less motion gets a plain placeholder, not a
    // slower one.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      setTyped(null);
      return undefined;
    }
    setTyped("");

    let phrase = 0;
    let chars = 0;
    let erasing = false;
    let timer;

    const tick = () => {
      const full = phrases[phrase];
      chars += erasing ? -1 : 1;
      setTyped(full.slice(0, chars));

      if (!erasing && chars === full.length) {
        erasing = true;
        timer = setTimeout(tick, HOLD_MS);
      } else if (erasing && chars === 0) {
        erasing = false;
        phrase = (phrase + 1) % phrases.length;
        timer = setTimeout(tick, GAP_MS);
      } else {
        timer = setTimeout(tick, erasing ? ERASE_MS : TYPE_MS);
      }
    };

    timer = setTimeout(tick, LEAD_MS);
    return () => clearTimeout(timer);
  }, [phrases, enabled]);

  return typed;
}

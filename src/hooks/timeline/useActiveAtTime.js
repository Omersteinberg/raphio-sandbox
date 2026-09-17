import { useMemo, useRef } from "react";

const EMPTY_ARRAY = [];

function defaultGetBounds(item) {
  return { startTime: item.startTime, duration: item.duration };
}

// Start-inclusive, end-exclusive - matches VideoPreview's existing
// `activeVideo` check (`playheadPosition >= item.startTime && playheadPosition
// < item.startTime + item.duration`), so swapping that inline logic for this
// hook later is a behavioral no-op, not a change in what counts as "active".
function isActiveAt(item, currentTime, getBounds) {
  const { startTime, duration } = getBounds(item);
  return currentTime >= startTime && currentTime < startTime + duration;
}

// Same items, same order. Identity (`===`) comparison per slot - items are
// expected to be the same object references across renders (this codebase's
// timeline state is plain arrays of objects replaced wholesale on edit, not
// mutated in place), so this is a correct and cheap equality check, not an
// approximation.
function sameMembers(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * "What's active right now at time T" - a memoized selector over any array
 * of time-bounded items (start + duration). Returns EVERY item whose window
 * contains `currentTime`, not just the first match - `Array.prototype.find`
 * (VideoPreview's current inline `activeVideo` approach) can only ever
 * return one, which doesn't hold once multiple items can legitimately
 * overlap (e.g. several text overlays live on the same clip at once).
 *
 * Reference stability: `currentTime` typically changes every animation
 * frame during playback (see useTimeline's rAF loop), but the ACTIVE SET
 * usually does NOT change frame-to-frame - only at a boundary crossing.
 * Returning a fresh array on every tick would cascade a re-render through
 * every consumer even when "what's active" hasn't actually changed. This
 * hook re-evaluates the filter whenever `items`, `currentTime`, or
 * `getBounds` change (a single cheap pass over `items` - unavoidable, since
 * detecting a boundary crossing requires checking), but only hands back a
 * NEW array reference when the resulting set of active items actually
 * differs from last time; otherwise it returns the exact same reference it
 * returned before. Consumers that key an effect/memo off this return value,
 * or components wrapped in React.memo receiving it as a prop, only react
 * when the active set genuinely changes - not on every playhead tick.
 *
 * Usage:
 *   const activeOverlays = useActiveAtTime(overlays, playheadPosition);
 *
 *   // a "single active item" track (mirrors VideoPreview's activeVideo):
 *   const [activeVideo] = useActiveAtTime(videoItems, playheadPosition);
 *
 *   // adapting a different item shape (e.g. {start, length} instead of
 *   // {startTime, duration}) - memoize getBounds yourself (useCallback) if
 *   // you want to avoid the cheap re-filter on every unrelated re-render,
 *   // though the returned array reference stays stable regardless:
 *   const activeCues = useActiveAtTime(cues, currentTime, {
 *     getBounds: (cue) => ({ startTime: cue.start, duration: cue.length }),
 *   });
 *
 * @param {Array<object>} items - items with (by default) `startTime` and
 *   `duration` fields; pass `getBounds` to adapt a different shape.
 * @param {number} currentTime - the time to evaluate against, in the same
 *   units as `startTime`/`duration` (this codebase uses seconds).
 * @param {object} [options]
 * @param {(item: object) => { startTime: number, duration: number }} [options.getBounds]
 *   Extracts {startTime, duration} from an item. Defaults to reading those
 *   two fields directly.
 * @returns {Array<object>} every item active at `currentTime`, in `items`
 *   order. The SAME array reference across calls whenever the active set is
 *   unchanged - safe to use as a dependency, or to compare with `===`.
 */
export function useActiveAtTime(items, currentTime, options) {
  const getBounds = options?.getBounds ?? defaultGetBounds;
  const list = items ?? EMPTY_ARRAY;

  const rawResult = useMemo(
    () => list.filter((item) => isActiveAt(item, currentTime, getBounds)),
    [list, currentTime, getBounds]
  );

  const cachedResult = useRef(EMPTY_ARRAY);
  if (!sameMembers(cachedResult.current, rawResult)) {
    cachedResult.current = rawResult;
  }
  return cachedResult.current;
}

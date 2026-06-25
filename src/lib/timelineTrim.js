// Pure cut/trim math for the Clip Trim Editor.
//
// Cut-only: the kept region [trimStart, trimEnd] lives inside the source
// [0, sourceDuration], is always at least `minDuration` long, and never
// stretches the source — so `speed` is always 1.0.

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * @param {object} args
 * @param {number} [args.trimStart=0]  In point (seconds into the source)
 * @param {number} [args.trimEnd]      Out point (defaults to the full source)
 * @param {number} args.sourceDuration Length of the underlying media
 * @param {number} [args.minDuration=0.5] Smallest allowed kept region
 * @returns {{ trimStart: number, trimEnd: number, duration: number, speed: number }}
 */
export function computeTrim({ trimStart = 0, trimEnd, sourceDuration, minDuration = 0.5 }) {
  const end = trimEnd ?? sourceDuration;

  const inPoint = clamp(trimStart, 0, sourceDuration - minDuration);
  const outPoint = clamp(end, inPoint + minDuration, sourceDuration);

  return {
    trimStart: inPoint,
    trimEnd: outPoint,
    duration: outPoint - inPoint,
    speed: 1.0,
  };
}

import { useEffect, useState } from "react";

/**
 * Shared progress bar - one consistent look (brand gradient) for every long
 * wait in the app, so no screen shows a bare spinner.
 *
 * - Controlled: pass `value` (0-100) and it renders that width.
 * - Indeterminate: omit `value` (or pass null) and it trickles forward on its
 *   own toward ~90%, so a bar still moves even when the backend reports no
 *   percentage (e.g. scene-frame generation). Pass `estimatedMs` to pace that
 *   trickle to the expected wait so the bar doesn't shoot to ~90% in seconds.
 *
 * `showPercent` toggles the % label. `className` sizes/positions the wrapper.
 * `note` renders a small reassurance line under the bar (e.g. "you can close
 * this tab - we'll email you"). Pass `EMAIL_WAIT_NOTE` for the standard copy.
 */
export const EMAIL_WAIT_NOTE =
  "";

export default function ProgressBar({
  value = null,
  showPercent = true,
  className = "",
  note = null,
  estimatedMs = 30000,
}) {
  const indeterminate = value == null;
  const [sim, setSim] = useState(0);

  useEffect(() => {
    if (!indeterminate) return;
    setSim(0);
    const start = Date.now();
    const id = setInterval(() => {
      // Time-based ease toward ~90% over `estimatedMs`, then hold. Driving off
      // elapsed time (not a per-tick step) paces the climb to the real wait and
      // survives setInterval throttling in a backgrounded tab. Asymptotic, so a
      // job that overruns its estimate never looks frozen at 100%. Real
      // completion swaps this out for a controlled value.
      const t = (Date.now() - start) / estimatedMs;
      setSim(90 * (1 - Math.exp(-2.5 * t)));
    }, 200);
    return () => clearInterval(id);
  }, [indeterminate, estimatedMs]);

  const pct = Math.max(
    0,
    Math.min(100, Math.round(indeterminate ? sim : Number(value) || 0))
  );

  return (
    <div className={className}>
      <div
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ background: "rgba(var(--terra-rgb), 0.12)" }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%`, background: "var(--gradient-brand)" }}
        />
      </div>
      {showPercent && (
        <p className="mt-2 text-center text-xs font-medium text-ink-muted">
          {pct}%
        </p>
      )}
      {note && (
        <p className="mt-2 text-center text-xs text-ink-muted/80 max-w-xs mx-auto leading-relaxed">
          {note}
        </p>
      )}
    </div>
  );
}

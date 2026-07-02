import { useEffect, useState } from "react";

/**
 * Shared progress bar — one consistent look (brand gradient) for every long
 * wait in the app, so no screen shows a bare spinner.
 *
 * - Controlled: pass `value` (0–100) and it renders that width.
 * - Indeterminate: omit `value` (or pass null) and it trickles forward on its
 *   own toward ~90%, so a bar still moves even when the backend reports no
 *   percentage (e.g. scene-frame generation).
 *
 * `showPercent` toggles the % label. `className` sizes/positions the wrapper.
 */
export default function ProgressBar({
  value = null,
  showPercent = true,
  className = "",
}) {
  const indeterminate = value == null;
  const [sim, setSim] = useState(0);

  useEffect(() => {
    if (!indeterminate) return;
    setSim(0);
    const id = setInterval(() => {
      // Ease toward 90% and hold — real completion swaps this out for a value.
      setSim((prev) => (prev >= 90 ? prev : prev + (90 - prev) * 0.04));
    }, 200);
    return () => clearInterval(id);
  }, [indeterminate]);

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
    </div>
  );
}

import { Film } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Full-screen overlay shown while a long background job (timeline export or
 * clip rebuild) runs. The backend reports progress in coarse chunks (every few
 * seconds), which made the bar jump. To smooth it, we animate a *displayed*
 * percentage with requestAnimationFrame: it eases toward the real target and
 * gently trickles forward between server updates so it never looks frozen.
 * `title` lets the same modal label different jobs.
 */
export default function ExportProgressModal({ progress, title = "Exporting your video" }) {
  const target = Math.max(0, Math.min(100, Number(progress?.percentage) || 0));
  const label = progress?.label || "Preparing…";

  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    let raf;
    const tick = () => {
      const t = targetRef.current;
      let d = displayRef.current;
      // Ease toward the real value; finish briskly once the job reports 100%.
      const ease = t >= 100 ? 0.2 : 0.07;
      d += (t - d) * ease;
      // Caught up but not done → trickle gently so the bar keeps inching forward
      // between polls. Stay a little behind the next milestone and short of 100.
      if (t < 100 && d >= t - 0.3) {
        d = Math.min(d + 0.012, t + 2, 99);
      }
      if (t >= 100 && d > 99.5) d = 100;
      if (d > 100) d = 100;
      displayRef.current = d;
      setDisplay(d);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pct = Math.round(display);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
        <div className="mb-4 flex items-center justify-center">
          <Film className="h-10 w-10 text-primary" />
        </div>

        <h3 className="mb-1 text-lg font-semibold text-foreground">{title}</h3>
        {/* Reserve a line of height so the card doesn't jump as the label changes */}
        <p className="mb-4 min-h-[1.25rem] text-sm text-muted-foreground">{label}</p>

        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${display}%`, background: "var(--gradient-brand)" }}
          />
        </div>
        <p className="mt-2 text-xs font-medium text-foreground">{pct}%</p>

        <p className="mt-4 text-xs text-muted-foreground">
          This may take several minutes. Feel free to use other tabs, but don't close or refresh this page.
        </p>
      </div>
    </div>
  );
}

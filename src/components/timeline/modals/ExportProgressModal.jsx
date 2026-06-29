import { Film } from "lucide-react";

/**
 * Full-screen overlay shown while a long background job (timeline export or
 * clip rebuild) runs. Driven by the live job progress ({ percentage, label })
 * polled from the backend, so the bar reflects the real stage instead of an
 * indeterminate spinner. `title` lets the same modal label different jobs.
 *
 * Responsive: a centered card with a small max width, so it reads well on both
 * desktop and mobile (both render this same component).
 */
export default function ExportProgressModal({ progress, title = "Exporting your video" }) {
  const pct = Math.max(0, Math.min(100, Math.round(progress?.percentage ?? 0)));
  const label = progress?.label || "Preparing…";

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
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pct}%`, background: "var(--gradient-brand)" }}
          />
        </div>
        <p className="mt-2 text-xs font-medium text-foreground">{pct}%</p>

        <p className="mt-4 text-xs text-muted-foreground">
          This usually takes 1–2 minutes depending on your video's length.
          Please keep this tab open.
        </p>
      </div>
    </div>
  );
}

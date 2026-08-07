import { Loader2, Wand2 } from "lucide-react";

/**
 * The "Improve with AI" pill.
 *
 * A component rather than inline markup because two pipelines render it now: the
 * prompt box on the references and image steps, and the brief card on the intro
 * step. As two copies, a restyle of one would quietly drift from the other.
 *
 * Positioning is the caller's job. PromptStep floats it inside the textarea, the
 * intro brief sits it in a header row, so nothing here assumes either.
 */
export default function ImproveButton({
  onClick,
  busy = false,
  disabled = false,
  label = "Improve",
  busyLabel = "Improving…",
  className = "",
  style,
}) {
  const off = disabled || busy;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={off}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${className}`}
      style={{
        ...(off
          ? { background: 'rgba(193,68,14,0.10)', color: '#B09A8A', cursor: 'not-allowed' }
          : { background: 'linear-gradient(135deg, #C1440E, #E8603C)', color: '#fff', boxShadow: '0 2px 8px rgba(193,68,14,0.28)' }),
        ...style,
      }}
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
      <span>{busy ? busyLabel : label}</span>
    </button>
  );
}

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
 *
 * `variant="outlined"` (opt-in, PromptStep's chip row) swaps the filled
 * gradient for a white fill + terra border + terra icon/text - it sits next
 * to outlined value chips there and needs to read as "an action among
 * values," not compete with them as another filled block. Brand Intro never
 * passes it, so its header-row button is unaffected.
 */
export default function ImproveButton({
  onClick,
  busy = false,
  disabled = false,
  label = "Improve",
  busyLabel = "Improving…",
  className = "",
  style,
  variant = "filled",
}) {
  const off = disabled || busy;
  const toneStyle = off
    ? { background: 'rgba(193,68,14,0.10)', color: '#B09A8A', cursor: 'not-allowed', border: variant === 'outlined' ? '1.5px solid rgba(193,68,14,0.20)' : undefined }
    : variant === 'outlined'
      ? { background: '#fff', color: 'var(--terra)', border: '1.5px solid var(--terra)' }
      : { background: 'var(--gradient-brand)', color: '#fff', boxShadow: '0 2px 8px rgba(193,68,14,0.28)' };

  // Inline colors (not Tailwind classes here), so hover is a JS handler like
  // the other inline-styled buttons in this composer, not a `hover:` class.
  // Outlined gets a light terra wash (it's already at full border/text
  // strength at rest, so a background shift is the only cue left); filled
  // deepens its shadow, matching the "Emphasis, warm" shadow escalation used
  // for the brand gradient elsewhere.
  const handleMouseEnter = (e) => {
    if (off) return;
    if (variant === 'outlined') e.currentTarget.style.background = 'rgba(193,68,14,0.06)';
    else e.currentTarget.style.boxShadow = '0 4px 14px rgba(193,68,14,0.40)';
  };
  const handleMouseLeave = (e) => {
    if (off) return;
    if (variant === 'outlined') e.currentTarget.style.background = '#fff';
    else e.currentTarget.style.boxShadow = '0 2px 8px rgba(193,68,14,0.28)';
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={off}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`inline-flex items-center gap-1.5 px-4 py-2 min-h-11 rounded-full text-[11px] font-bold transition-all ${className}`}
      style={{ ...toneStyle, ...style }}
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
      <span>{busy ? busyLabel : label}</span>
    </button>
  );
}

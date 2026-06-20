import { useEffect, useRef, useState } from "react";
import { Clock, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";
import { estimateDuration as fetchEstimate } from "@/services/session";

// Visual treatment per estimate status. needs_ai_fill splits on whether AI fill
// is currently enabled (info-blue when it'll close the gap, amber when the video
// will simply come up short).
const STATUS_STYLES = {
  too_many_images: { bg: "#FFF7ED", border: "#FED7AA", text: "#C2410C", Icon: AlertTriangle },
  needs_ai_fill_on: { bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8", Icon: Sparkles },
  needs_ai_fill_off: { bg: "#FFF7ED", border: "#FED7AA", text: "#C2410C", Icon: AlertTriangle },
  exact_fit: { bg: "#F0FDF4", border: "#BBF7D0", text: "#15803D", Icon: CheckCircle2 },
  no_target: { bg: "#FAFAF9", border: "#E7E5E4", text: "#57534E", Icon: Clock },
};

/**
 * Live "your video will be about this long" banner for the prompt screen.
 * Calls the stateless estimate endpoint (debounced) and renders actionable
 * options that map back to the parent's local state setters — no session needed.
 */
export default function DurationEstimate({
  imageCount,
  targetDuration,
  enableBridges,
  onSetDuration,
  onToggleAiFill,
  onUploadMore,
  onRemoveImages,
}) {
  const [estimate, setEstimate] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef(null);
  // Opt-out tracking for the auto-fill behaviour. A ref (not state) because the
  // debounced async callback must read the current value, and every path that
  // flips it also re-fetches the estimate, which re-renders the banner anyway.
  const optedOutRef = useRef(false);
  const prevStatusRef = useRef(null);
  const setOpted = (v) => {
    optedOutRef.current = v;
  };

  useEffect(() => {
    if (!imageCount || imageCount <= 0) {
      setEstimate(null);
      prevStatusRef.current = null;
      return;
    }
    // Inputs changed — a prior "keep longer video" dismissal no longer applies.
    setDismissed(false);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      let data;
      try {
        data = await fetchEstimate({ imageCount, targetDuration, enableBridges });
      } catch {
        // Fail quietly — this is an optional hint, never a blocker.
        setEstimate(null);
        return;
      }
      setEstimate(data);

      // Auto-fill only when short: engage AI fill on the leading edge of a
      // shortage (not every render — that would fight a manual toggle), unless
      // the user has explicitly opted out of filling this gap.
      const wasShort = prevStatusRef.current === "needs_ai_fill";
      prevStatusRef.current = data.status;
      if (data.status === "needs_ai_fill") {
        if (!wasShort && !enableBridges && !optedOutRef.current) {
          onToggleAiFill?.(true);
        }
      } else if (optedOutRef.current) {
        // Shortage resolved — clear opt-out so a future gap can auto-fill again.
        setOpted(false);
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
    // onToggleAiFill is an inline parent callback (new identity each render);
    // including it would re-fetch on every render. We only want to re-estimate
    // when the actual inputs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageCount, targetDuration, enableBridges]);

  if (!estimate || estimate.status === "no_images" || dismissed) return null;

  const handleOption = (opt) => {
    switch (opt.id) {
      case "extend_duration":
      case "shorten_duration":
        onSetDuration?.(opt.value);
        break;
      case "enable_ai_fill":
        setOpted(false);
        onToggleAiFill?.(true);
        break;
      case "disable_ai_fill":
        setOpted(true);
        onToggleAiFill?.(false);
        break;
      case "upload_more":
        onUploadMore?.();
        break;
      case "remove_images":
        onRemoveImages?.(opt.removeCount);
        break;
      case "keep":
        setDismissed(true);
        break;
      default:
        break;
    }
  };

  const variantKey =
    estimate.status === "needs_ai_fill"
      ? estimate.aiFillEnabled
        ? "needs_ai_fill_on"
        : "needs_ai_fill_off"
      : estimate.status;
  const s = STATUS_STYLES[variantKey] || STATUS_STYLES.no_target;
  const Icon = s.Icon;

  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ background: s.bg, borderColor: s.border }}>
      <div className="flex items-start gap-2.5">
        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: s.text }} />
        <p className="text-xs font-semibold leading-relaxed" style={{ color: s.text }}>
          {estimate.message}
        </p>
      </div>
      {estimate.options?.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-6">
          {estimate.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleOption(opt)}
              className="text-[11px] font-bold px-3 py-1.5 rounded-lg border bg-white/70 hover:bg-white transition-colors"
              style={{ borderColor: s.border, color: s.text }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

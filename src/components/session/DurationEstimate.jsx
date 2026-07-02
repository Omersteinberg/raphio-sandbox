import { useEffect, useRef, useState } from "react";
import { Clock, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";
import { estimateDuration as fetchEstimate } from "@/services/session";
import { useAuth } from "@/hooks/useAuth.jsx";
import { creditsForDuration } from "@/lib/limits";

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
 * options that map back to the parent's local state setters, no session needed.
 */
export default function DurationEstimate({
  imageCount,
  targetDuration,
  style,
  enableBridges,
  onSetDuration,
  onToggleAiFill,
  onUploadMore,
  onRemoveImages,
  onStatusChange,
  onAffordableChange,
  onTopUp,
}) {
  const { credits } = useAuth();
  const [estimate, setEstimate] = useState(null);
  const timerRef = useRef(null);
  // Track the user-facing inputs (image count + target duration) so we can tell an
  // INPUT change from a mere toggle change. The estimate auto-drives the AI-bridge
  // on/off only on input changes, so a manual toggle is respected until the user next
  // changes images or duration.
  const prevInputsRef = useRef({ imageCount: null, targetDuration: null });

  useEffect(() => {
    if (!imageCount || imageCount <= 0) {
      setEstimate(null);
      prevInputsRef.current = { imageCount: null, targetDuration: null };
      onStatusChange?.(null);
      return;
    }
    // Inputs changed: re-block the parent's CTA until a fresh estimate resolves.
    onStatusChange?.(null);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      let data;
      try {
        data = await fetchEstimate({ imageCount, targetDuration, style, enableBridges });
      } catch {
        // Estimate unavailable: show nothing and let the parent fail open
        // (a flaky estimate endpoint must not block all generation).
        setEstimate(null);
        onStatusChange?.('error');
        return;
      }
      setEstimate(data);
      onStatusChange?.(data.status);

      // The estimate drives the AI-bridge toggle: ON when there's a gap to fill, OFF
      // when the images already meet/exceed the target. Apply this only when the
      // INPUTS changed (image count or duration), never on a bare toggle change, so
      // a manual on/off sticks until the user next changes images or duration.
      // (no_target / no_images: leave the toggle as the user set it.)
      const inputsChanged =
        prevInputsRef.current.imageCount !== imageCount ||
        prevInputsRef.current.targetDuration !== targetDuration;
      prevInputsRef.current = { imageCount, targetDuration };

      if (inputsChanged) {
        const GAP_STATUSES = ["needs_ai_fill", "exact_fit", "too_many_images"];
        if (GAP_STATUSES.includes(data.status)) {
          const shouldFill = data.status === "needs_ai_fill";
          if (shouldFill !== enableBridges) {
            onToggleAiFill?.(shouldFill);
          }
        }
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
    // onToggleAiFill is an inline parent callback (new identity each render);
    // including it would re-fetch on every render. We only want to re-estimate
    // when the actual inputs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageCount, targetDuration, style, enableBridges]);

  // Cost tracks the duration the user selected, not the scene/clip count.
  const requiredCredits = creditsForDuration(targetDuration);
  // Unknown balance or no cost yet => treat as affordable so we never block prematurely.
  const affordable = credits == null || requiredCredits <= 0 || credits >= requiredCredits;
  useEffect(() => {
    onAffordableChange?.(affordable);
    // onAffordableChange is an inline parent callback (new identity each render);
    // re-run only when affordability actually flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affordable]);

  if (!estimate || estimate.status === "no_images") return null;

  const handleOption = (opt) => {
    switch (opt.id) {
      case "shorten_duration":
        onSetDuration?.(opt.value);
        break;
      case "enable_ai_fill":
        onToggleAiFill?.(true);
        break;
      case "disable_ai_fill":
        onToggleAiFill?.(false);
        break;
      case "upload_more":
        onUploadMore?.();
        break;
      case "remove_images":
        onRemoveImages?.(opt.removeCount);
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
  // Older API responses included "keep longer" / "set duration to ~Xs" actions,
  // but strict-total generation no longer supports those paths. Hide them
  // defensively so stale responses never render dead buttons.
  const visibleOptions = (estimate.options ?? []).filter(
    (opt) => opt.id !== "keep" && opt.id !== "extend_duration"
  );

  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ background: s.bg, borderColor: s.border }}>
      <div className="flex items-start gap-2.5">
        <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: s.text }} />
        <p className="text-xs font-semibold leading-relaxed" style={{ color: s.text }}>
          {estimate.message}
        </p>
      </div>
      {requiredCredits > 0 && (
        <div className="flex items-center justify-between gap-2 pl-6">
          <span
            className="text-[11px] font-bold"
            style={{ color: affordable ? s.text : "#C2410C" }}
          >
            {affordable
              ? `Costs ${requiredCredits} credit${requiredCredits !== 1 ? "s" : ""}, you have ${credits}`
              : `Needs ${requiredCredits} credits, you have ${credits ?? 0}`}
          </span>
          {!affordable && (
            <button
              onClick={() => onTopUp?.()}
              className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white flex-shrink-0"
              style={{ background: "#C1440E" }}
            >
              Top up
            </button>
          )}
        </div>
      )}
      {visibleOptions.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-6">
          {visibleOptions.map((opt) => (
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

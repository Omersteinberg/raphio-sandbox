import { useAuth } from "@/hooks/useAuth.jsx";
import { creditsForDuration } from "@/lib/limits";

/**
 * The "Costs N credits, you have M" / "Needs N, you have M" line + Top-up
 * button.
 *
 * `variant="standalone"` (default) renders its own rounded-2xl border p-4
 * card, colored green/orange by affordability.
 *
 * `variant="embedded"` renders just the bare content row (pl-6 indented, no
 * border/background of its own) for dropping into a parent card that already
 * has one.
 *
 * `affordableTextColor` lets an embedded caller override the affordable-case
 * text color to match its own status-driven palette instead of the
 * standalone card's fixed green. The unaffordable-case color is always the
 * fixed orange, so it isn't made configurable.
 */
export default function CreditAffordabilityCard({
  targetDuration,
  onTopUp,
  variant = "standalone",
  affordableTextColor,
}) {
  const { credits } = useAuth();
  const requiredCredits = creditsForDuration(targetDuration);
  const affordable = credits == null || requiredCredits <= 0 || credits >= requiredCredits;

  if (requiredCredits <= 0) return null;

  const textColor = affordable ? (affordableTextColor || "#15803D") : "#C2410C";

  const row = (
    <>
      <span className="text-[11px] font-bold" style={{ color: textColor }}>
        {affordable
          ? `Costs ${requiredCredits} credit${requiredCredits !== 1 ? "s" : ""}, you have ${credits ?? 0}`
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
    </>
  );

  if (variant === "embedded") {
    return (
      <div className="flex items-center justify-between gap-2 pl-6">
        {row}
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border p-4 flex items-center justify-between gap-2"
      style={{
        background: affordable ? "#F0FDF4" : "#FFF7ED",
        borderColor: affordable ? "#BBF7D0" : "#FED7AA",
      }}
    >
      {row}
    </div>
  );
}

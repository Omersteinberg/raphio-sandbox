import { Fragment } from "react";
import { Check } from "lucide-react";

// Solid match for --background (hsl(30 33% 94%)) so the connecting line
// and hollow ring markers can share an opaque fill that fully hides the
// line behind them - no backdrop-blur trick needed since the stepper's own
// bar is already opaque at this same color.
const BAR_BG = "#F5F0EB";
const LINE_COLOR = "hsl(var(--border))";

/**
 * Scroll-position indicator for the composer's Source/Story/Direction/Style
 * sections (Variation 3, "Thin line with markers"). Purely a read-only
 * status display - nothing here gates or reorders the sections it labels;
 * the page under it stays fully visible and interactive regardless of
 * which step is "current".
 *
 * `steps` should already be filtered to only the sections that exist for
 * the active mode (e.g. no "source" entry in prompt-only), so the stepper
 * never shows a step count that disagrees with what's actually on screen.
 *
 * The line is rendered as a `flex-1` sibling between each marker column
 * rather than one absolutely-positioned bar spanning the row - labels
 * differ in width (e.g. "Style" vs "Direction"), so a fixed inset from the
 * row's edges would not line up with the actual marker centers. A flex
 * spacer always fills exactly the gap between two marker columns.
 */
export default function SectionStepper({ steps, currentId }) {
  if (steps.length < 2) return null;

  const currentIndex = steps.findIndex((s) => s.id === currentId);

  return (
    <div
      className="sticky top-0 z-20 -mx-2 sm:-mx-4 px-2 sm:px-4 py-2.5 sm:py-3"
      style={{ background: BAR_BG }}
    >
      <div className="flex items-start max-w-4xl mx-auto px-1">
        {steps.map((step, i) => {
          const state =
            i < currentIndex ? "completed" : i === currentIndex ? "current" : "upcoming";
          return (
            <Fragment key={step.id}>
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div
                  className="w-4 h-4 sm:w-[22px] sm:h-[22px] rounded-full flex items-center justify-center transition-colors duration-200"
                  style={{
                    background: state === "completed" ? "var(--terra)" : BAR_BG,
                    border:
                      state === "completed"
                        ? "none"
                        : state === "current"
                        ? "2px solid var(--terra)"
                        : `1.5px solid ${LINE_COLOR}`,
                  }}
                >
                  {state === "completed" && (
                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: "#fff" }} strokeWidth={3} />
                  )}
                </div>
                {/* Labels stay visible on mobile by default (reference image's
                    condensed variant keeps them) - only the sub-360px extreme
                    (older/smallest phones) doesn't have room for all four at
                    once, so non-current labels drop there while the current
                    step's own label stays visible regardless of width. */}
                <span
                  className={`block text-[9px] sm:text-[11px] font-bold whitespace-nowrap transition-colors duration-200 ${
                    state === "current" ? "" : "max-[359px]:hidden"
                  }`}
                  style={{
                    color:
                      state === "completed"
                        ? "var(--ink-warm)"
                        : state === "current"
                        ? "var(--terra)"
                        : "#726481",
                  }}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className="flex-1 h-px mt-2 sm:mt-[11px] mx-1.5 sm:mx-2"
                  style={{ background: LINE_COLOR }}
                />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

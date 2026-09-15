import { useRef, useLayoutEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gauge, Volume2, TrendingUp, TrendingDown, X } from "lucide-react";

const MARGIN = 8; // gap kept between the pill and the clip / viewport edge

// Strong ease-out (DESIGN-engineering house curve) rather than a built-in
// easing - the built-ins are too weak to read as intentional at this speed.
const EASE_OUT = [0.23, 1, 0.32, 1];

/**
 * The single floating surface for the selected timeline clip.
 *
 * This used to be a compact pill that OPENED separate full-screen bottom
 * sheets for Speed and Volume - two surfaces that could (and did) render at
 * once, the pill painting over the sheet it had just opened. There is now
 * exactly one surface: the pill holds the compact action row, and Speed /
 * Volume expand it downward in place instead of opening anything else.
 *
 * Positioning (desktop): `position: fixed`, computed from the selected clip's
 * own on-screen rect (`anchorRect`, measured by TimelineEditor from the clip's
 * DOM node), so it tracks the clip through scroll/zoom without being clipped
 * by the timeline's `overflow-hidden` ancestors. Prefers sitting above the
 * clip, flips below when there isn't room, and clamps on all four edges - the
 * expanded state is several hundred px tall, so the clamp matters far more
 * than it did when this was one row. A ResizeObserver re-runs the placement
 * while the expand/collapse animation is actually changing the height, so the
 * pill stays correctly anchored throughout rather than only at the end.
 *
 * Positioning (mobile): docked to the bottom of the viewport instead. The
 * expanded content cannot fit beside a clip on a phone, and a bottom dock is
 * both thumb-reachable and the platform convention. Still ONE surface - this
 * is a different anchor for the same element, not a sheet.
 */
export default function ClipActionPill({
  anchorRect,
  actions,
  isAudioClip,
  isMobile = false,
  clipLabel,
  clipThumbnail,
  expanded, // 'speed' | 'volume' | null
  onExpandChange,
  speedControl, // { value, min, max, presets, onDraft, onCommit }
  volumeControl, // { value, presets, onDraft, onCommit }
  fadeInControl, // { value, onDraft, onCommit }
  fadeOutControl, // { value, onDraft, onCommit }
}) {
  const pillRef = useRef(null);
  const [pos, setPos] = useState(null);

  const reposition = useCallback(() => {
    // Mobile is docked by CSS (inset-x / bottom), so there is nothing to
    // compute - bail before touching layout.
    if (isMobile || !anchorRect || !pillRef.current) return;
    const rect = pillRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Prefer above the clip; fall back to below, and clamp BOTH ends. The
    // lower clamp is what stops a tall expanded panel from being pushed off
    // the top of the screen when the clip is near the bottom.
    const above = anchorRect.top - rect.height - MARGIN;
    let top;
    if (above >= MARGIN) {
      top = above;
    } else {
      top = Math.min(anchorRect.top + anchorRect.height + MARGIN, vh - rect.height - MARGIN);
      top = Math.max(MARGIN, top);
    }

    let left = anchorRect.left + anchorRect.width / 2 - rect.width / 2;
    left = Math.max(MARGIN, Math.min(left, vw - rect.width - MARGIN));

    setPos({ top, left });
  }, [anchorRect, isMobile]);

  useLayoutEffect(() => {
    reposition();
  }, [reposition, expanded]);

  // Keep the anchor correct while the panel is mid-expand. Without this the
  // placement would be computed once against a height the pill has not
  // reached yet, and a panel that grows downward past the viewport would
  // simply be cut off.
  useLayoutEffect(() => {
    const el = pillRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => reposition());
    ro.observe(el);
    return () => ro.disconnect();
  }, [reposition]);

  const toggle = (panel) => onExpandChange?.(expanded === panel ? null : panel);

  // Compact-row button. `active` marks the panel currently expanded, so the
  // row doubles as the tab strip for the body below it. Takes an already
  // rendered `icon` node rather than a component, so callers stay uniform
  // whether the icon is a literal or comes off an action object.
  const rowButton = ({ key, icon, label, onClick, active, danger }) => (
    <button
      key={key}
      onClick={onClick}
      title={label}
      aria-expanded={active === undefined ? undefined : active}
      className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors active:scale-95 ${
        active
          ? "text-primary bg-primary/10"
          : danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const sliderRow = (control, { min, max, step, ariaLabel }) => (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={control.value}
      onChange={(e) => control.onDraft(Number(e.target.value))}
      onPointerUp={() => control.onCommit(control.value)}
      onTouchEnd={() => control.onCommit(control.value)}
      aria-label={ariaLabel}
      className="w-full range-terra"
      style={{ "--range-progress": `${((control.value - min) / (max - min)) * 100}%` }}
    />
  );

  return (
    <AnimatePresence>
      {anchorRect && (
        <motion.div
          ref={pillRef}
          className={`fixed z-[60] bg-card border border-border rounded-xl overflow-hidden ${
            isMobile
              ? "inset-x-2 bottom-2 pb-[env(safe-area-inset-bottom)]"
              : expanded
              ? "w-80"
              : ""
          } ${expanded ? "shadow-2xl" : "shadow-lg"}`}
          style={
            isMobile
              ? undefined
              : { top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? "visible" : "hidden" }
          }
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15, ease: EASE_OUT }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Compact action row - always present, expanded or not. Wraps
              rather than clipping: collapsed the pill is content-width so
              there is nothing to wrap against, but expanded it is a fixed
              w-80 and a clip with every action (Speed/Volume/Split/
              Regenerate/Narration/Delete) can exceed that. The container is
              overflow-hidden for the height animation, so without wrapping
              those buttons would be silently cut off. */}
          <div className={`flex flex-wrap items-center gap-0.5 p-1 ${isMobile ? "justify-center" : ""}`}>
            {rowButton({
              key: "speed",
              icon: <Gauge className="w-4 h-4" />,
              label: "Speed",
              onClick: () => toggle("speed"),
              active: expanded === "speed",
            })}
            {isAudioClip &&
              rowButton({
                key: "volume",
                icon: <Volume2 className="w-4 h-4" />,
                label: "Volume",
                onClick: () => toggle("volume"),
                active: expanded === "volume",
              })}
            {actions.map((action) =>
              rowButton({
                key: action.label,
                icon: <action.Icon className="w-4 h-4" />,
                label: action.label,
                onClick: action.onClick,
                danger: action.danger,
              })
            )}
          </div>

          {/* Expanded body. Height-animated on open/close so the surface
              visibly grows out of the row rather than snapping; max-h +
              scroll is the backstop for a viewport too short to hold the
              whole panel.

              Deliberately NOT keyed on `expanded` and NOT mode="wait":
              keying would unmount/remount on a Speed -> Volume switch, so the
              panel would animate all the way down to zero and back up - a
              full collapse between the two, which is exactly what the audio
              Speed-then-Volume flow is supposed to avoid. Unkeyed, the
              container stays mounted across the switch and only its content
              changes. */}
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
                className="overflow-hidden"
              >
                <div className="border-t border-border p-3 max-h-[60vh] overflow-y-auto">
                  {/* Which clip this is editing - without it the panel reads
                      as a global setting. */}
                  <div className="flex items-center gap-2 mb-3">
                    {clipThumbnail && (
                      <img src={clipThumbnail} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                    )}
                    <span className="text-xs text-muted-foreground truncate flex-1">{clipLabel}</span>
                    <button
                      onClick={() => onExpandChange?.(null)}
                      aria-label="Collapse"
                      title="Collapse"
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {expanded === "speed" && speedControl && (
                    <div className="space-y-3">
                      {/* Exact current speed - shows the AI narration-fit's
                          fractional value (e.g. 1.33x), which the presets
                          alone can't represent. */}
                      <div className="text-center">
                        <span className="text-2xl font-bold text-foreground tabular-nums">
                          {speedControl.value.toFixed(2)}×
                        </span>
                      </div>
                      {sliderRow(speedControl, {
                        min: speedControl.min,
                        max: speedControl.max,
                        step: 0.05,
                        ariaLabel: "Playback speed",
                      })}
                      <div className="flex justify-between text-xs text-muted-foreground -mt-1">
                        <span>{speedControl.min}×</span>
                        <span>{speedControl.max}×</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {speedControl.presets.map((s) => (
                          <button
                            key={s}
                            onClick={() => { speedControl.onDraft(s); speedControl.onCommit(s); }}
                            className={`py-2 rounded-lg border text-xs font-medium transition-colors active:scale-95 ${
                              Math.abs(speedControl.value - s) < 0.001
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-foreground hover:bg-muted"
                            }`}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {expanded === "volume" && volumeControl && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5">
                        <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
                        {sliderRow(volumeControl, { min: 0, max: 1.5, step: 0.05, ariaLabel: "Clip volume" })}
                        <span className="text-xs font-medium text-foreground w-10 text-right tabular-nums shrink-0">
                          {Math.round(volumeControl.value * 100)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {volumeControl.presets.map((v) => (
                          <button
                            key={v}
                            onClick={() => { volumeControl.onDraft(v); volumeControl.onCommit(v); }}
                            className={`py-2 rounded-lg border text-xs font-medium transition-colors active:scale-95 ${
                              Math.abs(volumeControl.value - v) < 0.001
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-foreground hover:bg-muted"
                            }`}
                          >
                            {v === 0 ? "Mute" : `${Math.round(v * 100)}%`}
                          </button>
                        ))}
                      </div>

                      {/* Fade in/out - same panel as Volume (not a separate
                          action), same commit-on-release convention as every
                          slider above so dragging doesn't flood the save
                          endpoint. 0-5s in 0.5s steps, matching the backend's
                          clamp. */}
                      <div className="pt-3 border-t border-border space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <TrendingUp className="w-3.5 h-3.5" />
                              Fade in
                            </span>
                            <span className="text-xs font-medium text-foreground tabular-nums">
                              {fadeInControl.value.toFixed(1)}s
                            </span>
                          </div>
                          {sliderRow(fadeInControl, { min: 0, max: 5, step: 0.5, ariaLabel: "Fade in duration, seconds" })}
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <TrendingDown className="w-3.5 h-3.5" />
                              Fade out
                            </span>
                            <span className="text-xs font-medium text-foreground tabular-nums">
                              {fadeOutControl.value.toFixed(1)}s
                            </span>
                          </div>
                          {sliderRow(fadeOutControl, { min: 0, max: 5, step: 0.5, ariaLabel: "Fade out duration, seconds" })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

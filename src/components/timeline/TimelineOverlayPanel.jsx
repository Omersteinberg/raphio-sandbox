import { useRef, useState, useEffect, useCallback, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { OVERLAY_FONTS } from "@/lib/overlayFonts";

const MARGIN = 8; // same gap ClipActionPill keeps against the clip / viewport edge

// Strong ease-out (DESIGN-engineering house curve), matching ClipActionPill.
const EASE_OUT = [0.23, 1, 0.32, 1];

// PLACEHOLDER set for Phase 1 ("a few colors," not a full picker, per the
// agreed scope) - white/black cover the common legible-on-video cases, Cream
// matches the ENABLE_MOCK_OVERLAYS seed data's own second overlay color, and
// Terracotta is the one brand accent. Revisit if design wants a curated palette.
const PRESET_COLORS = [
  { label: "White", value: "#FFFFFF" },
  { label: "Black", value: "#000000" },
  { label: "Cream", value: "#F5F0EB" },
  { label: "Terracotta", value: "#C1440E" },
  { label: "Warm Gray", value: "#6B5E5A" },
];

// 3x3 grid, matching merge-api's textOverlayFilter.js ANCHORS set exactly (9
// values - top/center/bottom x left/center/right). Order here is visual
// (row-major, top to bottom) so the grid reads the same as the anchor it
// represents.
const ANCHOR_GRID = [
  ["top-left", "top-center", "top-right"],
  ["center-left", "center", "center-right"],
  ["bottom-left", "bottom-center", "bottom-right"],
];

const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 120;

/**
 * Floating multi-field editor for the selected text overlay
 * (timeline.selectedOverlay). A sibling to ClipActionPill, not an extension
 * of it - that component's expand-in-place mechanism is built for 1-2
 * sliders, and this needs a textarea, a font picker, a color swatch row, and
 * a 9-point anchor grid all at once, which would make ClipActionPill's
 * compact row/expanded-body split unreadable.
 *
 * Positioning reuses ONLY ClipActionPill's mechanism (position: fixed,
 * computed from the selected overlay block's own getBoundingClientRect via
 * `anchorRect`, prefer-above-fall-back-below, clamp on every edge) - the
 * same reasoning applies here: rendered outside the timeline's
 * overflow-hidden ancestors so it isn't clipped, and re-anchors on
 * scroll/resize (handled by the caller, same as pillAnchorRect).
 *
 * Every control commits immediately via `onUpdate` (-> timeline.updateOverlay)
 * on change/release, never on close - there is no separate "save" step, so
 * dismissing the panel (click elsewhere, Escape, or deselecting the block)
 * never loses an edit that was already made.
 */
export default function TimelineOverlayPanel({ anchorRect, overlay, onUpdate, onClose }) {
  const panelRef = useRef(null);
  const [pos, setPos] = useState(null);

  const reposition = useCallback(() => {
    if (!anchorRect || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

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
  }, [anchorRect]);

  useLayoutEffect(() => {
    reposition();
  }, [reposition]);

  // Dismiss on Escape - unlike TimelineEditor's global key handler (which
  // skips while a text input is focused, so Delete/zoom shortcuts don't
  // fight with typing), Escape-to-close is unambiguous regardless of focus,
  // including from inside the textarea below.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Dismiss on a click outside the panel. Clicks on ANY overlay block are
  // excluded - those already drive selection themselves (TimelineOverlayItem's
  // own onClick), so closing here first would just cause a flicker before
  // the newly (or re-)selected block reopens the panel.
  useEffect(() => {
    const onPointerDown = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      if (e.target.closest?.("[data-overlay-id]")) return;
      onClose();
    };
    document.addEventListener("mousedown", onPointerDown, true);
    return () => document.removeEventListener("mousedown", onPointerDown, true);
  }, [onClose]);

  // Local draft for the font-size slider only, so dragging feels smooth
  // (commit on release, same convention as ClipActionPill's Speed/Volume
  // sliders) - every other control here is a discrete click/select with
  // nothing to smooth, so it commits straight through `onUpdate`.
  const [fontSizeDraft, setFontSizeDraft] = useState(overlay.fontSize);
  useEffect(() => {
    setFontSizeDraft(overlay.fontSize);
  }, [overlay.id, overlay.fontSize]);

  return (
    <AnimatePresence>
      {anchorRect && (
        <motion.div
          ref={panelRef}
          className="fixed z-[60] w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? "visible" : "hidden" }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15, ease: EASE_OUT }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <span className="text-xs font-semibold text-foreground">Text overlay</span>
            <button
              onClick={onClose}
              aria-label="Close"
              title="Close"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-3 pb-3 space-y-3 max-h-[70vh] overflow-y-auto">
            {/* Content */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Text</label>
              <textarea
                value={overlay.text}
                onChange={(e) => onUpdate({ text: e.target.value })}
                rows={2}
                placeholder="Overlay text"
                className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:border-primary"
              />
            </div>

            {/* Font */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Font</label>
              <select
                value={overlay.fontId}
                onChange={(e) => onUpdate({ fontId: e.target.value })}
                className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
              >
                {OVERLAY_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Font size */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Size</span>
                <span className="text-xs font-medium text-foreground tabular-nums">{Math.round(fontSizeDraft)}px</span>
              </div>
              <input
                type="range"
                min={FONT_SIZE_MIN}
                max={FONT_SIZE_MAX}
                step={1}
                value={fontSizeDraft}
                onChange={(e) => setFontSizeDraft(Number(e.target.value))}
                onPointerUp={() => onUpdate({ fontSize: fontSizeDraft })}
                onTouchEnd={() => onUpdate({ fontSize: fontSizeDraft })}
                aria-label="Font size"
                className="w-full range-terra"
                style={{ "--range-progress": `${((fontSizeDraft - FONT_SIZE_MIN) / (FONT_SIZE_MAX - FONT_SIZE_MIN)) * 100}%` }}
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Color</label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => onUpdate({ color: c.value })}
                    title={c.label}
                    aria-label={c.label}
                    aria-pressed={overlay.color?.toLowerCase() === c.value.toLowerCase()}
                    className={`w-7 h-7 rounded-full border-2 transition-transform active:scale-90 ${
                      overlay.color?.toLowerCase() === c.value.toLowerCase()
                        ? "border-primary scale-110"
                        : "border-border"
                    }`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>

            {/* Anchor */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Position</label>
              <div className="grid grid-cols-3 gap-1.5 w-28">
                {ANCHOR_GRID.flat().map((a) => (
                  <button
                    key={a}
                    onClick={() => onUpdate({ anchor: a })}
                    title={a.replace("-", " ")}
                    aria-label={`Anchor ${a.replace("-", " ")}`}
                    aria-pressed={overlay.anchor === a}
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors active:scale-95 ${
                      overlay.anchor === a
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${overlay.anchor === a ? "bg-primary" : "bg-muted-foreground/50"}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Size (spatial width) - read-only here; drag the block's own
                edge handles on the Text track to change it. */}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Box width</span>
                <span className="text-xs font-medium text-foreground tabular-nums">
                  {Math.round(overlay.widthPercent)}%
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Drag the block's edge handles on the Text track to resize.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

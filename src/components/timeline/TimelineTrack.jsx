import { Film, Music, Mic, Blend, Type } from "lucide-react";
import TimelineItem from "./TimelineItem";
import TimelineOverlayItem from "./TimelineOverlayItem";
import { TRACK_LABEL_WIDTH } from "@/lib/timelineLayout";

const TRANSITION_NAMES = {
  crossfade: "Crossfade",
  fadeToBlack: "Fade to black",
  wipe: "Wipe",
  slide: "Slide",
};

// Human name for a transition type, defaulting to "Transition".
function transitionName(type) {
  return TRANSITION_NAMES[type] || "Transition";
}

export default function TimelineTrack({
  label,
  trackType,
  trackIndex,
  items,
  height,
  pixelsPerSecond,
  selectedItem,
  onSelectItem,
  onItemDragStart,
  onItemEdit,
  getSection,
  getAudioAsset,
  onDrop,
  onDragOver,
  onDragLeave,
  isDropTarget = false,
  overlappingItems = new Set(),
  dragPreview = null,
  sessionId,
  boundaries = null, // VIDEO row only - see TimelineCanvas's videoBoundaries
  onBoundaryClick,
  onUpdateOverlay, // TEXT row only - (itemId, overlayId, updates) => void, mirrors useTimeline's updateOverlay
  labelWidth = TRACK_LABEL_WIDTH,
}) {
  // Which ROW this is, not what any item stores: the canvas renders Narration
  // at trackIndex 0 and the merged Audio/Music row at trackIndex 1. Icon and
  // colour both key off that same trackIndex, not off anything an individual
  // item carries (items keep their own per-clip kind via TimelineItem's own
  // audioKind() - this is only the row's ambient treatment).
  const isNarration = trackType === "AUDIO" && trackIndex === 0;
  const Icon = trackType === "VIDEO" ? Film : trackType === "TEXT" ? Type : isNarration ? Mic : Music;
  // One shared neutral surface for every row (no per-track hue wash) - a soft
  // warm-paper tint just barely lifted off the canvas's own cream background,
  // with a hairline (not a hard border) between rows. Row identity now comes
  // entirely from the icon/label and the clips themselves, matching the
  // reference's "Elevated Surface" treatment rather than color-coding the
  // row backgrounds.
  const trackColor = "bg-card/50";
  const borderColor = "border-border/25";

  return (
    <div
      className={`relative flex ${trackColor} border-b ${borderColor} ${
        isDropTarget ? "ring-2 ring-inset ring-accent" : ""
      }`}
      // A hairline inner highlight along the row's top edge - the "lifted
      // surface" cue (a soft light catching the top edge, per Elevated
      // Surface) without an actual drop-shadow, which would read as too
      // heavy stacked three times in a row this short. Warm Paper
      // (--surface, #FFFAF7) rather than plain white, so the highlight stays
      // on the documented warm palette instead of a raw neutral color.
      style={{ height, boxShadow: "inset 0 1px 0 rgba(255, 250, 247, 0.6)" }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {/* Track Label. Width is the canvas's labelWidth (icon only on mobile),
          which TimelineCanvas also uses to convert pointer positions to times. */}
      <div
        className="relative z-10 flex-shrink-0 flex items-center justify-center md:justify-start gap-2.5 md:pl-4 md:pr-2 border-r border-border/60"
        style={{ width: labelWidth }}
        title={label}
      >
        <Icon className="w-4 h-4 text-foreground shrink-0" aria-hidden="true" />
        <span className="sr-only md:not-sr-only text-xs font-bold text-foreground tracking-tight leading-tight">{label}</span>
      </div>

      {/* Track Content */}
      <div className="flex-1 relative">
        {/* No vertical guide lines through the track body any more (an
            earlier pass drew a hairline down from each major ruler
            timestamp) - explicitly reverted per feedback. Major/minor tick
            marks now live on the ruler strip only (TimelineRuler.jsx); the
            track body stays clear behind the clips. */}

        {/* Items */}
        {items.map((item) => {
          if (trackType === "TEXT") {
            return (
              <TimelineOverlayItem
                key={item.id}
                item={item}
                height={height - 16}
                pixelsPerSecond={pixelsPerSecond}
                isSelected={selectedItem === item.id}
                onSelect={() => onSelectItem(item.id)}
                onResize={(widthPercent) => onUpdateOverlay?.(item.parentItemId, item.id, { widthPercent })}
              />
            );
          }

          const section = item.sectionId ? getSection(item.sectionId) : null;

          return (
            <TimelineItem
              key={item.id}
              item={item}
              trackType={trackType}
              height={height - 16}
              pixelsPerSecond={pixelsPerSecond}
              isSelected={selectedItem === item.id}
              onSelect={() => onSelectItem(item.id)}
              onDragStart={onItemDragStart}
              onEdit={() => onItemEdit(item)}
              section={section}
              audioAsset={item.audioAssetId ? getAudioAsset(item.audioAssetId) : null}
              isOverlapping={overlappingItems.has(item.id)}
              dragPreviewOffset={dragPreview?.itemId === item.id ? dragPreview.previewStartTime - item.startTime : 0}
              dragPreviewDuration={dragPreview?.itemId === item.id ? dragPreview.previewDuration : null}
              activeDragType={dragPreview?.itemId === item.id ? dragPreview.dragType : null}
              sessionId={sessionId}
            />
          );
        })}

        {/* Empty state */}
        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-start pl-3 whitespace-nowrap text-muted-foreground text-sm pointer-events-none">
            {trackType === "TEXT" ? "Text overlays are coming soon" : `Drag ${trackType.toLowerCase()} assets here`}
          </div>
        )}

        {/* Transition boundaries - VIDEO row only, one per pair of adjacent
            (touching, no gap) clips. Position math (left = b.time *
            pixelsPerSecond, centred on the seam via -translate-x/y-1/2)
            unchanged. Reverted to the smaller diamond/plus design (a later
            "premium redesign" pass shrank these further and made the resting
            no-transition marker nearly invisible at rest - explicitly rolled
            back per feedback, not carried forward).

            No transition yet: a small diamond at rest (scale-[0.75] of the
            24px hit box, ~18px), opaque (bg-card + border + shadow-sm) so it
            reads clearly against every track colour at a glance, showing the
            same Blend icon as an active transition (counter-rotated so it
            stays upright inside the rotated diamond) rather than sitting
            empty until hovered - a blank circle read as decoration, not an
            actionable control. Hover grows it to full size, un-rotates the
            diamond into a circle, and shifts the icon to the primary accent
            for emphasis.

            Active transition: stays visibly present at rest (no hover
            needed) at a smaller resting scale (0.85 of 24px) so it doesn't
            visually overlap either clip's own label.

            The 24px box itself never changes size (only `transform: scale`
            does), so the tap target stays consistent on touch, where hover
            never fires. Only `transform`/`background-color`/`border-color`/
            `color` animate - GPU-only, cheap regardless of boundary count. */}
        {boundaries && boundaries.map((b) => (
          <button
            key={b.id}
            onClick={(e) => { e.stopPropagation(); onBoundaryClick?.(b); }}
            title={b.transition ? `${transitionName(b.transition.type)}, ${b.transition.duration.toFixed(1)}s` : "Add transition"}
            aria-label={b.transition ? `Edit transition, currently ${transitionName(b.transition.type).toLowerCase()} ${b.transition.duration.toFixed(1)} seconds` : "Add transition between these clips"}
            className={`group/boundary absolute z-40 w-6 h-6 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-90 ${
              b.transition
                ? "scale-[0.85] bg-primary text-primary-foreground shadow-sm hover:scale-100"
                : "scale-[0.75] rotate-45 border border-border bg-card text-muted-foreground shadow-sm hover:scale-100 hover:rotate-0 hover:border-primary/50 hover:text-primary"
            }`}
            style={{ left: b.time * pixelsPerSecond, top: "50%" }}
          >
            <Blend
              className={`w-3 h-3 ${
                b.transition ? "" : "-rotate-45 transition-transform duration-150 ease-out group-hover/boundary:rotate-0"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

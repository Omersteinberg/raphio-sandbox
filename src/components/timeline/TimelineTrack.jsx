import { Film, Music, Eye, EyeOff, Blend } from "lucide-react";
import TimelineItem from "./TimelineItem";

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
  isHidden = false,
  onToggleVisibility,
  sessionId,
  boundaries = null, // VIDEO row only - see TimelineCanvas's videoBoundaries
  onBoundaryClick,
}) {
  // Which ROW this is, not what any item stores: the canvas renders Narration,
  // Audio and Music as trackIndex 0, 1 and 2. This read 1, the uploads row, so
  // the green music styling sat on Audio and Music got the blue meant for it.
  // (Items themselves are grouped by source kind, which is why only the colours
  // were ever wrong and the clips still landed on the right rows.)
  const isMusic = trackType === "AUDIO" && trackIndex === 2;
  const Icon = trackType === "VIDEO" ? Film : Music;
  const trackColor = trackType === "VIDEO" ? "bg-primary/5" : isMusic ? "bg-green-500/10" : "bg-blue-500/10";
  const borderColor = trackType === "VIDEO" ? "border-primary/20" : isMusic ? "border-green-500/25" : "border-blue-500/25";

  return (
    <div
      className={`relative flex ${trackColor} border-b ${borderColor} ${
        isDropTarget ? "ring-2 ring-inset ring-accent" : ""
      }`}
      style={{ height }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {/* Track Label. Its width is TRACK_LABEL_WIDTH in TimelineCanvas, which
          converts pointer positions to times against it - keep the two in step
          (this stays w-20 / 80px for exactly that reason; only its internal
          treatment is restyled). Left-aligned with a small inset rather than
          centred, so the four row labels form a clean vertical edge. */}
      <div className="w-20 flex-shrink-0 bg-card border-r border-border flex items-center gap-1.5 pl-2.5 pr-1 relative group">
        <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-[11px] font-medium text-muted-foreground truncate">{label}</span>
        {/* Show/hide is local + visual only - it never touches item data or
            the export, purely what's rendered in this row right now. */}
        <button
          onClick={onToggleVisibility}
          title={isHidden ? `Show ${label}` : `Hide ${label}`}
          aria-label={isHidden ? `Show ${label}` : `Hide ${label}`}
          className="absolute right-1 p-1 rounded-md text-muted-foreground/50 hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
        >
          {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </button>
      </div>

      {/* Track Content */}
      <div className={`flex-1 relative ${isHidden ? "opacity-25 pointer-events-none" : ""}`}>
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: Math.ceil(1000 / pixelsPerSecond) }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 h-full w-px bg-border/50"
              style={{ left: i * pixelsPerSecond }}
            />
          ))}
        </div>

        {/* Items */}
        {items.map((item) => {
          const section = item.sectionId ? getSection(item.sectionId) : null;

          return (
            <TimelineItem
              key={item.id}
              item={item}
              trackType={trackType}
              height={height - 12}
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
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm pointer-events-none">
            Drag {trackType.toLowerCase()} assets here
          </div>
        )}

        {/* Transition boundaries - VIDEO row only, one per pair of adjacent
            (touching, no gap) clips. Sits above idle clips (z-40, below a
            clip actively being dragged at z-50) so it stays clickable right
            at the seam. Always at least dimly visible rather than
            hover-revealed: hover has no equivalent on touch, and an active
            transition needs to read as present without clicking in to check. */}
        {boundaries && boundaries.map((b) => (
          <button
            key={b.id}
            onClick={(e) => { e.stopPropagation(); onBoundaryClick?.(b); }}
            title={b.transition ? `Crossfade, ${b.transition.duration.toFixed(1)}s` : "Add transition"}
            aria-label={b.transition ? `Edit transition, currently crossfade ${b.transition.duration.toFixed(1)} seconds` : "Add transition between these clips"}
            className={`absolute z-40 w-8 h-8 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border transition-colors ${
              b.transition
                ? "bg-primary border-primary-foreground/40 text-primary-foreground shadow-sm"
                : "bg-card/80 border-border text-muted-foreground/70 opacity-70 hover:opacity-100 hover:text-foreground hover:border-foreground/30"
            }`}
            style={{ left: b.time * pixelsPerSecond, top: "50%" }}
          >
            <Blend className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

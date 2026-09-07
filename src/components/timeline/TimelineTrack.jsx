import { Film, Music } from "lucide-react";
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
          converts pointer positions to times against it - keep the two in step. */}
      <div className="w-20 flex-shrink-0 bg-card border-r border-border flex items-center justify-center gap-1">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>

      {/* Track Content */}
      <div className="flex-1 relative">
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: Math.ceil(1000 / pixelsPerSecond) }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 h-full w-px bg-border"
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
              height={height - 8}
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
            />
          );
        })}

        {/* Empty state */}
        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm pointer-events-none">
            Drag {trackType.toLowerCase()} assets here
          </div>
        )}
      </div>
    </div>
  );
}

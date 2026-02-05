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
  onNarrationEdit,
  getSection,
  getAudioAsset,
  onDrop,
  onDragOver,
  overlappingItems = new Set(),
  dragPreview = null,
}) {
  const Icon = trackType === "VIDEO" ? Film : Music;
  const trackColor = trackType === "VIDEO" ? "bg-purple-900/30" : "bg-blue-900/30";
  const borderColor = trackType === "VIDEO" ? "border-purple-800" : "border-blue-800";

  return (
    <div
      className={`relative flex ${trackColor} border-b ${borderColor}`}
      style={{ height }}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {/* Track Label */}
      <div className="w-20 flex-shrink-0 bg-gray-800 border-r border-gray-700 flex items-center justify-center gap-1">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-400">{label}</span>
      </div>

      {/* Track Content */}
      <div className="flex-1 relative">
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: Math.ceil(1000 / pixelsPerSecond) }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 h-full w-px bg-gray-700/30"
              style={{ left: i * pixelsPerSecond }}
            />
          ))}
        </div>

        {/* Items */}
        {items.map((item) => {
          const section = item.sectionId ? getSection(item.sectionId) : null;
          const isNarration = trackType === "AUDIO" && section && !item.audioAssetId;

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
              onEdit={() => isNarration && onNarrationEdit ? onNarrationEdit(item, section) : onItemEdit(item)}
              section={section}
              audioAsset={item.audioAssetId ? getAudioAsset(item.audioAssetId) : null}
              isOverlapping={overlappingItems.has(item.id)}
              dragPreviewOffset={dragPreview?.itemId === item.id ? dragPreview.previewStartTime - item.startTime : 0}
            />
          );
        })}

        {/* Empty state */}
        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm pointer-events-none">
            Drag {trackType.toLowerCase()} assets here
          </div>
        )}
      </div>
    </div>
  );
}

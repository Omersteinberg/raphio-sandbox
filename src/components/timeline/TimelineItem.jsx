import { useRef } from "react";
import { motion } from "framer-motion";
import { Film, Music, Volume2, Gauge } from "lucide-react";

export default function TimelineItem({
  item,
  trackType,
  height,
  pixelsPerSecond,
  isSelected,
  onSelect,
  onDragStart,
  onEdit,
  section,
  audioAsset,
}) {
  const itemRef = useRef(null);

  const left = item.startTime * pixelsPerSecond;
  const width = item.duration * pixelsPerSecond;

  // Get display info
  let label = "";
  let thumbnail = null;
  let hasSpeed = item.speed && item.speed !== 1.0;
  let hasVolume = item.volume && item.volume !== 1.0;

  if (trackType === "VIDEO" && section) {
    label = section.narrationText?.substring(0, 30) || `Clip ${section.orderIndex + 1}`;
    thumbnail = section.imageUrl;
  } else if (trackType === "AUDIO") {
    if (audioAsset) {
      label = audioAsset.name || "Audio";
    } else if (section) {
      label = `Narration: ${section.narrationText?.substring(0, 20) || "..."}`;
    }
  }

  // Colors based on track type
  const bgColor = trackType === "VIDEO"
    ? isSelected ? "bg-purple-600" : "bg-purple-700"
    : isSelected ? "bg-blue-600" : "bg-blue-700";

  const borderColor = isSelected ? "border-white" : "border-transparent";

  return (
    <motion.div
      ref={itemRef}
      className={`absolute top-1 rounded ${bgColor} border-2 ${borderColor} cursor-pointer overflow-hidden group`}
      style={{
        left,
        width: Math.max(width, 20),
        height,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
      whileHover={{ scale: 1.01 }}
      layout
    >
      {/* Thumbnail for video items */}
      {trackType === "VIDEO" && thumbnail && (
        <div className="absolute inset-0 opacity-50">
          <img
            src={thumbnail}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content overlay */}
      <div className="absolute inset-0 p-1 flex flex-col justify-between">
        {/* Label */}
        <div className="flex items-center gap-1 min-w-0">
          {trackType === "VIDEO" ? (
            <Film className="w-3 h-3 flex-shrink-0 text-white/70" />
          ) : (
            <Music className="w-3 h-3 flex-shrink-0 text-white/70" />
          )}
          <span className="text-xs text-white truncate">{label}</span>
        </div>

        {/* Indicators */}
        <div className="flex items-center gap-1">
          {hasSpeed && (
            <div className="flex items-center gap-0.5 text-xs text-white/70 bg-black/30 px-1 rounded">
              <Gauge className="w-3 h-3" />
              {item.speed}x
            </div>
          )}
          {hasVolume && trackType === "AUDIO" && (
            <div className="flex items-center gap-0.5 text-xs text-white/70 bg-black/30 px-1 rounded">
              <Volume2 className="w-3 h-3" />
              {Math.round(item.volume * 100)}%
            </div>
          )}
          {item.trimStart > 0 && (
            <div className="text-xs text-white/70 bg-black/30 px-1 rounded">
              T
            </div>
          )}
        </div>
      </div>

      {/* Trim handles */}
      <div
        className="absolute left-0 top-0 w-2 h-full cursor-ew-resize bg-white/0 hover:bg-white/30 transition-colors"
        onMouseDown={(e) => {
          e.stopPropagation();
          onDragStart(item, "trim-start", e);
        }}
      />
      <div
        className="absolute right-0 top-0 w-2 h-full cursor-ew-resize bg-white/0 hover:bg-white/30 transition-colors"
        onMouseDown={(e) => {
          e.stopPropagation();
          onDragStart(item, "trim-end", e);
        }}
      />

      {/* Move handle (center) */}
      <div
        className="absolute inset-x-2 inset-y-0 cursor-move"
        onMouseDown={(e) => {
          e.stopPropagation();
          onDragStart(item, "move", e);
        }}
      />
    </motion.div>
  );
}

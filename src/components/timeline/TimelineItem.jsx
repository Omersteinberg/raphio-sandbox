import { useRef } from "react";
import { motion } from "framer-motion";
import { Film, Music, Mic, Upload, Volume2, Scissors, ChevronLeft, ChevronRight } from "lucide-react";

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
  isOverlapping = false,
  dragPreviewOffset = 0,
  dragPreviewDuration = null,
}) {
  const itemRef = useRef(null);
  const lastTapRef = useRef(0);

  // Apply drag preview offset to the position
  const baseLeft = item.startTime * pixelsPerSecond;
  const left = baseLeft + (dragPreviewOffset * pixelsPerSecond);
  const effectiveDuration = dragPreviewDuration != null ? dragPreviewDuration : item.duration;
  const width = effectiveDuration * pixelsPerSecond;
  const isDragging = dragPreviewOffset !== 0 || dragPreviewDuration != null;

  // Get display info
  let label = "";
  let thumbnail = null;
  let hasVolume = item.volume && item.volume !== 1.0;
  const isTrimmed = (item.trimStart > 0) || (item.trimEnd != null);

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

  // Audio row kind, by source (matches TimelineCanvas.audioKind): narration
  // (section narration or TTS voice), music (AI background music), else upload.
  const audioKind =
    trackType !== "AUDIO"
      ? null
      : item.sectionId || audioAsset?.sourceType === "TTS"
      ? "narration"
      : audioAsset?.sourceType === "AI_MUSIC"
      ? "music"
      : "audio";
  // Colors match the Assets colour coding: Narration = blue, Audio = green,
  // Music = purple (video = brand terracotta; overlaps = red/orange warning).
  const getBackgroundColor = () => {
    if (isOverlapping) {
      return trackType === "VIDEO"
        ? isSelected ? "bg-red-400" : "bg-red-500"
        : isSelected ? "bg-orange-400" : "bg-orange-500";
    }
    if (trackType === "VIDEO") {
      return isSelected ? "bg-primary" : "bg-primary/80";
    }
    if (audioKind === "music") return isSelected ? "bg-purple-600" : "bg-purple-500";
    if (audioKind === "audio") return isSelected ? "bg-green-600" : "bg-green-500";
    return isSelected ? "bg-blue-500" : "bg-blue-400"; // narration
  };

  const bgColor = getBackgroundColor();
  const borderColor = isSelected ? "border-primary-foreground" : isOverlapping ? "border-red-300" : "border-transparent";

  return (
    <motion.div
      ref={itemRef}
      className={`absolute top-1 rounded ${bgColor} border-2 ${borderColor} cursor-pointer overflow-hidden group ${isDragging ? "shadow-xl z-50" : ""}`}
      style={{
        left,
        width: Math.max(width, 20),
        height,
        opacity: isDragging ? 0.9 : 1,
        transform: isDragging ? "scale(1.02)" : undefined,
        transition: isDragging ? "none" : "left 0.1s ease-out",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      whileHover={{ scale: isDragging ? 1.02 : 1.01 }}
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
          ) : audioKind === "narration" ? (
            <Mic className="w-3 h-3 flex-shrink-0 text-white/70" />
          ) : audioKind === "music" ? (
            <Music className="w-3 h-3 flex-shrink-0 text-white/70" />
          ) : (
            <Upload className="w-3 h-3 flex-shrink-0 text-white/70" />
          )}
          <span className="text-xs text-white truncate">{label}</span>
        </div>

        {/* Indicators */}
        <div className="flex items-center gap-1">
          {hasVolume && trackType === "AUDIO" && (
            <div className="flex items-center gap-0.5 text-xs text-white/70 bg-black/30 px-1 rounded">
              <Volume2 className="w-3 h-3" />
              {Math.round(item.volume * 100)}%
            </div>
          )}
          {isTrimmed && (
            <div className="flex items-center gap-0.5 text-xs text-white/70 bg-black/30 px-1 rounded">
              <Scissors className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>

      {/* Move handle - full clip. Trim via the edge handles (or double-tap for the modal). */}
      <div
        className="absolute inset-0 cursor-move touch-none"
        onMouseDown={(e) => {
          e.stopPropagation();
          onDragStart(item, "move", e);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          onDragStart(item, "move", e);
        }}
      />

      {/* Trim handles - shown when selected; drag the edges to trim (right edge
          stays put when trimming the left). They sit above the move handle. */}
      {isSelected && (
        <>
          <div
            className="absolute left-0 top-0 bottom-0 w-5 z-20 flex items-center justify-center cursor-ew-resize touch-none bg-white rounded-l"
            onMouseDown={(e) => { e.stopPropagation(); onDragStart(item, "trim-start", e); }}
            onTouchStart={(e) => { e.stopPropagation(); onDragStart(item, "trim-start", e); }}
          >
            <ChevronLeft className="w-4 h-4 text-black/70" />
          </div>
          <div
            className="absolute right-0 top-0 bottom-0 w-5 z-20 flex items-center justify-center cursor-ew-resize touch-none bg-white rounded-r"
            onMouseDown={(e) => { e.stopPropagation(); onDragStart(item, "trim-end", e); }}
            onTouchStart={(e) => { e.stopPropagation(); onDragStart(item, "trim-end", e); }}
          >
            <ChevronRight className="w-4 h-4 text-black/70" />
          </div>
        </>
      )}
    </motion.div>
  );
}

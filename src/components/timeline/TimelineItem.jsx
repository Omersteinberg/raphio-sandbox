import { useRef } from "react";
import { motion } from "framer-motion";
import { Film, Music, Mic, Upload, Volume2, Scissors } from "lucide-react";

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
  activeDragType = null,
}) {
  const itemRef = useRef(null);
  const lastTapRef = useRef(0);
  const DOUBLE_TAP_MS = 300;

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
  // Selection reads as an outline only - no fill/overlay change - so the
  // thumbnail underneath never gets obscured. A white inner ring plus a
  // terracotta outer ring (layered box-shadow) keeps the brand color visible
  // even on a video clip, whose own fill is already terracotta.
  const borderColor = isOverlapping && !isSelected ? "border-red-300" : "border-transparent";
  const selectionRing = isSelected
    ? "0 0 0 1px hsl(var(--primary-foreground)), 0 0 0 2px rgb(var(--terra-rgb))"
    : undefined;

  return (
    <motion.div
      ref={itemRef}
      className={`absolute top-1 rounded ${bgColor} border-2 ${borderColor} cursor-pointer overflow-hidden group ${isDragging ? "z-50" : ""}`}
      animate={{
        left,
        width: Math.max(width, 20),
        scale: isDragging ? 1.02 : 1,
        opacity: isDragging ? 0.9 : 1,
      }}
      transition={isDragging ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 32 }}
      style={{
        height,
        boxShadow: isDragging
          ? [selectionRing, "0 8px 24px rgba(0,0,0,0.35)"].filter(Boolean).join(", ")
          : selectionRing,
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

      {/* Move handle - full clip. Trim via the edge handles (or double-click /
          double-tap for the trim + waveform modal). */}
      <div
        className="absolute inset-0 cursor-move touch-none"
        onMouseDown={(e) => {
          e.stopPropagation();
          onDragStart(item, "move", e);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          const now = Date.now();
          if (now - lastTapRef.current < DOUBLE_TAP_MS) {
            lastTapRef.current = 0;
            onEdit();
            return;
          }
          lastTapRef.current = now;
          onDragStart(item, "move", e);
        }}
      />

      {/* Trim handles - shown when selected; drag the edges to trim (right edge
          stays put when trimming the left). They sit above the move handle.
          The DRAWN grip is a slim terracotta bar (~4px) so it doesn't
          dominate the clip, but the invisible hit area around it stays a
          full w-6 (24px) - a bigger tap/drag target than what's drawn is the
          standard, correct pattern for small controls, especially on touch. */}
      {isSelected && (
        <>
          <div
            className="absolute left-0 top-0 bottom-0 w-6 z-20 flex items-center justify-center cursor-ew-resize touch-none"
            onMouseDown={(e) => { e.stopPropagation(); onDragStart(item, "trim-start", e); }}
            onTouchStart={(e) => { e.stopPropagation(); onDragStart(item, "trim-start", e); }}
          >
            <div
              className={`rounded-full bg-terra transition-all ${
                activeDragType === "trim-start" ? "w-1.5 brightness-125" : "w-1 hover:brightness-110"
              }`}
              style={{ height: Math.max(height - 8, 8) }}
            />
          </div>
          <div
            className="absolute right-0 top-0 bottom-0 w-6 z-20 flex items-center justify-center cursor-ew-resize touch-none"
            onMouseDown={(e) => { e.stopPropagation(); onDragStart(item, "trim-end", e); }}
            onTouchStart={(e) => { e.stopPropagation(); onDragStart(item, "trim-end", e); }}
          >
            <div
              className={`rounded-full bg-terra transition-all ${
                activeDragType === "trim-end" ? "w-1.5 brightness-125" : "w-1 hover:brightness-110"
              }`}
              style={{ height: Math.max(height - 8, 8) }}
            />
          </div>

          {/* Cut-point cue: a bright line at the exact edge currently being
              trimmed, drawn over the handle itself so it stays visible
              regardless of the clip's own fill color. */}
          {activeDragType === "trim-start" && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_3px_rgba(255,255,255,0.9)] z-30 pointer-events-none" />
          )}
          {activeDragType === "trim-end" && (
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_3px_rgba(255,255,255,0.9)] z-30 pointer-events-none" />
          )}
        </>
      )}
    </motion.div>
  );
}

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Film, Music, Mic, Upload, Volume2, Scissors } from "lucide-react";
import { getCachedWaveform, setCachedWaveform } from "@/lib/waveformCache";
import { getAudioWaveform, getSectionWaveform } from "@/services/session";

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
  sessionId,
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

  // Track-level waveform. Seeded from the shared cache (a hit means the trim
  // modal, or another clip's scroll-into-view fetch, already has it) and
  // otherwise fetched lazily when THIS clip actually scrolls into view - see
  // the IntersectionObserver effect below. Never fetches on mount regardless
  // of scroll position, so a long timeline doesn't fire one request per clip
  // the moment it loads.
  const waveformKind = audioAsset?.id ? "audio" : "section";
  const waveformId = audioAsset?.id || item.sectionId;
  const [trackWaveform, setTrackWaveform] = useState(() =>
    trackType === "AUDIO" ? getCachedWaveform(waveformKind, waveformId) : null
  );

  useEffect(() => {
    if (trackType !== "AUDIO" || trackWaveform || !sessionId || !waveformId) return;
    const el = itemRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();
        const fetchWaveform =
          waveformKind === "audio"
            ? getAudioWaveform(sessionId, waveformId)
            : getSectionWaveform(sessionId, waveformId);
        fetchWaveform
          .then((data) => {
            if (Array.isArray(data?.waveform) && data.waveform.length > 0) {
              setTrackWaveform(data.waveform);
              setCachedWaveform(waveformKind, waveformId, data.waveform);
            }
          })
          .catch(() => {
            /* no waveform to show - the clip still works without it */
          });
      },
      // rootMargin starts the fetch slightly before the clip is fully on
      // screen, not once it's already loaded, without needing to know the
      // exact scrolling ancestor - IntersectionObserver accounts for
      // clipping by every ancestor's overflow, not just an explicit root.
      { rootMargin: "200px", threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackType, waveformKind, waveformId, sessionId]);

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
      data-item-id={item.id}
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

      {/* Track-level waveform, cache-hit only (see waveformCache.js) - not
          fetched here, just opportunistically reused if already fetched. */}
      {trackWaveform && (
        <div className="absolute inset-0 flex items-center gap-px px-1 opacity-40 pointer-events-none">
          {trackWaveform.map((v, i) => (
            <div
              key={i}
              className="flex-1 bg-white rounded-sm"
              style={{ height: `${Math.max(8, Math.min(100, Number(v) * 100))}%` }}
            />
          ))}
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
          The DRAWN grip is a short rounded capsule (not full clip height) so
          it reads as a distinct, grabbable handle rather than a divider
          line, but the invisible hit area around it stays a full w-6 (24px)
          - a bigger tap/drag target than what's drawn is the standard,
          correct pattern for small controls, especially on touch. */}
      {isSelected && (
        <>
          <div
            className="absolute left-0 top-0 bottom-0 w-6 z-20 flex items-center justify-center cursor-ew-resize touch-none"
            onMouseDown={(e) => { e.stopPropagation(); onDragStart(item, "trim-start", e); }}
            onTouchStart={(e) => { e.stopPropagation(); onDragStart(item, "trim-start", e); }}
          >
            <div
              className={`rounded-full bg-terra transition-all ${
                activeDragType === "trim-start" ? "w-2 h-8 brightness-125" : "w-1.5 h-6 hover:brightness-110"
              }`}
            />
          </div>
          <div
            className="absolute right-0 top-0 bottom-0 w-6 z-20 flex items-center justify-center cursor-ew-resize touch-none"
            onMouseDown={(e) => { e.stopPropagation(); onDragStart(item, "trim-end", e); }}
            onTouchStart={(e) => { e.stopPropagation(); onDragStart(item, "trim-end", e); }}
          >
            <div
              className={`rounded-full bg-terra transition-all ${
                activeDragType === "trim-end" ? "w-2 h-8 brightness-125" : "w-1.5 h-6 hover:brightness-110"
              }`}
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

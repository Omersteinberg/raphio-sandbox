import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Film, Music, Mic, Upload, Volume2, Scissors } from "lucide-react";
import { getCachedWaveform, setCachedWaveform } from "@/lib/waveformCache";
import { getCachedThumbnails, setCachedThumbnails } from "@/lib/thumbnailCache";
import { getAudioWaveform, getSectionWaveform, getClipThumbnails } from "@/services/session";

// Filmstrip frame count is chosen from the clip's on-screen width at the
// moment it scrolls into view, so a narrow clip doesn't request more frames
// than it could ever show and a very long one doesn't request one per pixel.
const THUMB_TARGET_PX = 60; // ~on-screen width budgeted per frame
const THUMB_MIN_FRAMES = 1;
const THUMB_MAX_FRAMES = 8;

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

  const isDragging = dragPreviewOffset !== 0 || dragPreviewDuration != null;

  // Static (non-dragging) position uses effectiveStartTime, not startTime, so
  // an active transition's overlap is reflected live instead of only showing
  // up after export - a video item with an incoming crossfade renders pulled
  // back to where it actually starts playing, producing the small overlap
  // wedge against its neighbour that a transition implies. While THIS item is
  // being dragged/trimmed, fall back to plain startTime: the drag math in
  // TimelineCanvas/TimelineTrack computes dragPreviewOffset relative to
  // item.startTime, so basing the live position on effectiveStartTime instead
  // would offset the preview from the pointer by a constant amount for the
  // whole gesture. Every other (non-dragged) item keeps rendering from its
  // effective position throughout.
  const baseStartTime = isDragging ? item.startTime : (item.effectiveStartTime ?? item.startTime);
  const baseLeft = baseStartTime * pixelsPerSecond;
  const left = baseLeft + (dragPreviewOffset * pixelsPerSecond);
  const effectiveDuration = dragPreviewDuration != null ? dragPreviewDuration : item.duration;
  const width = effectiveDuration * pixelsPerSecond;

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
  // Video is a neutral dark placeholder, not a terracotta fill - the
  // filmstrip (below) covers it almost immediately, and orange is reserved
  // for the selection ring instead of competing with the thumbnails as a
  // block color. Narration stays blue; the merged Audio/Music row reads as
  // one softened purple family for both uploads and AI music (per-clip icon
  // still tells them apart) rather than the old green/purple split, which
  // fought the visual point of merging them into a single track. Overlap
  // warning colors are unchanged.
  const getBackgroundColor = () => {
    if (isOverlapping) {
      return trackType === "VIDEO"
        ? isSelected ? "bg-red-400" : "bg-red-500"
        : isSelected ? "bg-orange-400" : "bg-orange-500";
    }
    if (trackType === "VIDEO") return "bg-[rgb(var(--ink-warm-rgb))]";
    if (audioKind === "narration") return isSelected ? "bg-blue-500" : "bg-blue-400/90";
    return isSelected ? "bg-purple-500/95" : "bg-purple-400/75"; // audio or music
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

  // Filmstrip thumbnails - identical lazy/on-scroll-into-view + cache pattern
  // as the waveform above, just for VIDEO clips instead of AUDIO. Seeded from
  // the shared cache; otherwise fetched once this clip's DOM node actually
  // scrolls into view, never on mount regardless of scroll position.
  const [clipThumbnails, setClipThumbnails] = useState(() =>
    trackType === "VIDEO" && item.sectionId ? getCachedThumbnails(item.sectionId) : null
  );

  useEffect(() => {
    if (trackType !== "VIDEO" || clipThumbnails || !sessionId || !item.sectionId) return;
    const el = itemRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();
        const frameCount = Math.max(
          THUMB_MIN_FRAMES,
          Math.min(THUMB_MAX_FRAMES, Math.round(width / THUMB_TARGET_PX))
        );
        getClipThumbnails(sessionId, item.sectionId, frameCount)
          .then((data) => {
            if (Array.isArray(data?.thumbnails) && data.thumbnails.length > 0) {
              setClipThumbnails(data.thumbnails);
              setCachedThumbnails(item.sectionId, data.thumbnails);
            }
            // Empty array means the clip isn't rendered yet - not an error,
            // just nothing to cache; the static section.imageUrl cover stays
            // the fallback (see the render below) instead of a blank clip.
          })
          .catch(() => {
            /* no thumbnails to show yet - the clip still works with the static fallback */
          });
      },
      // Same rootMargin/threshold as the waveform observer above, for the
      // same reason: start the fetch slightly before the clip is fully on
      // screen, and account for clipping by every scrolling ancestor.
      { rootMargin: "200px", threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackType, item.sectionId, sessionId]);

  const bgColor = getBackgroundColor();
  // Selection reads as an outline only - no fill/overlay change - so the
  // thumbnail underneath never gets obscured. A white inner ring plus a
  // terracotta outer ring (layered box-shadow) keeps the brand color visible
  // even on a video clip, whose own fill is already terracotta. 3px outer
  // ring (was 2px) so the highlighted border reads clearly as its own thing
  // against the dark grip lines at the trim edges (see below).
  const borderColor = isOverlapping && !isSelected ? "border-red-300" : "border-transparent";
  const selectionRing = isSelected
    ? "0 0 0 1px hsl(var(--primary-foreground)), 0 0 0 3px rgb(var(--terra-rgb))"
    : undefined;

  // Resting elevation, per DESIGN.md's "flat by default, lifted on emphasis":
  // a clip is not floating, but with no shadow at all it read as a bare
  // coloured rectangle rather than a designed element. Video thumbnails and
  // narration waveform clips specifically read as flat even with the
  // ink-tinted shadow every clip already carries - both are the two clip
  // types with real visual texture (imagery / a waveform) sitting on their
  // fill, so a plain dark shadow reads as generic rather than a lift. These
  // two get the terracotta-tinted shadow already used elsewhere in the
  // design system (rgba(193,68,14,0.06), see AppHeader.jsx) instead - still
  // subtle, but ties the lift to the brand accent rather than a neutral ink
  // tone. Audio/Music keeps the original ink shadow, unchanged.
  const restingShadow =
    trackType === "VIDEO" || audioKind === "narration"
      ? "0 2px 6px rgba(193, 68, 14, 0.06), 0 1px 3px rgba(193, 68, 14, 0.04)"
      : "0 1px 2px rgb(var(--ink-rgb) / 0.16), 0 1px 4px rgb(var(--ink-rgb) / 0.10)";
  const dragShadow = "0 8px 24px rgb(var(--ink-warm-rgb) / 0.34)";

  return (
    <motion.div
      ref={itemRef}
      data-item-id={item.id}
      // top-2 (8px), matching TimelineTrack's `height - 16` (was top-1.5 / -12,
      // 6px) - the Clean & Modern pass's "less dense, more breathable" ask.
      // rounded-lg (8px) rather than rounded-md (6px): both sit inside the
      // 6-8px "functional" tier a prior pass already landed correctly, this
      // just moves to the softer end of that same documented range rather
      // than introducing a new one.
      className={`absolute top-2 rounded-lg ${bgColor} border-2 ${borderColor} cursor-pointer overflow-hidden group ${isDragging ? "z-50" : ""}`}
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
          ? [selectionRing, dragShadow].filter(Boolean).join(", ")
          : [selectionRing, restingShadow].filter(Boolean).join(", "),
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      whileHover={{ scale: isDragging ? 1.02 : 1.01 }}
    >
      {/* Filmstrip for video items - a row of real frames evenly filling the
          clip's width once fetched (see the effect above); falls back to the
          single static section cover while frames are still loading, and
          stays on that fallback if the clip isn't rendered yet (empty
          thumbnails array) so the clip is never blank. Every frame, filmstrip
          and single-frame fallback alike, uses object-cover explicitly, so a
          frame's own aspect ratio never stretches to fill the clip's
          (usually different) box - cropping, not distortion. */}
      {trackType === "VIDEO" && (clipThumbnails?.length > 0 || thumbnail) && (
        // gap-px over a dark backing draws a hairline between frames, so a
        // filmstrip reads as a row of separate previews instead of one smeared
        // image. Frames sit at near-full opacity (not full) so the label
        // scrim below stays legible over bright frames without needing to
        // darken the whole strip separately.
        <div className="absolute inset-0 flex gap-px bg-black/30">
          {clipThumbnails?.length > 0
            ? clipThumbnails.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  loading="lazy"
                  className="flex-1 min-w-0 h-full object-cover opacity-90"
                />
              ))
            : (
                <img
                  src={thumbnail}
                  alt=""
                  className="w-full h-full object-cover opacity-90"
                />
              )}
        </div>
      )}

      {/* Track-level waveform, cache-hit only (see waveformCache.js) - not
          fetched here, just opportunistically reused if already fetched.
          Narration keeps a bar-chart reading (compact, higher floor so quiet
          passages don't read as silence) since it sits on a small clip where
          discrete syllable-like bars are legible. Audio/Music renders the
          same data as one continuous filled silhouette (a mirrored area,
          scaled to the clip via SVG's non-uniform viewBox) instead of a row
          of separate rounded bars - closer to how a DAW or CapCut actually
          draws a waveform, and it no longer reads as a bar chart sitting on
          top of the clip. */}
      {trackWaveform && audioKind !== "narration" && (
        // Corrected back down from a prior "make it fuller/richer" pass
        // (sqrt-boosted amplitude, opacity-45) - that read as more prominent
        // than Narration's own waveform, when the two are meant to match in
        // subtlety (same opacity-20, same restrained amplitude), just blue
        // vs purple. Linear v*44 (no sqrt boost) with a low floor/cap mirrors
        // Narration's own clamp(14,88, v*88)% bars: a two-sided SVG spread
        // reads the same visual weight as a one-sided bar at roughly half
        // the numeric range.
        <svg
          className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
          viewBox={`0 0 ${Math.max(trackWaveform.length - 1, 1)} 100`}
          preserveAspectRatio="none"
        >
          <polygon
            fill="white"
            points={[
              ...trackWaveform.map((v, i) => `${i},${50 - Math.max(7, Math.min(44, Number(v) * 44))}`),
              ...trackWaveform
                .map((v, i) => [i, v])
                .reverse()
                .map(([i, v]) => `${i},${50 + Math.max(7, Math.min(44, Number(v) * 44))}`),
            ].join(" ")}
          />
        </svg>
      )}
      {trackWaveform && audioKind === "narration" && (
        // Dropped from opacity-35 - the bright white bars were reading as
        // the most prominent thing on the clip, ahead of the label and the
        // blue fill itself. Now a quieter texture, not the focal point.
        <div className="absolute inset-0 flex items-center gap-px px-1 opacity-20 pointer-events-none">
          {trackWaveform.map((v, i) => (
            <div
              key={i}
              className="flex-1 bg-white rounded-full"
              style={{ height: `${Math.max(14, Math.min(88, Number(v) * 88))}%` }}
            />
          ))}
        </div>
      )}

      {/* Content overlay. The label row carries its own top-down scrim so it
          stays readable over whatever the filmstrip frame underneath happens
          to be - a bright frame used to swallow the white text entirely. The
          scrim fades to transparent well before the clip's midline, so it
          darkens the text band without dimming the preview itself. */}
      <div className="absolute inset-0 flex flex-col justify-between">
        {/* Label. Video's scrim was tuned too light in an earlier pass
            (from-black/45) and read as the title floating on the bare
            thumbnail rather than sitting on a visible overlay - strengthened
            back up so the dark-to-transparent gradient is clearly present
            without covering the image below the text band. The audio rows
            keep their fuller scrim (they're the entire visible surface, not
            an overlay on imagery) at the same compact padding. */}
        <div
          className={`flex items-center gap-1.5 min-w-0 px-1.5 bg-gradient-to-b to-transparent ${
            trackType === "VIDEO" ? "pt-1.5 pb-3 from-black/65 via-black/30" : "pt-1 pb-2 from-black/55 via-black/20"
          }`}
        >
          {trackType === "VIDEO" ? (
            <Film className="w-3 h-3 flex-shrink-0 text-white/80 drop-shadow" />
          ) : audioKind === "narration" ? (
            <Mic className="w-3 h-3 flex-shrink-0 text-white/80 drop-shadow" />
          ) : audioKind === "music" ? (
            <Music className="w-3 h-3 flex-shrink-0 text-white/80 drop-shadow" />
          ) : (
            <Upload className="w-3 h-3 flex-shrink-0 text-white/80 drop-shadow" />
          )}
          <span className="text-xs font-medium text-white truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">{label}</span>
        </div>

        {/* Indicators */}
        <div className="flex items-center gap-1 px-1.5 pb-1">
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
          Two-tone with the selection ring above: the ring is the terracotta
          "this clip is selected" border, the grip lines at each edge are the
          dark ink-warm "grab here to trim" affordance - distinct roles, distinct
          colors, matching the reference's outline+grip-line look. Dark reads
          against every clip fill (terracotta video, blue/green/purple audio)
          without needing a contrast hack. Turns terracotta while actively
          dragged, tying it back to the selection ring as "this edge is now
          the thing moving." The DRAWN bar is a thickened strip flush against
          the clip's own edge (full height), not a floating capsule, so it
          reads as grabbing the clip's own border. The invisible hit area
          stays a full w-6 (24px) - a bigger tap/drag target than what's
          drawn is the standard, correct pattern for small controls,
          especially on touch. */}
      {isSelected && (
        <>
          <div
            className="absolute left-0 top-0 bottom-0 w-6 z-20 flex items-center justify-start cursor-ew-resize touch-none"
            onMouseDown={(e) => { e.stopPropagation(); onDragStart(item, "trim-start", e); }}
            onTouchStart={(e) => { e.stopPropagation(); onDragStart(item, "trim-start", e); }}
          >
            <div
              className={`h-full transition-all ${
                activeDragType === "trim-start" ? "w-[6px] bg-terra" : "w-1 bg-ink-warm group-hover:w-1.5"
              }`}
            />
          </div>
          <div
            className="absolute right-0 top-0 bottom-0 w-6 z-20 flex items-center justify-end cursor-ew-resize touch-none"
            onMouseDown={(e) => { e.stopPropagation(); onDragStart(item, "trim-end", e); }}
            onTouchStart={(e) => { e.stopPropagation(); onDragStart(item, "trim-end", e); }}
          >
            <div
              className={`h-full transition-all ${
                activeDragType === "trim-end" ? "w-[6px] bg-terra" : "w-1 bg-ink-warm group-hover:w-1.5"
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

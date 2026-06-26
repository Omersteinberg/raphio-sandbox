import { useRef, useEffect, useState } from "react";
import { Film } from "lucide-react";

export default function VideoPreview({
  items,
  audioItems,
  sections,
  audioAssets,
  playheadPosition,
  isPlaying,
  getSection,
  getAudioAsset,
  registerVideoEl,
  registerAudioEl,
}) {
  const videoElsRef = useRef({}); // keyed by video item id — one element per clip
  const audioRefs = useRef({}); // keyed by audio item id — multiple play at once

  // Which clip's element is currently revealed. We only swap to a new clip once
  // its element has a frame ready, so a hard cut never flashes black.
  const [shownId, setShownId] = useState(null);

  // Resolve the playable URL for an audio timeline item.
  const urlForItem = (item) => {
    if (item.audioAssetId) return getAudioAsset(item.audioAssetId)?.url || null;
    if (item.sectionId) return getSection(item.sectionId)?.narrationUrl || null;
    return null;
  };

  // Resolve a video clip's URL.
  const videoUrlForItem = (item) =>
    (item.sectionId ? getSection(item.sectionId)?.generatedClipUrl : null) || null;

  // --- Which clip should be on screen ---
  const activeVideo = items.find((item) => {
    const end = item.startTime + item.duration;
    return playheadPosition >= item.startTime && playheadPosition < end;
  });

  // In a gap (no active clip), hold the most recently-ended clip's last frame —
  // matching the exported video's freeze-fill. Before the first clip there's
  // nothing to hold, so the preview stays black.
  const heldVideo = activeVideo
    ? null
    : items
        .filter((item) => item.startTime + item.duration <= playheadPosition)
        .sort((a, b) => a.startTime + a.duration - (b.startTime + b.duration))
        .pop() || null;

  const displayVideo = activeVideo || heldVideo;
  const isHeld = !activeVideo && !!heldVideo;
  const displaySection = displayVideo?.sectionId ? getSection(displayVideo.sectionId) : null;
  const currentThumbnail = displaySection?.imageUrl || null;

  // Reveal the display clip only once its element has a frame, so a cut never
  // flashes black on a cold load — keep showing the previous element until then.
  useEffect(() => {
    if (!displayVideo) {
      setShownId(null);
      return;
    }
    const el = videoElsRef.current[displayVideo.id];
    if (!el) return;
    if (el.readyState >= 2) {
      setShownId(displayVideo.id);
      return;
    }
    const onReady = () => setShownId(displayVideo.id);
    el.addEventListener("loadeddata", onReady);
    el.addEventListener("canplay", onReady);
    return () => {
      el.removeEventListener("loadeddata", onReady);
      el.removeEventListener("canplay", onReady);
    };
  }, [displayVideo]);

  // --- Drive each clip's element: play the active one, freeze the held one,
  //     pause the rest. No src swapping, so transitions don't reload/flash. ---
  useEffect(() => {
    items.forEach((item) => {
      const el = videoElsRef.current[item.id];
      if (!el) return;

      if (displayVideo && item.id === displayVideo.id) {
        if (isHeld) {
          // Freeze on the clip's last kept frame; never play during a gap.
          const endSource =
            item.trimEnd != null ? item.trimEnd : (item.trimStart || 0) + item.duration;
          const target = Math.max(0, endSource - 0.05);
          if (Math.abs(el.currentTime - target) > 0.1) {
            try { el.currentTime = target; } catch (_) {}
          }
          if (!el.paused) el.pause();
        } else {
          const sourceTime = playheadPosition - item.startTime + (item.trimStart || 0);
          if (Math.abs(el.currentTime - sourceTime) > 0.3) {
            try { el.currentTime = sourceTime; } catch (_) {}
          }
          if (isPlaying && el.paused) {
            el.play().catch(() => {});
          } else if (!isPlaying && !el.paused) {
            el.pause();
          }
        }
      } else if (!el.paused) {
        el.pause();
      }
    });
  }, [items, displayVideo, isHeld, playheadPosition, isPlaying]);

  // --- Audio: every active audio item plays simultaneously (narration + music + uploads) ---
  useEffect(() => {
    audioItems.forEach((item) => {
      const el = audioRefs.current[item.id];
      if (!el) return;

      const end = item.startTime + item.duration;
      const active = playheadPosition >= item.startTime && playheadPosition < end;

      if (active) {
        const sourceTime = playheadPosition - item.startTime + (item.trimStart || 0);
        // The clip's slot can outlast its actual audio. Once the playhead is
        // past the real audio length, keep it silent instead of replaying the
        // finished element from the start (which would loop quietly).
        const pastEnd = Number.isFinite(el.duration) && sourceTime >= el.duration - 0.05;
        if (pastEnd) {
          if (!el.paused) el.pause();
        } else {
          // Lenient drift correction for audio: re-seeking mid-playback causes
          // audible clicks, so only correct large drift and otherwise let it play.
          if (Math.abs(el.currentTime - sourceTime) > 0.5) {
            try { el.currentTime = sourceTime; } catch (_) {}
          }
          el.volume = item.volume ?? 1;
          if (isPlaying && el.paused) {
            el.play().catch(() => {});
          } else if (!isPlaying && !el.paused) {
            el.pause();
          }
        }
      } else if (!el.paused) {
        el.pause();
      }
    });
  }, [audioItems, playheadPosition, isPlaying, getSection, getAudioAsset]);

  // Pause everything when playback stops.
  useEffect(() => {
    if (!isPlaying) {
      Object.values(videoElsRef.current).forEach((el) => {
        if (el && !el.paused) el.pause();
      });
      Object.values(audioRefs.current).forEach((el) => {
        if (el && !el.paused) el.pause();
      });
    }
  }, [isPlaying]);

  // Stop all media on unmount.
  useEffect(() => {
    const videoEls = videoElsRef.current;
    const audioEls = audioRefs.current;
    return () => {
      Object.values(videoEls).forEach((el) => { if (el) el.pause(); });
      Object.values(audioEls).forEach((el) => { if (el) el.pause(); });
    };
  }, []);

  const hasShown = shownId != null;

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      {/* One <video> per clip, preloaded and stacked. Only the revealed one is
          visible; switching between them is instant (no src reload, no black). */}
      {items.map((item) => {
        const url = videoUrlForItem(item);
        if (!url) return null;
        return (
          <video
            key={item.id}
            ref={(el) => {
              if (el) videoElsRef.current[item.id] = el;
              else delete videoElsRef.current[item.id];
              registerVideoEl?.(item.id, el);
            }}
            src={url}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ opacity: item.id === shownId ? 1 : 0 }}
            muted
            playsInline
            preload="auto"
          />
        );
      })}

      {/* Fallback when nothing is revealed yet (before the first clip / cold load) */}
      {!hasShown &&
        (currentThumbnail ? (
          <img
            src={currentThumbnail}
            alt="Preview"
            className="max-w-full max-h-full object-contain opacity-50"
          />
        ) : (
          <div className="text-muted-foreground flex flex-col items-center gap-2">
            <Film className="w-16 h-16" />
            <span className="text-sm">No video at current position</span>
          </div>
        ))}

      {/* One hidden audio element per audio item so tracks mix together */}
      {audioItems.map((item) => {
        const url = urlForItem(item);
        if (!url) return null;
        return (
          <audio
            key={item.id}
            ref={(el) => {
              if (el) audioRefs.current[item.id] = el;
              else delete audioRefs.current[item.id];
              registerAudioEl?.(item.id, el);
            }}
            src={url}
            preload="auto"
            className="hidden"
          />
        );
      })}

      {/* Time indicator */}
      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        {formatTime(playheadPosition)}
      </div>
    </div>
  );
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

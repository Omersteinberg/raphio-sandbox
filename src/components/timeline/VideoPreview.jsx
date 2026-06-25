import { useRef, useEffect } from "react";
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
  const videoRef = useRef(null);
  const audioRefs = useRef({}); // keyed by audio item id — multiple play at once
  const lastVideoUrlRef = useRef(null);
  const videoUrlState = useRef(null);

  // Resolve the playable URL for an audio timeline item.
  const urlForItem = (item) => {
    if (item.audioAssetId) return getAudioAsset(item.audioAssetId)?.url || null;
    if (item.sectionId) return getSection(item.sectionId)?.narrationUrl || null;
    return null;
  };

  // --- Video: single element follows the playhead ---
  const activeVideo = items.find((item) => {
    const end = item.startTime + item.duration;
    return playheadPosition >= item.startTime && playheadPosition < end;
  });
  const activeSection = activeVideo?.sectionId ? getSection(activeVideo.sectionId) : null;
  const currentVideoUrl = activeSection?.generatedClipUrl || null;
  const currentThumbnail = activeSection?.imageUrl || null;

  useEffect(() => {
    if (currentVideoUrl !== lastVideoUrlRef.current) {
      lastVideoUrlRef.current = currentVideoUrl;
    }
    const el = videoRef.current;
    if (!el || !currentVideoUrl || !activeVideo) return;

    const sourceTime = playheadPosition - activeVideo.startTime + (activeVideo.trimStart || 0);
    if (Math.abs(el.currentTime - sourceTime) > 0.3) {
      try { el.currentTime = sourceTime; } catch (_) {}
    }
    if (isPlaying && el.paused) {
      el.play().catch(() => {});
    } else if (!isPlaying && !el.paused) {
      el.pause();
    }
  }, [currentVideoUrl, activeVideo, playheadPosition, isPlaying]);

  // --- Audio: every active audio item plays simultaneously (narration + music + uploads) ---
  useEffect(() => {
    audioItems.forEach((item) => {
      const el = audioRefs.current[item.id];
      if (!el) return;

      const end = item.startTime + item.duration;
      const active = playheadPosition >= item.startTime && playheadPosition < end;

      if (active) {
        const sourceTime = playheadPosition - item.startTime + (item.trimStart || 0);
        if (Math.abs(el.currentTime - sourceTime) > 0.3) {
          try { el.currentTime = sourceTime; } catch (_) {}
        }
        el.volume = item.volume ?? 1;
        if (isPlaying && el.paused) {
          el.play().catch(() => {});
        } else if (!isPlaying && !el.paused) {
          el.pause();
        }
      } else if (!el.paused) {
        el.pause();
      }
    });
  }, [audioItems, playheadPosition, isPlaying, getSection, getAudioAsset]);

  // Pause everything when playback stops.
  useEffect(() => {
    if (!isPlaying) {
      if (videoRef.current && !videoRef.current.paused) videoRef.current.pause();
      Object.values(audioRefs.current).forEach((el) => {
        if (el && !el.paused) el.pause();
      });
    }
  }, [isPlaying]);

  // Stop all media on unmount.
  useEffect(() => {
    return () => {
      if (videoRef.current) videoRef.current.pause();
      Object.values(audioRefs.current).forEach((el) => {
        if (el) el.pause();
      });
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      {currentVideoUrl ? (
        <video
          ref={(el) => {
            videoRef.current = el;
            registerVideoEl?.(el);
          }}
          src={currentVideoUrl}
          className="max-w-full max-h-full object-contain"
          muted
          playsInline
          preload="auto"
        />
      ) : currentThumbnail ? (
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
      )}

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

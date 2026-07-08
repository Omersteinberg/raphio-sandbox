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
  const videoElsRef = useRef({}); // keyed by video item id, one element per clip
  const audioRefs = useRef({}); // keyed by audio item id, multiple play at once

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

  // A gap (no clip under the playhead) renders as black, just like a real video
  // editor - empty timeline space is treated as intentional, not filled by
  // holding the previous frame. This matches the exported video's black-fill.
  const displayVideo = activeVideo || null;
  const displaySection = displayVideo?.sectionId ? getSection(displayVideo.sectionId) : null;
  const currentThumbnail = displaySection?.imageUrl || null;

  // Reveal the display clip only once its element has a frame, so a cut never
  // flashes black on a cold load, keep showing the previous element until then.
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
        const speed = item.speed || 1;
        if (el.playbackRate !== speed) el.playbackRate = speed;
        // Source time this element should show for the current playhead.
        const sourceTime = (playheadPosition - item.startTime) * speed + (item.trimStart || 0);
        const drift = Math.abs(el.currentTime - sourceTime);

        if (isPlaying) {
          // `ahead` > 0 means the picture has run PAST the marker; < 0 means it's
          // lagging behind. We handle the two directions differently on purpose.
          const ahead = el.currentTime - sourceTime;
          if (ahead > 0.5) {
            // The marker stalled (or is slower than this clip) and the video ran
            // ahead. Do NOT seek it backward - a backward seek replays the same
            // stretch, which is the "clip keeps repeating" bug. Just hold this
            // frame; native playback resumes once the marker catches up.
            if (!el.paused) el.pause();
          } else {
            // In sync, or the picture is lagging: let it play natively (re-seeking
            // every frame stalls the decoder and stutters). Only nudge FORWARD on
            // a large lag, and never while a seek is already in flight.
            if (ahead < -0.5 && !el.seeking) {
              try { el.currentTime = sourceTime; } catch (_) {}
            }
            if (el.paused) el.play().catch(() => {});
          }
        } else {
          // Paused / scrubbing: track the playhead tightly so the frame under
          // the marker is exact, but don't stack seeks on top of each other.
          if (drift > 0.1 && !el.seeking) {
            try { el.currentTime = sourceTime; } catch (_) {}
          }
          if (!el.paused) el.pause();
        }
      } else {
        // Non-active clip: pause it AND keep it parked at its in-point, so when
        // the playhead crosses into it (a cut / split) the element is already on
        // the right frame - no seek, no stall, a seamless handoff. Only re-seek
        // when it has drifted and isn't already seeking, so this doesn't thrash.
        if (!el.paused) el.pause();
        const inPoint = item.trimStart || 0;
        if (!el.seeking && Math.abs(el.currentTime - inPoint) > 0.25) {
          try { el.currentTime = inPoint; } catch (_) {}
        }
      }
    });
  }, [items, displayVideo, playheadPosition, isPlaying]);

  // --- Audio: every active audio item plays simultaneously (narration + music + uploads) ---
  useEffect(() => {
    audioItems.forEach((item) => {
      const el = audioRefs.current[item.id];
      if (!el) return;

      const end = item.startTime + item.duration;
      const active = playheadPosition >= item.startTime && playheadPosition < end;

      if (active) {
        const speed = item.speed || 1;
        const sourceTime = (playheadPosition - item.startTime) * speed + (item.trimStart || 0);
        // The clip's slot can outlast its actual audio. Once the playhead is
        // past the real audio length, keep it silent instead of replaying the
        // finished element from the start (which would loop quietly).
        const pastEnd = Number.isFinite(el.duration) && sourceTime >= el.duration - 0.05;
        if (pastEnd) {
          if (!el.paused) el.pause();
        } else {
          if (el.playbackRate !== speed) el.playbackRate = speed;
          // Lenient drift correction for audio: re-seeking mid-playback causes
          // audible clicks, so only correct large drift and otherwise let it play.
          if (Math.abs(el.currentTime - sourceTime) > 0.5) {
            try { el.currentTime = sourceTime; } catch (_) {}
          }
          // HTML media volume must be 0-1; clamp (the export can still boost >1).
          el.volume = Math.max(0, Math.min(1, item.volume ?? 1));
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

      {/* When no clip is revealed (a gap, before the first clip, or a cold load)
          the black background shows through. While playing we leave it pure
          black so playback through a gap doesn't flash a hint; when paused or
          scrubbing we show a placeholder so the user knows the spot is empty. */}
      {!hasShown && !isPlaying &&
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

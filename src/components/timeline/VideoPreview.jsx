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
}) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null);
  const [currentThumbnail, setCurrentThumbnail] = useState(null);

  // Find the video item at current playhead position
  useEffect(() => {
    const videoItem = items.find((item) => {
      const itemEnd = item.startTime + item.duration;
      return playheadPosition >= item.startTime && playheadPosition < itemEnd;
    });

    if (videoItem && videoItem.sectionId) {
      const section = getSection(videoItem.sectionId);
      if (section) {
        setCurrentVideoUrl(section.generatedClipUrl);
        setCurrentThumbnail(section.imageUrl);

        // Calculate position within the clip
        if (videoRef.current && section.generatedClipUrl) {
          const relativeTime =
            playheadPosition - videoItem.startTime + (videoItem.trimStart || 0);
          const adjustedTime = relativeTime * (videoItem.speed || 1);

          if (Math.abs(videoRef.current.currentTime - adjustedTime) > 0.1) {
            videoRef.current.currentTime = adjustedTime;
          }

          if (isPlaying && videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
          } else if (!isPlaying && !videoRef.current.paused) {
            videoRef.current.pause();
          }
        }
      }
    } else {
      setCurrentVideoUrl(null);
    }
  }, [items, playheadPosition, isPlaying, getSection]);

  // Find the audio item at current playhead position
  useEffect(() => {
    const audioItem = audioItems.find((item) => {
      const itemEnd = item.startTime + item.duration;
      return playheadPosition >= item.startTime && playheadPosition < itemEnd;
    });

    if (audioItem) {
      let url = null;

      if (audioItem.audioAssetId) {
        const asset = getAudioAsset(audioItem.audioAssetId);
        url = asset?.url;
      } else if (audioItem.sectionId) {
        const section = getSection(audioItem.sectionId);
        url = section?.narrationUrl;
      }

      if (url !== currentAudioUrl) {
        setCurrentAudioUrl(url);
      }

      if (audioRef.current && url) {
        const relativeTime =
          playheadPosition - audioItem.startTime + (audioItem.trimStart || 0);
        const adjustedTime = relativeTime * (audioItem.speed || 1);

        if (Math.abs(audioRef.current.currentTime - adjustedTime) > 0.1) {
          audioRef.current.currentTime = adjustedTime;
        }

        audioRef.current.volume = audioItem.volume || 1;

        if (isPlaying && audioRef.current.paused) {
          audioRef.current.play().catch(() => {});
        } else if (!isPlaying && !audioRef.current.paused) {
          audioRef.current.pause();
        }
      }
    } else {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      setCurrentAudioUrl(null);
    }
  }, [audioItems, playheadPosition, isPlaying, getSection, getAudioAsset, currentAudioUrl]);

  // Pause media when playback stops
  useEffect(() => {
    if (!isPlaying) {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      {currentVideoUrl ? (
        <video
          ref={videoRef}
          src={currentVideoUrl}
          className="max-w-full max-h-full object-contain"
          muted // Mute video track, use separate audio
          playsInline
        />
      ) : currentThumbnail ? (
        <img
          src={currentThumbnail}
          alt="Preview"
          className="max-w-full max-h-full object-contain opacity-50"
        />
      ) : (
        <div className="text-gray-600 flex flex-col items-center gap-2">
          <Film className="w-16 h-16" />
          <span className="text-sm">No video at current position</span>
        </div>
      )}

      {/* Hidden audio element */}
      {currentAudioUrl && (
        <audio ref={audioRef} src={currentAudioUrl} className="hidden" />
      )}

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

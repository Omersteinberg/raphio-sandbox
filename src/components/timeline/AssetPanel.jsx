import { useState } from "react";
import { motion } from "framer-motion";
import {
  Film,
  Music,
  ChevronDown,
  ChevronRight,
  Trash2,
  Play,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AssetPanel({
  sections,
  audioAssets,
  onDeleteAudio,
  onNarrationEdit,
}) {
  const [videoExpanded, setVideoExpanded] = useState(true);
  const [audioExpanded, setAudioExpanded] = useState(true);
  const [playingAudio, setPlayingAudio] = useState(null);

  // Handle drag start for video clips
  const handleVideoDragStart = (e, section) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "video",
        sectionId: section.id,
      })
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  // Handle drag start for audio assets
  const handleAudioDragStart = (e, asset) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "audio",
        audioAssetId: asset.id,
      })
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  // Handle drag start for section narration
  const handleNarrationDragStart = (e, section) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "audio",
        sectionId: section.id,
      })
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  // Play audio preview
  const handlePlayAudio = (url) => {
    if (playingAudio === url) {
      setPlayingAudio(null);
    } else {
      setPlayingAudio(url);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Assets</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Video Clips Section */}
        <div className="border-b border-border">
          <button
            className="w-full px-3 py-2 flex items-center gap-2 text-foreground hover:bg-muted"
            onClick={() => setVideoExpanded(!videoExpanded)}
          >
            {videoExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <Film className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Video Clips</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {sections.filter((s) => s.generatedClipUrl).length}
            </span>
          </button>

          {videoExpanded && (
            <div className="px-2 pb-2 space-y-1">
              {sections
                .filter((s) => s.generatedClipUrl)
                .map((section, i) => (
                  <div
                    key={section.id}
                    className="bg-primary/10 rounded p-2 cursor-grab hover:bg-primary/20 transition-colors border border-primary/20"
                    draggable
                    onDragStart={(e) => handleVideoDragStart(e, section)}
                  >
                    <div className="flex items-center gap-2">
                      {section.imageUrl && (
                        <img
                          src={section.imageUrl}
                          alt=""
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-foreground truncate">
                          {section.narrationText?.substring(0, 40) ||
                            `Clip ${section.orderIndex + 1}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Number(section.clipDuration || 5).toFixed(1)}s
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

              {sections.filter((s) => s.generatedClipUrl).length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                  No video clips available
                </p>
              )}
            </div>
          )}
        </div>

        {/* Audio Assets Section */}
        <div>
          <button
            className="w-full px-3 py-2 flex items-center gap-2 text-foreground hover:bg-muted"
            onClick={() => setAudioExpanded(!audioExpanded)}
          >
            {audioExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <Music className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">Audio</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {audioAssets.length +
                sections.filter((s) => s.narrationUrl).length}
            </span>
          </button>

          {audioExpanded && (
            <div className="px-2 pb-2 space-y-1">
              {/* Section narrations */}
              {sections
                .filter((s) => s.narrationUrl)
                .map((section) => (
                  <div
                    key={`narration-${section.id}`}
                    className="bg-blue-50 rounded p-2 cursor-grab hover:bg-blue-100 transition-colors group border border-blue-200"
                    draggable
                    onDragStart={(e) => handleNarrationDragStart(e, section)}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        className="w-6 h-6 flex items-center justify-center rounded bg-blue-500 hover:bg-blue-400"
                        onClick={() => handlePlayAudio(section.narrationUrl)}
                      >
                        <Play className="w-3 h-3 text-white" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-foreground truncate">
                          Narration {section.orderIndex + 1}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {section.narrationText?.substring(0, 30)}...
                        </p>
                      </div>
                      {onNarrationEdit && (
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-blue-500 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNarrationEdit(section);
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

              {/* Custom audio assets */}
              {audioAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="bg-green-50 rounded p-2 cursor-grab hover:bg-green-100 transition-colors group border border-green-200"
                  draggable
                  onDragStart={(e) => handleAudioDragStart(e, asset)}
                >
                  <div className="flex items-center gap-2">
                    <button
                      className="w-6 h-6 flex items-center justify-center rounded bg-green-500 hover:bg-green-400"
                      onClick={() => handlePlayAudio(asset.url)}
                    >
                      <Play className="w-3 h-3 text-white" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground truncate">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {asset.duration.toFixed(1)}s
                        {asset.sourceType === "TTS" && " (TTS)"}
                        {asset.sourceType === "AI_MUSIC" && " (Music)"}
                      </p>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAudio(asset.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}

              {audioAssets.length === 0 &&
                sections.filter((s) => s.narrationUrl).length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                    No audio available
                  </p>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Audio player */}
      {playingAudio && (
        <audio
          src={playingAudio}
          autoPlay
          onEnded={() => setPlayingAudio(null)}
          className="hidden"
        />
      )}
    </div>
  );
}

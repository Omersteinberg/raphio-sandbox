import {
  Play,
  Pause,
  Square,
  ZoomIn,
  ZoomOut,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

export default function TimelineControls({
  isPlaying,
  playheadPosition,
  duration,
  zoomLevel,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onZoomIn,
  onZoomOut,
  selectedItem,
  onDelete,
}) {
  return (
    <div className="bg-gray-800 border-y border-gray-700 px-4 py-2 flex items-center justify-between">
      {/* Playback Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={isPlaying ? onPause : onPlay}
          className="text-white hover:bg-gray-700"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onStop}
          className="text-white hover:bg-gray-700"
        >
          <Square className="w-4 h-4" />
        </Button>

        {/* Time display */}
        <div className="text-sm text-gray-300 font-mono ml-2">
          {formatTime(playheadPosition)} / {formatTime(duration)}
        </div>
      </div>

      {/* Edit Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={!selectedItem}
          className="text-red-400 hover:text-red-300 hover:bg-gray-700 disabled:opacity-50"
          title="Delete selected (Delete)"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          className="text-gray-300 hover:text-white hover:bg-gray-700"
          title="Zoom out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>

        <div className="text-xs text-gray-400 w-12 text-center">
          {Math.round(zoomLevel * 100)}%
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          className="text-gray-300 hover:text-white hover:bg-gray-700"
          title="Zoom in (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

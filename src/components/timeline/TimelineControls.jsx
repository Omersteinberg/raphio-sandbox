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
  const tenths = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, "0")}.${tenths}`;
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
  compact = false,
}) {
  return (
    <div className="bg-card border-y border-border px-4 py-2 flex items-center justify-between">
      {/* Playback Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={isPlaying ? onPause : onPlay}
          className="text-foreground hover:bg-muted"
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
          className="text-foreground hover:bg-muted"
        >
          <Square className="w-4 h-4" />
        </Button>

        {/* Time display */}
        <div className="text-sm text-muted-foreground font-mono ml-2">
          {formatTime(playheadPosition)} / {formatTime(duration)}
        </div>
      </div>

      {/* Edit + Zoom controls - on mobile these live in the bottom action bar */}
      {!compact && (
        <>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={!selectedItem}
              className="text-destructive hover:text-destructive hover:bg-red-50 disabled:opacity-50"
              title="Delete selected (Delete)"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onZoomOut}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Zoom out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>

            <div className="text-xs text-muted-foreground w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onZoomIn}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Zoom in (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

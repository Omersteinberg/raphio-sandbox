import { useState } from "react";
import {
  ArrowLeft, Play, Pause, Scissors, Trash2, GripVertical,
  Upload, Mic, Download, Loader2, Film, Music,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, arrayMove, useSortable,
} from "@dnd-kit/sortable";
import VideoPreview from "./VideoPreview";
import ItemEditModal from "./modals/ItemEditModal";
import AudioUploadModal from "./modals/AudioUploadModal";
import TTSModal from "./modals/TTSModal";

// One draggable clip row. Drag listeners live ONLY on the grip handle (with
// touch-action:none) so the rest of the list still scrolls normally on touch.
function ClipRow({ id, clip, label, thumbnail, trimmed, onTrim, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 20 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border">
      <button
        {...attributes}
        {...listeners}
        className="touch-none p-1 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-5 h-5" />
      </button>
      <div className="w-14 h-10 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <Film className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{label}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {(clip.duration ?? 0).toFixed(1)}s {trimmed && <Scissors className="w-3 h-3" />}
        </p>
      </div>
      <button onClick={onTrim} className="p-2 text-muted-foreground hover:text-foreground shrink-0" aria-label="Trim clip">
        <Scissors className="w-4 h-4" />
      </button>
      <button onClick={onDelete} className="p-2 text-muted-foreground hover:text-red-400 shrink-0" aria-label="Delete clip">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function MobileTimelineEditor({ timeline, onBack, onExport, exporting }) {
  const [editingItem, setEditingItem] = useState(null);
  const [showAudioUpload, setShowAudioUpload] = useState(false);
  const [showTTS, setShowTTS] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );

  // Video clips in playback order; audio shown separately.
  const videoClips = [...timeline.videoItems].sort((a, b) => a.startTime - b.startTime);
  const audioClips = timeline.audioItems;

  // Reorder = re-sequence clips back-to-back (no gaps) and persist any that moved.
  const handleReorder = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = videoClips.findIndex((c) => c.id === active.id);
    const newIndex = videoClips.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(videoClips, oldIndex, newIndex);
    let t = 0;
    next.forEach((clip) => {
      if (Math.abs((clip.startTime ?? 0) - t) > 0.001) {
        timeline.updateItem(clip.id, { startTime: t });
      }
      t += clip.duration || 0;
    });
  };

  const placeAudio = (asset, trackIndex) => {
    if (!asset) return;
    timeline.addItem({
      trackType: "AUDIO",
      trackIndex,
      startTime: 0,
      duration: asset.duration || 5,
      audioAssetId: asset.id,
    });
  };

  const videoLabel = (clip) => {
    const s = timeline.getSection(clip.sectionId);
    return s?.narrationText?.substring(0, 40) || `Clip ${(s?.orderIndex ?? 0) + 1}`;
  };
  const audioLabel = (clip) => {
    const a = clip.audioAssetId ? timeline.getAudioAsset(clip.audioAssetId) : null;
    const s = clip.sectionId ? timeline.getSection(clip.sectionId) : null;
    return a?.name || (s ? `Narration: ${s.narrationText?.substring(0, 24) || ""}` : "Audio");
  };

  return (
    <div className="editor-dark w-full h-full flex flex-col bg-background text-foreground relative">
      {/* Header */}
      <div className="bg-card border-b border-border px-3 py-2 flex items-center justify-between shrink-0">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground hover:text-foreground px-2">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <h2 className="text-sm font-semibold text-foreground">Edit video</h2>
        <Button
          onClick={onExport}
          disabled={exporting || timeline.loading}
          size="sm"
          className="text-white border-0"
          style={{ background: "var(--gradient-brand)" }}
        >
          {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
          Export
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Preview */}
        <div className="bg-gray-900">
          <div className="w-full aspect-video">
            <VideoPreview
              items={timeline.videoItems}
              audioItems={timeline.audioItems}
              sections={timeline.sections}
              audioAssets={timeline.audioAssets}
              playheadPosition={timeline.playheadPosition}
              isPlaying={timeline.isPlaying}
              getSection={timeline.getSection}
              getAudioAsset={timeline.getAudioAsset}
              registerVideoEl={timeline.registerVideoEl}
              registerAudioEl={timeline.registerAudioEl}
            />
          </div>
        </div>

        {/* Transport */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <button
            onClick={() => (timeline.isPlaying ? timeline.pause() : timeline.play())}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
            style={{ background: "var(--gradient-brand)" }}
            aria-label={timeline.isPlaying ? "Pause" : "Play"}
          >
            {timeline.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <input
            type="range"
            min={0}
            max={timeline.duration || 0}
            step={0.05}
            value={timeline.playheadPosition}
            onChange={(e) => timeline.seek(parseFloat(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-16 text-right">
            {timeline.playheadPosition.toFixed(1)} / {(timeline.duration || 0).toFixed(1)}s
          </span>
        </div>

        {/* Scenes */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Film className="w-4 h-4 text-terra" /> Scenes
            </h3>
            <span className="text-xs text-muted-foreground">drag to reorder · tap ✂ to trim</span>
          </div>
          {videoClips.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No clips yet.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorder}>
              <SortableContext items={videoClips.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {videoClips.map((clip) => {
                    const s = timeline.getSection(clip.sectionId);
                    return (
                      <ClipRow
                        key={clip.id}
                        id={clip.id}
                        clip={clip}
                        label={videoLabel(clip)}
                        thumbnail={s?.imageUrl}
                        trimmed={(clip.trimStart > 0) || clip.trimEnd != null}
                        onTrim={() => setEditingItem(clip)}
                        onDelete={() => timeline.removeItem(clip.id)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Audio */}
        <div className="px-4 pb-6">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <Music className="w-4 h-4 text-blue-400" /> Audio
          </h3>
          <div className="space-y-2">
            {audioClips.map((clip) => (
              <div key={clip.id} className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border">
                <Music className="w-4 h-4 text-blue-400 shrink-0 ml-1" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{audioLabel(clip)}</p>
                  <p className="text-xs text-muted-foreground">
                    {(clip.duration ?? 0).toFixed(1)}s{clip.trackIndex === 1 ? " · music" : " · narration"}
                  </p>
                </div>
                <button onClick={() => setEditingItem(clip)} className="p-2 text-muted-foreground hover:text-foreground shrink-0" aria-label="Trim audio">
                  <Scissors className="w-4 h-4" />
                </button>
                <button onClick={() => timeline.removeItem(clip.id)} className="p-2 text-muted-foreground hover:text-red-400 shrink-0" aria-label="Delete audio">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAudioUpload(true)} className="flex-1">
              <Upload className="w-4 h-4 mr-1" /> Upload
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowTTS(true)} className="flex-1">
              <Mic className="w-4 h-4 mr-1" /> Voiceover
            </Button>
          </div>
        </div>
      </div>

      {/* Saving indicator */}
      {timeline.saving && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card text-foreground px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg border border-border">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Saving...
        </div>
      )}

      {/* Trim modal (reused - its sliders already work on touch) */}
      {editingItem && (
        <ItemEditModal
          item={editingItem}
          section={editingItem.sectionId ? timeline.getSection(editingItem.sectionId) : null}
          audioAsset={editingItem.audioAssetId ? timeline.getAudioAsset(editingItem.audioAssetId) : null}
          onClose={() => setEditingItem(null)}
          onSave={async (updates) => {
            await timeline.updateItem(editingItem.id, updates);
            setEditingItem(null);
          }}
        />
      )}

      {showAudioUpload && (
        <AudioUploadModal
          onClose={() => setShowAudioUpload(false)}
          onUpload={timeline.uploadAudio}
          onComplete={(asset) => { placeAudio(asset, 1); setShowAudioUpload(false); }}
        />
      )}

      {showTTS && (
        <TTSModal
          onClose={() => setShowTTS(false)}
          onGenerate={timeline.generateTTS}
          onComplete={(asset) => { placeAudio(asset, 0); setShowTTS(false); }}
        />
      )}
    </div>
  );
}

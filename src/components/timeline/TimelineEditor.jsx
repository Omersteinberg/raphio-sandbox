import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Download,
  Film,
  Music,
  Plus,
  Upload,
  HelpCircle,
  X,
  Scissors,
  Move,
  Trash2,
  Keyboard,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimeline } from "@/hooks/timeline/useTimeline";
import * as sessionService from "@/services/session";
import TimelineCanvas from "./TimelineCanvas";
import TimelineControls from "./TimelineControls";
import AssetPanel from "./AssetPanel";
import VideoPreview from "./VideoPreview";
import AudioUploadModal from "./modals/AudioUploadModal";
import TTSModal from "./modals/TTSModal";
import ItemEditModal from "./modals/ItemEditModal";
import NarrationEditModal from "./modals/NarrationEditModal";

export default function TimelineEditor({ sessionId, onBack, onExportComplete, onUpdateSection, onRegenerateNarration }) {
  const timeline = useTimeline(sessionId);
  const [showAudioUpload, setShowAudioUpload] = useState(false);
  const [showTTSModal, setShowTTSModal] = useState(false);
  const [showHelp, setShowHelp] = useState(true); // open the guide whenever the editor is entered
  const [editingItem, setEditingItem] = useState(null);
  const [editingNarration, setEditingNarration] = useState(null); // { item, section }
  const [exporting, setExporting] = useState(false);

  const containerRef = useRef(null);

  // Confirm before leaving if there are edits that haven't been exported yet.
  // (Edits auto-save as a draft, but the video only updates on Export.)
  const handleBack = () => {
    if (timeline.hasUnexportedChanges) {
      const ok = window.confirm(
        "Your edits are saved as a draft, but won't appear in the video until you Export. Leave anyway?"
      );
      if (!ok) return;
    }
    onBack?.();
  };

  // Keyboard shortcuts — ignored while typing in a field or when a modal is open.
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (showAudioUpload || showTTSModal || showHelp || editingItem || editingNarration) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (timeline.selectedItem) {
          e.preventDefault();
          timeline.removeItem(timeline.selectedItem);
        }
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        timeline.zoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        timeline.zoomOut();
      } else if (e.key === " ") {
        e.preventDefault();
        if (timeline.isPlaying) timeline.pause();
        else timeline.play();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    showAudioUpload, showTTSModal, showHelp, editingItem, editingNarration,
    timeline.selectedItem, timeline.isPlaying,
    timeline.removeItem, timeline.zoomIn, timeline.zoomOut, timeline.play, timeline.pause,
  ]);

  // Handle export - download video and save as completed
  const handleExport = async () => {
    setExporting(true);
    try {
      const video = await timeline.exportTimeline();
      if (video) {
        // Mark session as completed in the DB
        try {
          await sessionService.completeSession(sessionId);
        } catch (err) {
          console.error("Failed to mark session as completed:", err);
        }

        // Notify parent that export is complete (navigates back to result page)
        if (onExportComplete) {
          onExportComplete(video);
        }
      }
    } finally {
      setExporting(false);
    }
  };

  // Handle drag asset to timeline
  const handleAssetDrop = async (asset, trackType, startTime, trackIndex = 0) => {
    if (trackType === "VIDEO" && asset.sectionId) {
      const section = timeline.getSection(asset.sectionId);
      if (section) {
        await timeline.addItem({
          trackType: "VIDEO",
          trackIndex: 0,
          startTime,
          duration: section.clipDuration || 5,
          sectionId: section.id,
        });
      }
    } else if (trackType === "AUDIO") {
      if (asset.audioAssetId) {
        const audioAsset = timeline.getAudioAsset(asset.audioAssetId);
        if (audioAsset) {
          await timeline.addItem({
            trackType: "AUDIO",
            trackIndex,
            startTime,
            duration: audioAsset.duration,
            audioAssetId: audioAsset.id,
          });
        }
      } else if (asset.sectionId) {
        // Adding section narration
        const section = timeline.getSection(asset.sectionId);
        if (section && section.narrationUrl) {
          await timeline.addItem({
            trackType: "AUDIO",
            trackIndex,
            startTime,
            duration: section.narrationDuration || section.clipDuration || 5,
            sectionId: section.id,
          });
        }
      }
    }
  };

  // Handle audio upload complete
  const handleAudioUploaded = (asset) => {
    setShowAudioUpload(false);
  };

  // Handle TTS generation complete
  const handleTTSGenerated = (asset) => {
    setShowTTSModal(false);
  };

  // Handle item edit
  const handleItemEdit = (item) => {
    setEditingItem(item);
  };

  // Handle item update from modal
  const handleItemUpdate = async (updates) => {
    if (editingItem) {
      await timeline.updateItem(editingItem.id, updates);
      setEditingItem(null);
    }
  };

  // Handle narration save
  const handleNarrationSave = async (updates) => {
    if (editingNarration && onUpdateSection) {
      await onUpdateSection(editingNarration.section.id, updates);
      // Reload timeline to pick up updated section data
      await timeline.loadTimeline();
    }
  };

  // Handle narration regeneration
  const handleRegenerateNarration = async (sectionId, text, voiceId) => {
    console.log("[TimelineEditor] handleRegenerateNarration called");
    console.log("[TimelineEditor] sectionId:", sectionId);
    console.log("[TimelineEditor] text:", text);
    console.log("[TimelineEditor] voiceId:", voiceId);
    console.log("[TimelineEditor] onRegenerateNarration exists:", !!onRegenerateNarration);

    if (onRegenerateNarration) {
      try {
        console.log("[TimelineEditor] Calling onRegenerateNarration prop...");
        await onRegenerateNarration(sectionId, text, voiceId);
        console.log("[TimelineEditor] onRegenerateNarration prop completed");
        console.log("[TimelineEditor] Reloading timeline...");
        await timeline.loadTimeline();
        console.log("[TimelineEditor] Timeline reloaded");
      } catch (err) {
        console.error("[TimelineEditor] handleRegenerateNarration failed:", err);
      }
    } else {
      console.warn("[TimelineEditor] onRegenerateNarration prop is not provided!");
    }
  };

  if (timeline.loading && !timeline.timeline) {
    return (
      <div className="editor-dark w-full h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-dark w-full h-full flex flex-col bg-background text-foreground" ref={containerRef}>
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Timeline Editor</h2>
            <p className="text-xs text-muted-foreground">
              {timeline.duration.toFixed(1)}s total duration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => setShowHelp(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            How to use
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowAudioUpload(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Audio
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowTTSModal(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Music className="w-4 h-4 mr-2" />
            Generate TTS
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || timeline.loading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export Video
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Assets */}
        <div className="w-64 bg-card border-r border-border overflow-y-auto">
          <AssetPanel
            sections={timeline.sections}
            audioAssets={timeline.audioAssets}
            onDeleteAudio={timeline.deleteAudio}
            onNarrationEdit={(section) => setEditingNarration({ item: null, section })}
            onDragStart={(asset, type) => {
              // Store drag data
            }}
          />
        </div>

        {/* Center - Preview and Timeline (scrolls on short viewports) */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Video Preview - Larger section */}
          <div className="flex-1 min-h-[400px] bg-gray-900 flex items-center justify-center border-b border-border">
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

          {/* Timeline Controls */}
          <TimelineControls
            isPlaying={timeline.isPlaying}
            playheadPosition={timeline.playheadPosition}
            duration={timeline.duration}
            zoomLevel={timeline.zoomLevel}
            onPlay={timeline.play}
            onPause={timeline.pause}
            onStop={timeline.stop}
            onSeek={timeline.seek}
            onZoomIn={timeline.zoomIn}
            onZoomOut={timeline.zoomOut}
            selectedItem={timeline.selectedItem}
            onDelete={() => timeline.selectedItem && timeline.removeItem(timeline.selectedItem)}
          />

          {/* Timeline Canvas - Lower on page */}
          <div className="h-64 flex-shrink-0 overflow-hidden">
            <TimelineCanvas
              videoItems={timeline.videoItems}
              audioItems={timeline.audioItems}
              duration={timeline.duration}
              playheadPosition={timeline.playheadPosition}
              pixelsPerSecond={timeline.pixelsPerSecond}
              selectedItem={timeline.selectedItem}
              onSelectItem={timeline.setSelectedItem}
              onSeek={timeline.seek}
              onUpdateItem={timeline.updateItem}
              onItemEdit={handleItemEdit}
              getSection={timeline.getSection}
              getAudioAsset={timeline.getAudioAsset}
              onAssetDrop={handleAssetDrop}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAudioUpload && (
        <AudioUploadModal
          onClose={() => setShowAudioUpload(false)}
          onUpload={timeline.uploadAudio}
          onComplete={handleAudioUploaded}
        />
      )}

      {showTTSModal && (
        <TTSModal
          onClose={() => setShowTTSModal(false)}
          onGenerate={timeline.generateTTS}
          onComplete={handleTTSGenerated}
        />
      )}

      {editingItem && (
        <ItemEditModal
          item={editingItem}
          section={editingItem.sectionId ? timeline.getSection(editingItem.sectionId) : null}
          audioAsset={editingItem.audioAssetId ? timeline.getAudioAsset(editingItem.audioAssetId) : null}
          onClose={() => setEditingItem(null)}
          onSave={handleItemUpdate}
        />
      )}

      {editingNarration && (
        <NarrationEditModal
          section={editingNarration.section}
          onClose={() => setEditingNarration(null)}
          onSave={handleNarrationSave}
          onRegenerateNarration={handleRegenerateNarration}
        />
      )}

      {/* How-to-use guide */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-card rounded-lg w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">How to use the editor</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-muted-foreground hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ul className="space-y-3 text-sm text-foreground">
              <li className="flex items-start gap-3">
                <Scissors className="w-4 h-4 mt-0.5 flex-shrink-0 text-terra" />
                <span><span className="font-medium">Double-click a clip</span> to trim it — drag the In/Out handles (or type exact times) and Apply. Trimming only cuts; it never stretches a clip.</span>
              </li>
              <li className="flex items-start gap-3">
                <Move className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                <span><span className="font-medium">Drag a clip</span> left/right to move it. It snaps to nearby clip edges, the playhead, and half-second marks; clips on the same track can't overlap.</span>
              </li>
              <li className="flex items-start gap-3">
                <Trash2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
                <span><span className="font-medium">Select a clip</span>, then click Delete or press <kbd className="px-1 rounded bg-muted text-xs">Delete</kbd> to remove it.</span>
              </li>
              <li className="flex items-start gap-3">
                <Keyboard className="w-4 h-4 mt-0.5 flex-shrink-0 text-foreground" />
                <span><span className="font-medium">Shortcuts:</span> <kbd className="px-1 rounded bg-muted text-xs">Space</kbd> play/pause · <kbd className="px-1 rounded bg-muted text-xs">+</kbd>/<kbd className="px-1 rounded bg-muted text-xs">-</kbd> zoom · <kbd className="px-1 rounded bg-muted text-xs">Delete</kbd> remove selected.</span>
              </li>
              <li className="flex items-start gap-3">
                <Music className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
                <span><span className="font-medium">Three tracks:</span> Video, Narration, and Music. Drag items from the Assets panel onto the matching track; music plays under the whole video.</span>
              </li>
              <li className="flex items-start gap-3">
                <Upload className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-400" />
                <span><span className="font-medium">Add audio</span> with Upload Audio or Generate TTS, then drag it from the Assets panel onto a track.</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-foreground" />
                <span><span className="font-medium">Gaps between clips</span> hold the previous clip's last frame while any audio keeps playing — exactly how the exported video will look.</span>
              </li>
              <li className="flex items-start gap-3">
                <Download className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                <span><span className="font-medium">Edits auto-save as a draft</span>, but the final video only updates when you click <span className="font-medium">Export Video</span>. Leaving without exporting keeps your draft but won't change the video.</span>
              </li>
            </ul>
            <div className="flex justify-end mt-6">
              <Button
                onClick={() => setShowHelp(false)}
                className="text-white border-0"
                style={{ background: "var(--gradient-brand)" }}
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Saving indicator */}
      {timeline.saving && (
        <div className="fixed bottom-4 right-4 bg-card text-foreground px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg border border-border">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Saving...
        </div>
      )}
    </div>
  );
}

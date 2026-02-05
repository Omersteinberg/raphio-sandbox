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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimeline } from "@/hooks/timeline/useTimeline";
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
  const [editingItem, setEditingItem] = useState(null);
  const [editingNarration, setEditingNarration] = useState(null); // { item, section }
  const [exporting, setExporting] = useState(false);

  const containerRef = useRef(null);

  // Handle export
  const handleExport = async () => {
    setExporting(true);
    try {
      const video = await timeline.exportTimeline();
      if (video && onExportComplete) {
        onExportComplete(video);
      }
    } finally {
      setExporting(false);
    }
  };

  // Handle drag asset to timeline
  const handleAssetDrop = async (asset, trackType, startTime) => {
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
            trackIndex: 0,
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
            trackIndex: 0,
            startTime,
            duration: section.clipDuration || 5,
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

  // Handle narration edit click
  const handleNarrationEdit = (item, section) => {
    setEditingNarration({ item, section });
  };

  // Handle narration save
  const handleNarrationSave = async (updates) => {
    if (editingNarration && onUpdateSection) {
      await onUpdateSection(editingNarration.section.id, updates);
    }
  };

  // Handle narration regeneration
  const handleRegenerateNarration = async (sectionId, text, voiceId) => {
    if (onRegenerateNarration) {
      await onRegenerateNarration(sectionId, text, voiceId);
    }
  };

  if (timeline.loading && !timeline.timeline) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-white" ref={containerRef}>
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Timeline Editor</h2>
            <p className="text-xs text-gray-400">
              {timeline.duration.toFixed(1)}s total duration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => setShowAudioUpload(true)}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Audio
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowTTSModal(true)}
            className="text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <Music className="w-4 h-4 mr-2" />
            Generate TTS
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || timeline.loading}
            className="bg-purple-600 hover:bg-purple-700 text-white"
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
        <div className="w-64 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <AssetPanel
            sections={timeline.sections}
            audioAssets={timeline.audioAssets}
            onDeleteAudio={timeline.deleteAudio}
            onDragStart={(asset, type) => {
              // Store drag data
            }}
          />
        </div>

        {/* Center - Preview and Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video Preview - Larger section */}
          <div className="flex-1 min-h-[400px] bg-black flex items-center justify-center border-b border-gray-700">
            <VideoPreview
              items={timeline.videoItems}
              audioItems={timeline.audioItems}
              sections={timeline.sections}
              audioAssets={timeline.audioAssets}
              playheadPosition={timeline.playheadPosition}
              isPlaying={timeline.isPlaying}
              getSection={timeline.getSection}
              getAudioAsset={timeline.getAudioAsset}
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
            onResetZoom={timeline.resetZoom}
            selectedItem={timeline.selectedItem}
            onSplit={() => timeline.selectedItem && timeline.splitItem(timeline.selectedItem)}
            onDelete={() => timeline.selectedItem && timeline.removeItem(timeline.selectedItem)}
          />

          {/* Timeline Canvas - Lower on page */}
          <div className="h-48 flex-shrink-0 overflow-hidden">
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
              onNarrationEdit={handleNarrationEdit}
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

      {/* Saving indicator */}
      {timeline.saving && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg">
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}

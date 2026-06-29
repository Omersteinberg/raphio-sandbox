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
  ZoomIn,
  ZoomOut,
  Gauge,
  SplitSquareHorizontal,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/useMediaQuery";
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
import ExportProgressModal from "./modals/ExportProgressModal";

export default function TimelineEditor({ sessionId, onBack, onExportComplete, onUpdateSection, onRegenerateNarration }) {
  const timeline = useTimeline(sessionId);
  const isMobile = useIsMobile();
  const [showAudioUpload, setShowAudioUpload] = useState(false);
  const [showTTSModal, setShowTTSModal] = useState(false);
  const [showHelp, setShowHelp] = useState(true); // open the guide whenever the editor is entered
  const [editingItem, setEditingItem] = useState(null);
  const [editingNarration, setEditingNarration] = useState(null); // { item, section }
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(null); // { percentage, label } while exporting
  const [speedSheetOpen, setSpeedSheetOpen] = useState(false);
  const [assetsSheetOpen, setAssetsSheetOpen] = useState(false);

  // Tap-to-add (mobile asset sheet): drop the asset at the playhead, nudged to
  // the next free spot on its track so it doesn't overlap.
  const freeSlot = (trackType, trackIndex, dur) => {
    const its = timeline.items
      .filter((i) => i.trackType === trackType && (trackType !== "AUDIO" || i.trackIndex === trackIndex))
      .sort((a, b) => a.startTime - b.startTime);
    const overlaps = (s) => its.some((o) => s < o.startTime + o.duration && s + dur > o.startTime);
    const start = Math.max(0, timeline.playheadPosition);
    if (!overlaps(start)) return start;
    for (const o of its) {
      const after = o.startTime + o.duration;
      if (after >= start && !overlaps(after)) return after;
    }
    return its.reduce((m, i) => Math.max(m, i.startTime + i.duration), 0);
  };

  const addVideoAsset = (section) => {
    const dur = Number(section.clipDuration) || 5;
    timeline.addItem({ trackType: "VIDEO", trackIndex: 0, startTime: freeSlot("VIDEO", 0, dur), duration: dur, sectionId: section.id });
    setAssetsSheetOpen(false);
  };
  const addNarrationAsset = (section) => {
    const dur = Number(section.narrationDuration || section.clipDuration) || 5;
    timeline.addItem({ trackType: "AUDIO", trackIndex: 0, startTime: freeSlot("AUDIO", 0, dur), duration: dur, sectionId: section.id });
    setAssetsSheetOpen(false);
  };
  const addAudioAsset = (asset) => {
    const dur = Number(asset.duration) || 5;
    timeline.addItem({ trackType: "AUDIO", trackIndex: 1, startTime: freeSlot("AUDIO", 1, dur), duration: dur, audioAssetId: asset.id });
    setAssetsSheetOpen(false);
  };

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
    setExportProgress({ percentage: 0, label: "Starting export…" });
    try {
      const video = await timeline.exportTimeline(setExportProgress);
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
      setExportProgress(null);
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

  // Handle audio upload complete — drop the new clip onto the music track at the
  // playhead (same placement as the Add-assets sheet).
  const handleAudioUploaded = (asset) => {
    if (asset) {
      const dur = Number(asset.duration) || 5;
      timeline.addItem({ trackType: "AUDIO", trackIndex: 1, startTime: freeSlot("AUDIO", 1, dur), duration: dur, audioAssetId: asset.id });
    }
    setShowAudioUpload(false);
  };

  // Handle TTS generation complete — drop the new narration onto the narration
  // track at the playhead.
  const handleTTSGenerated = (asset) => {
    if (asset) {
      const dur = Number(asset.duration) || 5;
      timeline.addItem({ trackType: "AUDIO", trackIndex: 0, startTime: freeSlot("AUDIO", 0, dur), duration: dur, audioAssetId: asset.id });
    }
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
      <div className="w-full h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground" ref={containerRef}>
      {/* Header */}
      <div className="bg-card border-b border-border px-3 py-2 md:px-4 md:py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground px-2 md:px-4"
          >
            <ArrowLeft className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Back</span>
          </Button>
          <div className="min-w-0">
            <h2 className="text-base md:text-lg font-semibold text-foreground truncate">Video Editor</h2>
            <p className="hidden md:block text-xs text-muted-foreground">
              {timeline.duration.toFixed(1)}s total duration
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <Button
            variant="ghost"
            onClick={() => setShowHelp(true)}
            className="text-muted-foreground hover:text-foreground px-2 md:px-4"
          >
            <HelpCircle className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">How to use</span>
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || timeline.loading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 md:px-4"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 md:mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 md:mr-2" />
            )}
            <span className="hidden sm:inline">{exporting ? "Exporting..." : "Export"}</span>
            <span className="hidden md:inline">&nbsp;Video</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Assets (desktop only; touch drag-to-timeline isn't supported yet) */}
        <div className={`${isMobile ? "hidden" : "block"} w-64 bg-card border-r border-border overflow-y-auto`}>
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

        {/* Center - Preview and Timeline */}
        <div className={`flex-1 flex flex-col ${isMobile ? "overflow-hidden" : "overflow-y-auto"}`}>
          {/* Video Preview */}
          <div className={`${isMobile ? "h-[32vh] shrink-0" : "flex-1 min-h-[400px]"} bg-gray-900 flex items-center justify-center border-b border-border`}>
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
            compact
          />

          {/* Timeline Canvas — fills remaining height on mobile, fixed on desktop */}
          <div className={`${isMobile ? "flex-1 min-h-0" : "h-64 flex-shrink-0"} overflow-hidden`}>
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

          {/* Bottom action bar (CapCut/VLLO style) — on mobile and desktop.
              Swaps to clip actions when a clip is selected. */}
            <div className="bg-card border-t border-border shrink-0 flex items-center justify-around px-1 py-1.5">
              {(timeline.selectedItem
                ? [
                    { Icon: SplitSquareHorizontal, label: "Split", onClick: () => timeline.splitItem(timeline.selectedItem) },
                    { Icon: Gauge, label: "Speed", onClick: () => setSpeedSheetOpen(true) },
                    // Narration edit — only for a narration audio clip (has a section).
                    ...(() => {
                      const sel = timeline.items.find((i) => i.id === timeline.selectedItem);
                      return sel && sel.trackType === "AUDIO" && sel.sectionId
                        ? [{ Icon: Mic, label: "Narration", onClick: () => setEditingNarration({ item: sel, section: timeline.getSection(sel.sectionId) }) }]
                        : [];
                    })(),
                    { Icon: Trash2, label: "Delete", danger: true, onClick: () => timeline.removeItem(timeline.selectedItem) },
                  ]
                : [
                    { Icon: Plus, label: "Assets", onClick: () => setAssetsSheetOpen(true) },
                    { Icon: Upload, label: "Audio", onClick: () => setShowAudioUpload(true) },
                    { Icon: Music, label: "Voice", onClick: () => setShowTTSModal(true) },
                    { Icon: ZoomOut, label: "Zoom −", onClick: timeline.zoomOut },
                    { Icon: ZoomIn, label: "Zoom +", onClick: timeline.zoomIn },
                  ]
              ).map(({ Icon, label, onClick, danger }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-lg ${danger ? "text-destructive" : "text-muted-foreground"}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </button>
              ))}
            </div>
        </div>
      </div>

      {/* Modals */}
      {exporting && <ExportProgressModal progress={exportProgress} />}

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


      {editingNarration && (
        <NarrationEditModal
          section={editingNarration.section}
          onClose={() => setEditingNarration(null)}
          onSave={handleNarrationSave}
          onRegenerateNarration={handleRegenerateNarration}
        />
      )}

      {/* Playback speed sheet (mobile clip action) */}
      {speedSheetOpen && timeline.selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setSpeedSheetOpen(false)}>
          <div className="w-full bg-card rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Playback speed</h3>
              <button onClick={() => setSpeedSheetOpen(false)} aria-label="Close" className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            {(() => {
              const sel = timeline.items.find((i) => i.id === timeline.selectedItem);
              const curSpeed = sel?.speed || 1;
              return (
                <div className="grid grid-cols-3 gap-2">
                  {[0.5, 1, 1.5, 2, 3, 4].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        if (sel) {
                          // duration on the timeline = kept source length / speed,
                          // so changing speed re-times the clip (faster → shorter).
                          const keptSource = sel.duration * (sel.speed || 1);
                          timeline.updateItem(sel.id, { speed: s, duration: keptSource / s });
                        }
                        setSpeedSheetOpen(false);
                      }}
                      className={`py-3 rounded-lg border text-sm font-medium ${
                        curSpeed === s
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Add-assets sheet — touch-friendly version of the desktop asset panel.
          Tap an item to append it to its track (no drag needed). */}
      {assetsSheetOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setAssetsSheetOpen(false)}>
          <div
            className="w-full bg-card rounded-t-2xl max-h-[75vh] flex flex-col pb-[env(safe-area-inset-bottom)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h3 className="text-sm font-semibold text-foreground">Add assets</h3>
              <button onClick={() => setAssetsSheetOpen(false)} aria-label="Close" className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Video clips */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5" /> Video clips
                </p>
                <div className="space-y-1.5">
                  {timeline.sections.filter((s) => s.generatedClipUrl).map((section) => (
                    <button key={section.id} onClick={() => addVideoAsset(section)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-left">
                      {section.imageUrl && <img src={section.imageUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{section.narrationText?.substring(0, 40) || `Clip ${section.orderIndex + 1}`}</p>
                        <p className="text-[11px] text-muted-foreground">{Number(section.clipDuration || 5).toFixed(1)}s</p>
                      </div>
                      <Plus className="w-4 h-4 text-primary shrink-0" />
                    </button>
                  ))}
                  {timeline.sections.filter((s) => s.generatedClipUrl).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No clips</p>
                  )}
                </div>
              </div>
              {/* Narration & audio */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" /> Narration & audio
                </p>
                <div className="space-y-1.5">
                  {timeline.sections.filter((s) => s.narrationUrl).map((section) => (
                    <button key={`narr-${section.id}`} onClick={() => addNarrationAsset(section)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-left">
                      <Music className="w-4 h-4 text-blue-400 shrink-0 ml-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">Narration {section.orderIndex + 1}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{section.narrationText?.substring(0, 30)}</p>
                      </div>
                      <Plus className="w-4 h-4 text-primary shrink-0" />
                    </button>
                  ))}
                  {timeline.audioAssets.map((asset) => (
                    <button key={asset.id} onClick={() => addAudioAsset(asset)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-left">
                      <Music className="w-4 h-4 text-green-500 shrink-0 ml-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{asset.name}</p>
                        <p className="text-[11px] text-muted-foreground">{Number(asset.duration || 0).toFixed(1)}s{asset.sourceType === "TTS" ? " (TTS)" : ""}</p>
                      </div>
                      <Plus className="w-4 h-4 text-primary shrink-0" />
                    </button>
                  ))}
                  {timeline.audioAssets.length === 0 && timeline.sections.filter((s) => s.narrationUrl).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No audio</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* How-to-use guide */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-card rounded-lg w-full max-w-md p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">How to use the editor</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ul className="space-y-3 text-sm text-foreground">
              <li className="flex items-start gap-3">
                <Scissors className="w-4 h-4 mt-0.5 flex-shrink-0 text-terra" />
                <span><span className="font-medium">Double-click a clip</span> to trim it. Drag the In/Out handles (or type exact times) and Apply. Trimming only cuts; it never stretches a clip.</span>
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
                <span><span className="font-medium">Gaps between clips</span> show as a black screen while any audio keeps playing, exactly how the exported video will look.</span>
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

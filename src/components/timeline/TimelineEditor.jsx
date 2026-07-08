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
  Trash2,
  ZoomIn,
  ZoomOut,
  Gauge,
  SplitSquareHorizontal,
  Mic,
  RefreshCw,
  Volume2,
  Layers,
  Undo2,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { startOverviewTour, startClipTour } from "@/lib/editorTour";
import { TOUR_KEYS } from "@/lib/tourState";
import { useStepTour } from "@/lib/useStepTour";
import { estimatedProgress } from "@/lib/progressEstimate";
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
import RegenerateClipModal from "./modals/RegenerateClipModal";
import ExportProgressModal from "./modals/ExportProgressModal";
import ReferencesModal from "./modals/ReferencesModal";

// Shown when leaving with edits that haven't been exported. Shared by the in-app
// Back button and the browser/OS back guard so both warn identically.
const LEAVE_MSG =
  "Your edits are saved as a draft, but won't appear in the video until you Export. Leave anyway?";

export default function TimelineEditor({ sessionId, onBack, onExportComplete, onUpdateSection, onRegenerateNarration }) {
  const timeline = useTimeline(sessionId);
  const isMobile = useIsMobile();
  const [showAudioUpload, setShowAudioUpload] = useState(false);
  const [showTTSModal, setShowTTSModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingNarration, setEditingNarration] = useState(null); // { item, section }
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(null); // { percentage, label } while exporting
  const [speedSheetOpen, setSpeedSheetOpen] = useState(false);
  const [volumeSheetOpen, setVolumeSheetOpen] = useState(false);
  const [volumeDraft, setVolumeDraft] = useState(1); // 0-1.5 while the volume sheet is open
  const [speedDraft, setSpeedDraft] = useState(1); // 0.25-6 while the speed sheet is open
  const [assetsSheetOpen, setAssetsSheetOpen] = useState(false);
  const [regenSection, setRegenSection] = useState(null); // section being regenerated (opens the prompt modal)
  const [regenerating, setRegenerating] = useState(false);
  const [regenProgress, setRegenProgress] = useState(null); // { percentage, label }
  const [showReferences, setShowReferences] = useState(false); // references-pipeline: view refs used

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
  // Route an audio asset to its row by source: TTS → Narration (0), uploads →
  // Audio (1), background music → Music (2). Matches TimelineCanvas's audioKind.
  const audioTrackIndex = (asset) =>
    asset?.sourceType === "TTS" ? 0 : asset?.sourceType === "AI_MUSIC" ? 2 : 1;
  const addAudioAsset = (asset) => {
    const dur = Number(asset.duration) || 5;
    const idx = audioTrackIndex(asset);
    timeline.addItem({ trackType: "AUDIO", trackIndex: idx, startTime: freeSlot("AUDIO", idx, dur), duration: dur, audioAssetId: asset.id });
    setAssetsSheetOpen(false);
  };

  const containerRef = useRef(null);

  // Confirm before leaving if there are edits that haven't been exported yet.
  // (Edits auto-save as a draft, but the video only updates on Export.)
  const handleBack = () => {
    if (timeline.hasUnexportedChanges && !window.confirm(LEAVE_MSG)) return;
    onBack?.();
  };

  // Same guard for the browser/OS back button and mobile back-swipe gesture,
  // which bypass the in-app Back button entirely. The app uses <BrowserRouter>
  // (no useBlocker), so we intercept the history "popstate" manually: while
  // there are unexported edits, push a decoy entry so the first Back pops it
  // instead of leaving, then confirm. Cancel re-arms; OK navigates away.
  useEffect(() => {
    if (!timeline.hasUnexportedChanges) return;
    window.history.pushState(null, "", window.location.href);
    const onPopState = () => {
      if (window.confirm(LEAVE_MSG)) {
        window.removeEventListener("popstate", onPopState);
        onBack?.();
      } else {
        window.history.pushState(null, "", window.location.href);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [timeline.hasUnexportedChanges, onBack]);

  // Keyboard shortcuts: ignored while typing in a field or when a modal is open.
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (showAudioUpload || showTTSModal || editingItem || editingNarration) return;

      if ((e.metaKey || e.ctrlKey) && (e.key === "z" || e.key === "Z")) {
        // Undo-only: Ctrl/Cmd+Z. Shift+Z (redo) is intentionally not handled.
        if (e.shiftKey) return;
        e.preventDefault();
        if (timeline.canUndo) timeline.undo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
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
    showAudioUpload, showTTSModal, editingItem, editingNarration,
    timeline.selectedItem, timeline.isPlaying, timeline.canUndo, timeline.undo,
    timeline.removeItem, timeline.zoomIn, timeline.zoomOut, timeline.play, timeline.pause,
  ]);

  // Interactive onboarding tours (driver.js), managed by useStepTour.
  // Overview: first editor entry only. Clip: the first time a clip is ever
  // selected; `enabled` passes the raw selected id so that, after rearm(),
  // the next selection change fires it again.
  const overviewTour = useStepTour(TOUR_KEYS.editorOverview, startOverviewTour, {
    enabled: !timeline.loading && !!timeline.timeline,
    isMobile,
  });
  const clipTour = useStepTour(TOUR_KEYS.editorClip, startClipTour, {
    enabled: timeline.selectedItem,
    delay: 250,
    isMobile,
  });

  // "How to use" button: replay the overview now, and re-arm the clip tour so
  // it shows again the next time a clip is selected.
  const handleReplayTour = () => {
    clipTour.rearm();
    overviewTour.replay();
  };

  // Commit a playback speed for the selected clip. Re-times its timeline length
  // (duration = kept source ÷ speed), so faster → shorter. Clamped 0.25-6× to
  // match the backend; supports the exact fractional speeds the AI narration-fit
  // produces (e.g. 1.33×), not just the presets.
  const SPEED_MIN = 0.25;
  const SPEED_MAX = 6;
  const commitSpeed = (val) => {
    const sel = timeline.items.find((i) => i.id === timeline.selectedItem);
    if (!sel) return;
    const s = Math.max(SPEED_MIN, Math.min(SPEED_MAX, Number(val) || 1));
    const keptSource = sel.duration * (sel.speed || 1);
    timeline.updateItem(sel.id, { speed: s, duration: keptSource / s });
  };

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

  // Handle audio upload complete - drop the new clip onto the music track at the
  // playhead (same placement as the Add-assets sheet).
  const handleAudioUploaded = (asset) => {
    if (asset) {
      const dur = Number(asset.duration) || 5;
      timeline.addItem({ trackType: "AUDIO", trackIndex: 1, startTime: freeSlot("AUDIO", 1, dur), duration: dur, audioAssetId: asset.id });
    }
    setShowAudioUpload(false);
  };

  // Handle TTS generation complete - drop the new narration onto the narration
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

  // Regenerate the selected clip's video with a (possibly edited) prompt. The
  // backend runs this as a long job but doesn't report sub-stage progress for
  // clip regeneration, so we creep a simulated bar up to ~92% then finish at 100%.
  const handleRegenerateClip = async (prompt) => {
    const section = regenSection;
    if (!section) return;
    setRegenSection(null); // close the prompt modal; the progress modal takes over
    setRegenerating(true);
    setRegenProgress({ percentage: 0, label: "Starting…" });

    // The backend reports no progress for clip regeneration and it can take a
    // few minutes, so we predict the duration and ramp EVENLY toward it (then
    // creep on overrun) - feels like steady, consistent movement instead of
    // racing ahead and freezing. Estimate mirrors VideoGenerationStep's batch model
    // (~one clip-batch of generation time).
    const start = Date.now();
    const ESTIMATE_MS = 4 * 60 * 1000; // ~4 min for a single clip; tune if regen is consistently faster/slower
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const percentage = estimatedProgress(elapsed, ESTIMATE_MS);
      const label =
        elapsed < 25000
          ? "Regenerating clip with AI…"
          : elapsed < 120000
          ? "Still working. This usually takes a few minutes…"
          : "Hang tight, almost there…";
      setRegenProgress({ percentage, label });
    }, 1000);

    try {
      await sessionService.regenerateClip(sessionId, section.id, {
        prompt,
        imageUrl: section.imageUrl,
      });
      setRegenProgress({ percentage: 100, label: "Done" });
      await timeline.loadTimeline(); // pick up the new generatedClipUrl
      toast.success("Clip regenerated");
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Regenerate failed";
      toast.error(msg);
    } finally {
      clearInterval(timer);
      setRegenerating(false);
      setRegenProgress(null);
    }
  };

  if (timeline.loading && !timeline.timeline) {
    // Skeleton that mirrors the real editor layout, so the chrome appears
    // instantly and only the content fills in - feels incremental instead of a
    // blank spinner that looks stuck. Matches the responsive layout below.
    return (
      <div className="w-full h-full flex flex-col bg-background text-foreground">
        {/* Header */}
        <div className="bg-card border-b border-border px-3 py-2 md:px-4 md:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="h-8 w-8 rounded bg-muted animate-pulse" />
            <div className="h-5 w-28 rounded bg-muted animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-20 rounded bg-muted animate-pulse" />
            <div className="h-9 w-24 rounded bg-muted animate-pulse" />
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Desktop asset sidebar */}
          {!isMobile && (
            <div className="w-64 bg-card border-r border-border p-3 space-y-2 shrink-0">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          )}

          <div className="flex-1 flex flex-col min-w-0">
            {/* Preview (subtle spinner so it reads as loading) */}
            <div className={`${isMobile ? "h-[32vh] shrink-0" : "flex-1 min-h-[400px]"} bg-gray-900 flex items-center justify-center border-b border-border`}>
              <Loader2 className="w-7 h-7 animate-spin text-primary/60" />
            </div>

            {/* Controls strip */}
            <div className="bg-card border-y border-border px-4 py-2 flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
              <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
              <div className="h-4 w-20 rounded bg-muted animate-pulse ml-1" />
            </div>

            {/* Timeline tracks */}
            <div className={`${isMobile ? "flex-1 min-h-0" : "h-64 flex-shrink-0"} bg-muted/30 p-3 space-y-2 overflow-hidden`}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-10 w-16 rounded bg-muted animate-pulse shrink-0" />
                  <div className="h-10 flex-1 rounded bg-muted/70 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
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
          {timeline.references?.length > 0 && (
            <Button
              data-tour="references"
              variant="ghost"
              onClick={() => setShowReferences(true)}
              className="text-muted-foreground hover:text-foreground px-2 md:px-4"
            >
              <Layers className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">References</span>
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => timeline.undo()}
            disabled={!timeline.canUndo || timeline.saving}
            title="Undo (Ctrl+Z)"
            className="text-muted-foreground hover:text-foreground px-2 md:px-3"
          >
            <Undo2 className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Undo</span>
          </Button>
          <Button
            variant="ghost"
            onClick={handleReplayTour}
            className="text-muted-foreground hover:text-foreground px-2 md:px-4"
          >
            <HelpCircle className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">How to use</span>
          </Button>
          <Button
            data-tour="export"
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
        <div data-tour="asset-panel" className={`${isMobile ? "hidden" : "block"} w-64 bg-card border-r border-border overflow-y-auto`}>
          <AssetPanel
            sections={timeline.sections}
            audioAssets={timeline.audioAssets}
            onDeleteAudio={timeline.deleteAudio}
            onNarrationEdit={(section) => setEditingNarration({ item: null, section })}
            onRegenerateClip={(section) => setRegenSection(section)}
            onDragStart={(asset, type) => {
              // Store drag data
            }}
          />
        </div>

        {/* Center - Preview and Timeline */}
        <div className={`flex-1 flex flex-col ${isMobile ? "overflow-hidden" : "overflow-y-auto"}`}>
          {/* Video Preview */}
          <div data-tour="preview" className={`${isMobile ? "h-[32vh] shrink-0" : "flex-1 min-h-[400px]"} bg-gray-900 flex items-center justify-center border-b border-border`}>
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
          <div data-tour="controls">
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
          </div>

          {/* Timeline Canvas - fills remaining height on mobile, fixed on desktop */}
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

          {/* Slim "done editing" bar to deselect the clip (shown when one is selected) */}
          {timeline.selectedItem && (
            <button
              data-tour="done-editing"
              onClick={() => timeline.setSelectedItem(null)}
              className="shrink-0 w-full py-1.5 text-xs font-semibold text-primary bg-primary/5 border-t border-border hover:bg-primary/10"
            >
              Done editing clip
            </button>
          )}

          {/* Bottom action bar (CapCut/VLLO style) - on mobile and desktop.
              Swaps to clip actions when a clip is selected. */}
            <div data-tour="action-bar" className="bg-card border-t border-border shrink-0 flex items-center justify-around px-1 py-1.5">
              {(timeline.selectedItem
                ? [
                    { Icon: SplitSquareHorizontal, label: "Split", onClick: () => timeline.splitItem(timeline.selectedItem) },
                    { Icon: Gauge, label: "Speed", onClick: () => { const s = timeline.items.find((i) => i.id === timeline.selectedItem); setSpeedDraft(Number(s?.speed) || 1); setSpeedSheetOpen(true); } },
                    // Volume - only for audio clips (narration / audio / music).
                    ...(() => {
                      const sel = timeline.items.find((i) => i.id === timeline.selectedItem);
                      return sel && sel.trackType === "AUDIO"
                        ? [{ Icon: Volume2, label: "Volume", onClick: () => { setVolumeDraft(sel.volume ?? 1); setVolumeSheetOpen(true); } }]
                        : [];
                    })(),
                    // Regenerate - only for a video clip backed by a section.
                    ...(() => {
                      const sel = timeline.items.find((i) => i.id === timeline.selectedItem);
                      return sel && sel.trackType === "VIDEO" && sel.sectionId
                        ? [{ Icon: RefreshCw, label: "Regenerate", onClick: () => setRegenSection(timeline.getSection(sel.sectionId)) }]
                        : [];
                    })(),
                    // Narration edit - only for a narration audio clip (has a section).
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

      {showReferences && (
        <ReferencesModal
          references={timeline.references}
          onClose={() => setShowReferences(false)}
        />
      )}

      {regenSection && (
        <RegenerateClipModal
          section={regenSection}
          loading={regenerating}
          onClose={() => setRegenSection(null)}
          onRegenerate={handleRegenerateClip}
        />
      )}
      {regenerating && <ExportProgressModal progress={regenProgress} title="Regenerating clip" />}

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
          currentVoiceId={timeline.timeline?.voiceId}
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
            <div className="space-y-4">
              {/* Exact current speed - shows the AI narration-fit's fractional
                  value (e.g. 1.33×), which the presets alone can't represent. */}
              <div className="text-center">
                <span className="text-2xl font-bold text-foreground tabular-nums">
                  {speedDraft.toFixed(2)}×
                </span>
              </div>

              {/* Fine-tune slider. Commits on release (like the volume sheet) so
                  dragging doesn't flood the save endpoint. */}
              <input
                type="range"
                min={SPEED_MIN}
                max={SPEED_MAX}
                step={0.05}
                value={speedDraft}
                onChange={(e) => setSpeedDraft(Number(e.target.value))}
                onPointerUp={() => commitSpeed(speedDraft)}
                onTouchEnd={() => commitSpeed(speedDraft)}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground -mt-2">
                <span>{SPEED_MIN}×</span>
                <span>{SPEED_MAX}×</span>
              </div>

              {/* Quick presets - set the value and commit, keeping the sheet open
                  so you can then fine-tune with the slider. */}
              <div className="grid grid-cols-3 gap-2">
                {[0.5, 1, 1.5, 2, 3, 4].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSpeedDraft(s); commitSpeed(s); }}
                    className={`py-3 rounded-lg border text-sm font-medium ${
                      Math.abs(speedDraft - s) < 0.001
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Volume sheet (audio clip action). Commits on release so the slider
          doesn't flood the save endpoint while dragging. */}
      {volumeSheetOpen && timeline.selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setVolumeSheetOpen(false)}>
          <div className="w-full bg-card rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Volume</h3>
              <button onClick={() => setVolumeSheetOpen(false)} aria-label="Close" className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-muted-foreground shrink-0" />
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={volumeDraft}
                onChange={(e) => setVolumeDraft(Number(e.target.value))}
                onPointerUp={() => timeline.updateItem(timeline.selectedItem, { volume: volumeDraft })}
                onTouchEnd={() => timeline.updateItem(timeline.selectedItem, { volume: volumeDraft })}
                className="flex-1 accent-primary"
              />
              <span className="text-sm font-medium text-foreground w-12 text-right tabular-nums">{Math.round(volumeDraft * 100)}%</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4">
              {[0, 0.5, 1, 1.5].map((v) => (
                <button
                  key={v}
                  onClick={() => { setVolumeDraft(v); timeline.updateItem(timeline.selectedItem, { volume: v }); }}
                  className={`py-2 rounded-lg border text-sm font-medium ${
                    Math.abs(volumeDraft - v) < 0.001
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {v === 0 ? "Mute" : `${Math.round(v * 100)}%`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add-assets sheet - touch-friendly version of the desktop asset panel.
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
                    <div key={section.id} className="flex items-center rounded-lg bg-muted/50">
                      <button onClick={() => addVideoAsset(section)} className="flex-1 min-w-0 flex items-center gap-2 p-2 text-left">
                        {section.imageUrl && <img src={section.imageUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground truncate">{section.narrationText?.substring(0, 40) || `Clip ${section.orderIndex + 1}`}</p>
                          <p className="text-[11px] text-muted-foreground">{Number(section.clipDuration || 5).toFixed(1)}s</p>
                        </div>
                        <Plus className="w-4 h-4 text-primary shrink-0" />
                      </button>
                      <button
                        onClick={() => { setAssetsSheetOpen(false); setRegenSection(section); }}
                        className="p-2 mr-1 text-muted-foreground hover:text-primary shrink-0"
                        title="Regenerate clip"
                        aria-label="Regenerate clip"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {timeline.sections.filter((s) => s.generatedClipUrl).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No clips</p>
                  )}
                </div>
              </div>
              {/* Narration (section narration + TTS voice) */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5" /> Narration
                </p>
                <div className="space-y-1.5">
                  {timeline.sections.filter((s) => s.narrationUrl).map((section) => (
                    <button key={`narr-${section.id}`} onClick={() => addNarrationAsset(section)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-left">
                      <Mic className="w-4 h-4 text-blue-400 shrink-0 ml-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">Narration {section.orderIndex + 1}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{section.narrationText?.substring(0, 30)}</p>
                      </div>
                      <Plus className="w-4 h-4 text-primary shrink-0" />
                    </button>
                  ))}
                  {timeline.audioAssets.filter((a) => a.sourceType === "TTS").map((asset) => (
                    <button key={asset.id} onClick={() => addAudioAsset(asset)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-left">
                      <Mic className="w-4 h-4 text-blue-400 shrink-0 ml-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{asset.name}</p>
                        <p className="text-[11px] text-muted-foreground">{Number(asset.duration || 0).toFixed(1)}s · voice</p>
                      </div>
                      <Plus className="w-4 h-4 text-primary shrink-0" />
                    </button>
                  ))}
                  {timeline.sections.filter((s) => s.narrationUrl).length === 0 && timeline.audioAssets.filter((a) => a.sourceType === "TTS").length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No narration</p>
                  )}
                </div>
              </div>
              {/* Audio (uploaded files) */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> Audio
                </p>
                <div className="space-y-1.5">
                  {timeline.audioAssets.filter((a) => a.sourceType !== "TTS" && a.sourceType !== "AI_MUSIC").map((asset) => (
                    <button key={asset.id} onClick={() => addAudioAsset(asset)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-left">
                      <Upload className="w-4 h-4 text-green-500 shrink-0 ml-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{asset.name}</p>
                        <p className="text-[11px] text-muted-foreground">{Number(asset.duration || 0).toFixed(1)}s</p>
                      </div>
                      <Plus className="w-4 h-4 text-primary shrink-0" />
                    </button>
                  ))}
                  {timeline.audioAssets.filter((a) => a.sourceType !== "TTS" && a.sourceType !== "AI_MUSIC").length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No uploaded audio</p>
                  )}
                </div>
              </div>
              {/* Music (background music) */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" /> Music
                </p>
                <div className="space-y-1.5">
                  {timeline.audioAssets.filter((a) => a.sourceType === "AI_MUSIC").map((asset) => (
                    <button key={asset.id} onClick={() => addAudioAsset(asset)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-left">
                      <Music className="w-4 h-4 text-purple-400 shrink-0 ml-1" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{asset.name}</p>
                        <p className="text-[11px] text-muted-foreground">{Number(asset.duration || 0).toFixed(1)}s</p>
                      </div>
                      <Plus className="w-4 h-4 text-primary shrink-0" />
                    </button>
                  ))}
                  {timeline.audioAssets.filter((a) => a.sourceType === "AI_MUSIC").length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No music</p>
                  )}
                </div>
              </div>
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

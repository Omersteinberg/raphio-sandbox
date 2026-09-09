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
  SplitSquareHorizontal,
  Mic,
  RefreshCw,
  Volume2,
  VolumeX,
  Layers,
  Undo2,
  Play,
  Pause,
  Square,
  Maximize,
  Eye,
  EyeOff,
  Image,
  Type,
  Shapes,
  Settings,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth.jsx";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { startOverviewTour, startClipTour } from "@/lib/editorTour";
import { TOUR_KEYS } from "@/lib/tourState";
import { useStepTour } from "@/lib/useStepTour";
import { estimatedProgress } from "@/lib/progressEstimate";
import { describeError } from "@/lib/errorDetail";
import { useTimeline } from "@/hooks/timeline/useTimeline";
import * as sessionService from "@/services/session";
import TimelineCanvas from "./TimelineCanvas";
import TimelineControls from "./TimelineControls";
import EditorSidePanel from "./EditorSidePanel";
import ClipActionPill from "./ClipActionPill";
import VideoPreview from "./VideoPreview";
import AudioUploadModal from "./modals/AudioUploadModal";
import TTSModal from "./modals/TTSModal";
import ItemEditModal from "./modals/ItemEditModal";
import NarrationEditModal from "./modals/NarrationEditModal";
import RegenerateClipModal from "./modals/RegenerateClipModal";
import RegenerateMusicModal from "./modals/RegenerateMusicModal";
import ReworkSceneModal from "./modals/ReworkSceneModal";
import ExportProgressModal from "./modals/ExportProgressModal";
import ReferencesModal from "./modals/ReferencesModal";

// Shown when leaving with edits that haven't been exported. Shared by the in-app
// Back button and the browser/OS back guard so both warn identically.
const LEAVE_MSG =
  "Your edits are saved as a draft, but won't appear in the video until you Export. Leave anyway?";

function formatPreviewTime(seconds) {
  const s = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function TimelineEditor({ sessionId, onBack, onExportComplete, onUpdateSection, onRegenerateNarration }) {
  const timeline = useTimeline(sessionId);
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const avatarInitial = (user?.username || user?.email || "?").charAt(0).toUpperCase();
  const [showAudioUpload, setShowAudioUpload] = useState(false);
  const [showTTSModal, setShowTTSModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingNarration, setEditingNarration] = useState(null); // { item, section }
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(null); // { percentage, label } while exporting
  const [speedSheetOpen, setSpeedSheetOpen] = useState(false);
  const [volumeSheetOpen, setVolumeSheetOpen] = useState(false);
  const [volumeDraft, setVolumeDraft] = useState(1); // 0-1.5 while the volume sheet is open
  const [fadeInDraft, setFadeInDraft] = useState(0); // 0-5s, lives in the same sheet as volume
  const [fadeOutDraft, setFadeOutDraft] = useState(0); // 0-5s, lives in the same sheet as volume
  const [speedDraft, setSpeedDraft] = useState(1); // 0.25-6 while the speed sheet is open
  const [assetsSheetOpen, setAssetsSheetOpen] = useState(false);
  const [mobileAudioSheetOpen, setMobileAudioSheetOpen] = useState(false); // mobile rail's "Audio" category: Upload / AI Voice choice
  const [regenSection, setRegenSection] = useState(null); // section being regenerated (opens the prompt modal)
  const [showMusicModal, setShowMusicModal] = useState(false); // background-music prompt modal
  const [regenerating, setRegenerating] = useState(false);
  const [regenProgress, setRegenProgress] = useState(null); // { percentage, label }
  const [regenTitle, setRegenTitle] = useState(null); // heading for the shared progress modal
  const [showReferences, setShowReferences] = useState(false); // references-pipeline: view refs used
  const [timelineHidden, setTimelineHidden] = useState(false); // "Hide timeline" transport-strip toggle (local, visual only)

  // An intro's clips are designed, branded scenes rendered from code, not AI
  // footage generated from a prompt. Sending one back through the video model
  // would replace a brand scene with something off-brand and charge for it, so
  // the per-clip regenerate reaches the intro's own scene rework instead.
  const isIntro = timeline.pipelineMode === "intro";
  const regenLabel = isIntro ? "Rework" : "Regenerate";

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

  // The AI background-music asset, if this video has one. Drives the regenerate
  // entry points and the modal's preview of the current track. Absent means the
  // video was rendered without music, and the same modal offers to add some.
  const musicAsset = (timeline.audioAssets || []).find((a) => a.sourceType === "AI_MUSIC") || null;

  const containerRef = useRef(null);
  const previewContainerRef = useRef(null);
  const [previewMuted, setPreviewMuted] = useState(false); // preview-only monitoring toggle - doesn't touch any item's own volume data

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      previewContainerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

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

  // Closing a clip-contextual sheet/modal generally means "I'm done with
  // this clip for now", so the pill should dismiss along with it. Speed is
  // the deliberate exception: on an audio clip, Volume sits right next to
  // it in the same pill, so a likely next step is adjusting Volume - closing
  // Speed only dismisses when there's no Volume action to chain into (i.e.
  // the clip isn't audio).
  const closeSpeedSheet = () => {
    setSpeedSheetOpen(false);
    const sel = timeline.items.find((i) => i.id === timeline.selectedItem);
    if (!sel || sel.trackType !== "AUDIO") timeline.setSelectedItem(null);
  };
  const closeVolumeSheet = () => {
    setVolumeSheetOpen(false);
    timeline.setSelectedItem(null);
  };
  const closeRegenModal = () => {
    setRegenSection(null);
    timeline.setSelectedItem(null);
  };
  const closeNarrationModal = () => {
    setEditingNarration(null);
    timeline.setSelectedItem(null);
  };

  // What to show in the Speed/Volume sheets (and the Clip Details panel) so
  // it's clear which clip they're editing - "Clip N" matches
  // NarrationEditModal's convention, and a thumbnail (video clips only -
  // audio has no frame to show) matches RegenerateClipModal's preview. Every
  // one of these controls already scopes its actual read/write correctly to
  // timeline.selectedItem; this is purely the missing visual confirmation.
  const selectedClipInfo = () => {
    const item = timeline.items.find((i) => i.id === timeline.selectedItem);
    if (!item) return null;
    const section = item.sectionId ? timeline.getSection(item.sectionId) : null;
    const audioAsset = item.audioAssetId ? timeline.getAudioAsset(item.audioAssetId) : null;
    const label = section
      ? `Clip ${section.orderIndex + 1}`
      : audioAsset?.name?.substring(0, 30) || "Audio clip";
    const thumbnail = item.trackType === "VIDEO" ? section?.imageUrl : null;
    return { item, section, audioAsset, label, thumbnail };
  };

  // The Clip Details panel is persistent (not opened by a click like the old
  // bottom sheets were), so its Speed/Volume drafts need to re-seed from
  // whichever clip is CURRENTLY selected, not just at the moment a button was
  // clicked. Runs whenever the selection changes.
  useEffect(() => {
    const sel = timeline.items.find((i) => i.id === timeline.selectedItem);
    if (!sel) return;
    setSpeedDraft(Number(sel.speed) || 1);
    setVolumeDraft(sel.volume ?? 1);
    setFadeInDraft(Number(sel.fadeIn) || 0);
    setFadeOutDraft(Number(sel.fadeOut) || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline.selectedItem]);

  // The Clip Details panel's action row - same conditional set the old bottom
  // action bar computed (Split always; Regenerate/Narration/New-music depend
  // on the clip's track type and whether it's the background-music clip;
  // Delete always), just relocated. Speed/Volume live as their own controls
  // in the panel, not in this row.
  const clipActions = (sel) => {
    if (!sel) return [];
    const list = [
      {
        Icon: SplitSquareHorizontal,
        label: "Split",
        // Dismiss the pill only once the split actually happened - a
        // rejected split (bad playhead position) leaves the clip selected
        // so the user can fix the playhead and retry, instead of losing
        // their selection on a no-op.
        onClick: async () => {
          const didSplit = await timeline.splitItem(sel.id);
          if (didSplit) timeline.setSelectedItem(null);
        },
      },
    ];
    if (sel.trackType === "VIDEO" && sel.sectionId) {
      list.push({ Icon: RefreshCw, label: regenLabel, onClick: () => setRegenSection(timeline.getSection(sel.sectionId)) });
    }
    if (sel.trackType === "AUDIO" && sel.sectionId) {
      list.push({ Icon: Mic, label: "Narration", onClick: () => setEditingNarration({ item: sel, section: timeline.getSection(sel.sectionId) }) });
    }
    if (sel.audioAssetId && musicAsset && sel.audioAssetId === musicAsset.id) {
      list.push({ Icon: RefreshCw, label: "New music", onClick: () => setShowMusicModal(true) });
    }
    list.push({ Icon: Trash2, label: "Delete", danger: true, onClick: () => timeline.removeItem(sel.id) });
    return list;
  };

  // The floating action pill (replaces the old persistent right-hand Clip
  // Details panel) needs the selected clip's on-screen position to anchor
  // itself above it. TimelineItem stamps its DOM node with data-item-id, so
  // this looks it up directly rather than threading a ref through
  // TimelineCanvas -> TimelineTrack -> TimelineItem. Recomputed on selection
  // change, zoom, item changes (position can shift), and on scroll/resize of
  // ANY ancestor (capture-phase listener catches nested scroll containers,
  // not just window) - a `position: fixed` pill rendered here, outside the
  // timeline's overflow-hidden wrappers, then tracks the clip without being
  // clipped by them.
  const [pillAnchorRect, setPillAnchorRect] = useState(null);
  useEffect(() => {
    if (!timeline.selectedItem) {
      setPillAnchorRect(null);
      return;
    }
    const update = () => {
      const el = document.querySelector(`[data-item-id="${timeline.selectedItem}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPillAnchorRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline.selectedItem, timeline.zoomLevel, timeline.items]);

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
  const handleAssetDrop = async (asset, trackType, startTime, trackIndex = 0, { ripple = false } = {}) => {
    if (trackType === "VIDEO" && asset.sectionId) {
      const section = timeline.getSection(asset.sectionId);
      if (section) {
        // `ripple` comes from the canvas, which is what knows whether the row had
        // room at the drop point. It only ever asks for it on the video row.
        const add = ripple ? timeline.rippleInsert : timeline.addItem;
        await add({
          trackType: "VIDEO",
          trackIndex: 0,
          startTime,
          duration: Number(section.clipDuration) || 5,
          sectionId: section.id,
        });
        if (ripple) toast.success("Clip inserted. The clips after it moved along.");
      }
    } else if (trackType === "AUDIO") {
      if (asset.audioAssetId) {
        const audioAsset = timeline.getAudioAsset(asset.audioAssetId);
        if (audioAsset) {
          await timeline.addItem({
            trackType: "AUDIO",
            trackIndex,
            startTime,
            // An upload whose duration probe failed stores null, and a null
            // length here inserts a zero-width clip that cannot be seen or
            // grabbed. Matches the fallback the tap-to-add path already uses.
            duration: Number(audioAsset.duration) || 5,
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
            duration: Number(section.narrationDuration || section.clipDuration) || 5,
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
      // The change is in the draft, not in the finished video, until an Export.
      timeline.markDirty();
    }
  };

  // Handle narration regeneration
  const handleRegenerateNarration = async (sectionId, text, voiceId, tone) => {
    if (!onRegenerateNarration) return;
    try {
      await onRegenerateNarration(sectionId, text, voiceId, tone);
      await timeline.loadTimeline();
      timeline.markDirty();
    } catch (err) {
      console.error("[TimelineEditor] handleRegenerateNarration failed:", err);
    }
  };

  // Regenerate the selected clip's video with a (possibly edited) prompt. The
  // backend runs this as a long job but doesn't report sub-stage progress for
  // clip regeneration, so we creep a simulated bar up to ~92% then finish at 100%.
  const handleRegenerateClip = async (prompt) => {
    const section = regenSection;
    if (!section) return;
    setRegenSection(null); // close the prompt modal; the progress modal takes over
    timeline.setSelectedItem(null);
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
      timeline.markDirty(); // same as a rework: it is not in the video until Export
      toast.success("Clip regenerated");
    } catch (err) {
      toast.error(describeError(err, "We couldn't regenerate that clip. Please try again.").userMessage);
    } finally {
      clearInterval(timer);
      setRegenerating(false);
      setRegenProgress(null);
    }
  };

  // Regenerate the background music with a (possibly edited) style prompt, or
  // generate it from scratch when the video has none. Same job + progress shape
  // as clip regeneration; music comes back much faster, hence the shorter estimate.
  const handleRegenerateMusic = async (musicPrompt) => {
    const hadMusic = !!musicAsset;
    setShowMusicModal(false); // close the prompt modal; the progress modal takes over
    setRegenTitle(hadMusic ? "Regenerating music" : "Generating music");
    setRegenerating(true);
    setRegenProgress({ percentage: 0, label: "Starting…" });

    const start = Date.now();
    const ESTIMATE_MS = 90 * 1000; // ~90s for a PiAPI track; creeps on overrun
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      setRegenProgress({
        percentage: estimatedProgress(elapsed, ESTIMATE_MS),
        label: elapsed < 25000 ? "Composing your track…" : "Still working, almost there…",
      });
    }, 1000);

    try {
      await sessionService.regenerateBackgroundMusic(sessionId, { musicPrompt });
      setRegenProgress({ percentage: 100, label: "Done" });
      await timeline.loadTimeline(); // pick up the swapped-in track
      timeline.markDirty(); // like a clip regen: not in the video until Export
      toast.success(hadMusic ? "Music regenerated" : "Music added");
    } catch (err) {
      toast.error(describeError(err, "We couldn't generate that music. Please try again.").userMessage);
    } finally {
      clearInterval(timer);
      setRegenerating(false);
      setRegenProgress(null);
      setRegenTitle(null);
    }
  };

  // Rework an intro scene from a note. Unlike clip regeneration this reports real
  // progress: reviseIntroScenes polls the session job and hands back each stage's
  // own label, so there is nothing to simulate.
  //
  // The scene is addressed by its position in the plan. Sections are written in
  // scene order with orderIndex = index (see introTimeline.service), which is what
  // makes that mapping safe.
  const handleReworkScene = async (note) => {
    const section = regenSection;
    if (!section || !note) return;
    setRegenSection(null);
    timeline.setSelectedItem(null);
    setRegenerating(true);
    setRegenProgress({ percentage: 0, label: "Starting…" });

    try {
      const updated = await sessionService.reviseIntroScenes(
        sessionId,
        [{ index: section.orderIndex, note }],
        {
          onProgress: (status) => {
            const p = status?.jobProgress;
            if (!p) return;
            setRegenProgress({
              percentage: Number(p.percentage) || 0,
              label: p.label || "Reworking scene…",
            });
          },
        }
      );
      // null means the poll saw a different job take the slot, so nothing here is
      // known to have happened. Say so rather than claiming success.
      if (!updated) {
        toast.info("Another job is running on this video. Try again in a moment.");
        return;
      }
      const failed = Array.isArray(updated.reviseFailures) ? updated.reviseFailures : [];
      if (failed.some((f) => f.index === section.orderIndex)) {
        toast.error(failed.find((f) => f.index === section.orderIndex).error);
        return;
      }
      setRegenProgress({ percentage: 100, label: "Done" });
      // The whole plan is re-timed by a rework, so this reloads every clip's new
      // length and position, not just the scene that changed. The sections and
      // the timeline itself are rebuilt with fresh ids, which is what makes the
      // undo stack behind us unusable: see resetHistory.
      await timeline.loadTimeline();
      timeline.resetHistory();
      // The reworked scene is in the timeline, but the finished video is still
      // the one assembled before it. Without this the editor thought nothing had
      // changed: Back left with no warning and the result page played the old
      // cut, so the rework looked like it had done nothing.
      timeline.markDirty();
      toast.success("Scene reworked. Export to put it in your video.");
    } catch (err) {
      toast.error(describeError(err, "We couldn't rework that scene. Please try again.").userMessage);
    } finally {
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
            <div className={`${isMobile ? "h-[34vh] shrink-0" : "flex-1 min-h-[420px]"} bg-gray-900 flex items-center justify-center border-b border-border`}>
              <Loader2 className="w-7 h-7 animate-spin text-primary/60" />
            </div>

            {/* Controls strip */}
            <div className="bg-card border-y border-border px-4 py-2 flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
              <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
              <div className="h-4 w-20 rounded bg-muted animate-pulse ml-1" />
            </div>

            {/* Timeline tracks */}
            <div className={`${isMobile ? "flex-1 min-h-0" : "h-48 flex-shrink-0"} bg-muted/30 p-3 space-y-2 overflow-hidden`}>
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
      {/* Header - single unified bar (the global AppHeader is hidden for this
          route specifically, see AppLayout.jsx). Logo + "My Videos" breadcrumb
          both trigger the same guarded back navigation as before - relabeled
          for the reference layout, not a new destination. No Redo icon: the
          undo stack is deliberately undo-only (see useTimeline.js), and a
          Redo button with nothing behind it would be a fake control. */}
      <div className="bg-card border-b border-border px-3 py-2 md:px-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={handleBack}
            aria-label="Back to My Videos"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <img src="/Logo.svg" alt="Raphio" className="h-6 hidden md:block shrink-0" />
          <div className="hidden md:block w-px h-5 bg-border shrink-0" />
          <div className="min-w-0">
            <nav className="hidden md:flex items-center gap-1.5 text-sm">
              <button onClick={handleBack} className="text-muted-foreground hover:text-foreground">
                My Videos
              </button>
              <span className="text-muted-foreground/50">/</span>
              <span className="text-foreground font-medium">Video Editor</span>
            </nav>
            <h2 className="md:hidden text-base font-semibold text-foreground truncate">Video Editor</h2>
            <p className="text-xs text-muted-foreground truncate">
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
          {user && (
            <div
              className="hidden md:flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white ml-1 shrink-0"
              style={{ background: "var(--gradient-brand)" }}
              title={user.username || user.email}
            >
              {avatarInitial}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left rail + panel - Media/Audio/Text/Elements/Settings (desktop
            only; touch drag-to-timeline isn't supported yet). Persistent -
            never disappears based on selection, unlike the old bottom-bar
            row it replaces. */}
        {!isMobile && (
          <EditorSidePanel
            sections={timeline.sections}
            audioAssets={timeline.audioAssets}
            onDeleteAudio={timeline.deleteAudio}
            onNarrationEdit={(section) => setEditingNarration({ item: null, section })}
            onRegenerateClip={(section) => setRegenSection(section)}
            onRegenerateMusic={() => setShowMusicModal(true)}
            regenerateLabel={regenLabel}
            onOpenAudioUpload={() => setShowAudioUpload(true)}
            onOpenVoice={() => setShowTTSModal(true)}
          />
        )}

        {/* Center - Preview and Timeline */}
        <div className={`flex-1 flex flex-col min-w-0 ${isMobile ? "overflow-hidden" : "overflow-y-auto"}`}>
          {/* Video Preview - the dominant element now that the timeline strip
              below it is shorter and the side panel carries the asset tools. */}
          <div
            ref={previewContainerRef}
            data-tour="preview"
            className={`${isMobile ? "h-[34vh] shrink-0" : "flex-1 min-h-[420px]"} bg-gray-900 flex flex-col border-b border-border`}
          >
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <VideoPreview
                items={timeline.videoItems}
                audioItems={timeline.audioItems}
                sections={timeline.sections}
                audioAssets={timeline.audioAssets}
                playheadPosition={timeline.playheadPosition}
                isPlaying={timeline.isPlaying}
                muted={previewMuted}
                getSection={timeline.getSection}
                getAudioAsset={timeline.getAudioAsset}
                registerVideoEl={timeline.registerVideoEl}
                registerAudioEl={timeline.registerAudioEl}
              />
            </div>
            {/* Player controls directly under the frame - separate from the
                transport strip below, which drives the timeline itself. */}
            <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-black/40">
              <button onClick={timeline.isPlaying ? timeline.pause : timeline.play} aria-label={timeline.isPlaying ? "Pause" : "Play"} className="text-white/90 hover:text-white p-1">
                {timeline.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <span className="text-[11px] text-white/70 tabular-nums shrink-0">
                {formatPreviewTime(timeline.playheadPosition)} / {formatPreviewTime(timeline.duration)}
              </span>
              <input
                type="range"
                min={0}
                max={timeline.duration || 0}
                step={0.01}
                value={Math.min(timeline.playheadPosition, timeline.duration || 0)}
                onChange={(e) => timeline.seek(Number(e.target.value))}
                className="flex-1 accent-primary h-1"
                aria-label="Seek"
              />
              <button onClick={() => setPreviewMuted((m) => !m)} aria-label={previewMuted ? "Unmute" : "Mute"} className="text-white/90 hover:text-white p-1">
                {previewMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button onClick={toggleFullscreen} aria-label="Fullscreen" className="text-white/90 hover:text-white p-1">
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Transport strip: playback, Split, current speed, Hide-timeline
              toggle and zoom together in one stable row on both platforms
              (zoom and Split used to only live in the bottom action bar's
              no-selection state, which meant they vanished the moment a clip
              was selected or deselected). */}
          <div data-tour="controls" className="flex items-center gap-1 bg-card border-y border-border px-2 py-1.5 shrink-0 flex-wrap">
            <button onClick={timeline.isPlaying ? timeline.pause : timeline.play} title={timeline.isPlaying ? "Pause" : "Play"} className="p-1.5 rounded-lg text-foreground hover:bg-muted">
              {timeline.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button onClick={timeline.stop} title="Stop" className="p-1.5 rounded-lg text-foreground hover:bg-muted">
              <Square className="w-4 h-4" />
            </button>
            <span className="text-xs text-muted-foreground font-mono ml-1 mr-2 tabular-nums">
              {formatPreviewTime(timeline.playheadPosition)} / {formatPreviewTime(timeline.duration)}
            </span>

            <div className="w-px h-5 bg-border mx-1" />

            <button
              onClick={async () => {
                if (!timeline.selectedItem) return;
                const didSplit = await timeline.splitItem(timeline.selectedItem);
                if (didSplit) timeline.setSelectedItem(null);
              }}
              disabled={!timeline.selectedItem}
              title="Split (needs a selected clip, playhead inside it)"
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <SplitSquareHorizontal className="w-4 h-4" />
              <span className="text-xs font-medium hidden lg:inline">Split</span>
            </button>

            <div className="flex-1" />

            <button
              onClick={() => setTimelineHidden((v) => !v)}
              title={timelineHidden ? "Show timeline" : "Hide timeline"}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              {timelineHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span className="text-xs font-medium hidden lg:inline">{timelineHidden ? "Show timeline" : "Hide timeline"}</span>
            </button>

            <div className="flex items-center gap-0.5">
              <button onClick={timeline.zoomOut} title="Zoom out (-)" aria-label="Zoom out" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground w-10 text-center tabular-nums">
                {Math.round(timeline.zoomLevel * 100)}%
              </span>
              <button onClick={timeline.zoomIn} title="Zoom in (+)" aria-label="Zoom in" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!timelineHidden && (
            <>
              {/* Timeline Canvas - fills remaining height on mobile, a shorter
                  fixed band on desktop (was h-64) so the preview above gets
                  the extra room. */}
              <div className={`${isMobile ? "flex-1 min-h-0" : "h-48 flex-shrink-0"} overflow-hidden`}>
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
                  sessionId={sessionId}
                />
              </div>

              {/* Add music affordance below the tracks - reuses the same
                  generate/regenerate music modal Media > Music already opens. */}
              <button
                onClick={() => setShowMusicModal(true)}
                className="shrink-0 w-full py-1.5 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-card border-t border-border hover:bg-muted"
              >
                <Plus className="w-3.5 h-3.5" />
                {musicAsset ? "Change music" : "Add music"}
              </button>
            </>
          )}

          {/* Slim "done editing" bar to deselect the clip (shown when one is
              selected) - both platforms now that there's no persistent
              panel with its own close (X) button; the floating pill below
              has no dismiss control of its own. */}
          {timeline.selectedItem && (
            <button
              data-tour="done-editing"
              onClick={() => timeline.setSelectedItem(null)}
              className="shrink-0 w-full py-1.5 text-xs font-semibold text-primary bg-primary/5 border-t border-border hover:bg-primary/10"
            >
              Done editing clip
            </button>
          )}

          {/* Bottom action bar - mobile only. Desktop's persistent tools live
              in the left rail (EditorSidePanel); clip-contextual tools live
              in the floating ClipActionPill on both platforms now. */}
          {isMobile && (
            <div data-tour="action-bar" className="bg-card border-t border-border shrink-0">
              {/* Mobile equivalent of the desktop left rail - same five
                  categories, Media/Audio wired to real actions, Text/Elements/
                  Settings acknowledged rather than built (nothing exists for
                  them yet on either platform). Always present regardless of
                  selection. */}
              <div className="flex items-center justify-center gap-5 px-1 py-1">
                {[
                  { Icon: Image, label: "Media", onClick: () => setAssetsSheetOpen(true) },
                  { Icon: Music, label: "Audio", onClick: () => setMobileAudioSheetOpen(true) },
                  { Icon: Type, label: "Text", onClick: () => toast.info("Text overlays aren't available yet.") },
                  { Icon: Shapes, label: "Elements", onClick: () => toast.info("Elements aren't available yet.") },
                  { Icon: Settings, label: "Settings", onClick: () => toast.info("Editor settings aren't available yet.") },
                ].map(({ Icon, label, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    className="flex flex-col items-center justify-center gap-0.5 py-1 px-1.5 rounded-lg text-muted-foreground"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] font-medium leading-none">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating clip action pill - replaces the old persistent right-hand
          Clip Details panel. Anchored above the selected clip via
          pillAnchorRect (position: fixed, rendered here so it isn't clipped
          by the timeline's overflow-hidden ancestors); Speed/Volume open the
          existing bottom sheets (already usable on both platforms), the rest
          reuses clipActions(). */}
      {timeline.selectedItem && (() => {
        const info = selectedClipInfo();
        if (!info) return null;
        const isAudioClip = info.item.trackType === "AUDIO";
        return (
          <ClipActionPill
            anchorRect={pillAnchorRect}
            actions={clipActions(info.item)}
            isAudioClip={isAudioClip}
            onSpeed={() => { setSpeedDraft(Number(info.item.speed) || 1); setSpeedSheetOpen(true); }}
            onVolume={() => {
              setVolumeDraft(info.item.volume ?? 1);
              setFadeInDraft(Number(info.item.fadeIn) || 0);
              setFadeOutDraft(Number(info.item.fadeOut) || 0);
              setVolumeSheetOpen(true);
            }}
          />
        );
      })()}

      {/* Modals */}
      {exporting && <ExportProgressModal progress={exportProgress} />}

      {showReferences && (
        <ReferencesModal
          references={timeline.references}
          onClose={() => setShowReferences(false)}
        />
      )}

      {regenSection && (isIntro ? (
        <ReworkSceneModal
          section={regenSection}
          loading={regenerating}
          onClose={closeRegenModal}
          onRework={handleReworkScene}
        />
      ) : (
        <RegenerateClipModal
          section={regenSection}
          loading={regenerating}
          onClose={closeRegenModal}
          onRegenerate={handleRegenerateClip}
        />
      ))}
      {showMusicModal && (
        <RegenerateMusicModal
          musicPrompt={timeline.timeline?.musicPrompt}
          currentUrl={musicAsset?.url}
          loading={regenerating}
          onClose={() => setShowMusicModal(false)}
          onRegenerate={handleRegenerateMusic}
        />
      )}
      {regenerating && (
        <ExportProgressModal
          progress={regenProgress}
          title={regenTitle || (isIntro ? "Reworking scene" : "Regenerating clip")}
        />
      )}

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
          sessionId={sessionId}
          onClose={() => setEditingItem(null)}
          onSave={handleItemUpdate}
        />
      )}

      {editingNarration && (
        <NarrationEditModal
          section={editingNarration.section}
          currentVoiceId={timeline.timeline?.voiceId}
          onClose={closeNarrationModal}
          onSave={handleNarrationSave}
          onRegenerateNarration={handleRegenerateNarration}
        />
      )}

      {/* Playback speed sheet (mobile clip action) */}
      {speedSheetOpen && timeline.selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={closeSpeedSheet}>
          <div className="w-full bg-card rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-foreground">Playback speed</h3>
              <button onClick={closeSpeedSheet} aria-label="Close" className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Which clip this sheet is editing - without this it reads as a
                global setting. */}
            {(() => {
              const info = selectedClipInfo();
              return info ? (
                <div className="flex items-center gap-2 mb-3">
                  {info.thumbnail && (
                    <img src={info.thumbnail} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                  )}
                  <span className="text-xs text-muted-foreground truncate">{info.label}</span>
                </div>
              ) : null;
            })()}
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={closeVolumeSheet}>
          <div className="w-full bg-card rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-foreground">Volume &amp; Fade</h3>
              <button onClick={closeVolumeSheet} aria-label="Close" className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Which clip this sheet is editing - without this it reads as a
                global setting. */}
            {(() => {
              const info = selectedClipInfo();
              return info ? (
                <div className="flex items-center gap-2 mb-3">
                  {info.thumbnail && (
                    <img src={info.thumbnail} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                  )}
                  <span className="text-xs text-muted-foreground truncate">{info.label}</span>
                </div>
              ) : null;
            })()}
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

            {/* Fade in/out - same sheet as Volume (not a separate pill action),
                same commit-on-release convention as the sliders above so
                dragging doesn't flood the save endpoint. 0-5s in 0.5s steps,
                matching the backend's clamp. */}
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Fade in
                  </span>
                  <span className="text-sm font-medium text-foreground tabular-nums">{fadeInDraft.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={fadeInDraft}
                  onChange={(e) => setFadeInDraft(Number(e.target.value))}
                  onPointerUp={() => timeline.updateItem(timeline.selectedItem, { fadeIn: fadeInDraft })}
                  onTouchEnd={() => timeline.updateItem(timeline.selectedItem, { fadeIn: fadeInDraft })}
                  aria-label="Fade in duration, seconds"
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    Fade out
                  </span>
                  <span className="text-sm font-medium text-foreground tabular-nums">{fadeOutDraft.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={fadeOutDraft}
                  onChange={(e) => setFadeOutDraft(Number(e.target.value))}
                  onPointerUp={() => timeline.updateItem(timeline.selectedItem, { fadeOut: fadeOutDraft })}
                  onTouchEnd={() => timeline.updateItem(timeline.selectedItem, { fadeOut: fadeOutDraft })}
                  aria-label="Fade out duration, seconds"
                  className="w-full accent-primary"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile "Audio" rail category - a small choice sheet, mirroring the
          desktop Audio panel's two quick-action buttons. */}
      {mobileAudioSheetOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setMobileAudioSheetOpen(false)}>
          <div
            className="w-full bg-card rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-foreground">Audio</h3>
              <button onClick={() => setMobileAudioSheetOpen(false)} aria-label="Close" className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => { setMobileAudioSheetOpen(false); setShowAudioUpload(true); }}
              className="w-full flex items-center gap-2 py-3 px-3 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted"
            >
              <Upload className="w-4 h-4" />
              Upload audio
            </button>
            <button
              onClick={() => { setMobileAudioSheetOpen(false); setShowTTSModal(true); }}
              className="w-full flex items-center gap-2 py-3 px-3 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted"
            >
              <Mic className="w-4 h-4" />
              Generate AI voice
            </button>
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
                        title={`${regenLabel} clip`}
                        aria-label={`${regenLabel} clip`}
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
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5" /> Music
                  </p>
                  <button
                    onClick={() => { setAssetsSheetOpen(false); setShowMusicModal(true); }}
                    className="text-xs font-medium text-primary flex items-center gap-1 hover:opacity-80"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {musicAsset ? "Regenerate" : "Generate"}
                  </button>
                </div>
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

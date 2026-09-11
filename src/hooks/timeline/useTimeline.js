import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "@/lib/toast";
import * as sessionService from "@/services/session";
import { describeError } from "@/lib/errorDetail";

const PIXELS_PER_SECOND_BASE = 50;

// How many editing actions Undo can step back through.
const HISTORY_LIMIT = 25;

export function useTimeline(sessionId) {
  // Timeline data
  const [timeline, setTimeline] = useState(null);
  const [items, setItems] = useState([]);
  const [sections, setSections] = useState([]);
  const [audioAssets, setAudioAssets] = useState([]);
  const [references, setReferences] = useState([]); // references-pipeline only; empty otherwise
  const [pipelineMode, setPipelineMode] = useState(null); // which pipeline built this video

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  // View state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Selection
  const [selectedItem, setSelectedItem] = useState(null);

  // Loading/saving
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edits made since the last successful Export. Drafts still auto-save, but the
  // rendered video only updates on Export, this drives the "leave without
  // exporting?" warning.
  const [hasUnexportedChanges, setHasUnexportedChanges] = useState(false);

  // Live media elements (registered by VideoPreview). VideoPreview slaves them to
  // the playhead; the clock only reads their readiness to decide whether to wait
  // for a still-buffering track (see the stall gate in the playback loop).
  const videoElsRef = useRef({}); // keyed by video item id, one element per clip
  const audioElsRef = useRef({});
  const audioItemsRef = useRef([]);
  const videoItemsRef = useRef([]);

  // Undo history: snapshots of `items` captured before each editing action.
  // Undo-only (no redo), capped at HISTORY_LIMIT. `itemsRef` lets the mutators
  // read the current items to snapshot without re-subscribing every render.
  const itemsRef = useRef([]);
  const historyRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);

  // Calculate pixels per second based on zoom
  const pixelsPerSecond = PIXELS_PER_SECOND_BASE * zoomLevel;

  // Load timeline data
  const loadTimeline = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const data = await sessionService.getTimeline(sessionId);
      setTimeline(data);
      setItems(data.items || []);
      setSections(data.sections || []);
      setAudioAssets(data.audioAssets || []);
      setReferences(data.references || []);
      setPipelineMode(data.pipelineMode || null);
      setDuration(data.duration || 0);
      setPlayheadPosition(data.playheadPos || 0);
      setZoomLevel(data.zoomLevel || 1);
    } catch (err) {
      console.error("Failed to load timeline:", err);
      toast.error(describeError(err, "We couldn't load your timeline. Please try again.").userMessage);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Load on mount
  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  // Get video and audio items
  const videoItems = items.filter((i) => i.trackType === "VIDEO");
  const audioItems = items.filter((i) => i.trackType === "AUDIO");

  // Get section by ID
  const getSection = useCallback(
    (sectionId) => {
      return sections.find((s) => s.id === sectionId);
    },
    [sections]
  );

  // Get audio asset by ID
  const getAudioAsset = useCallback(
    (assetId) => {
      return audioAssets.find((a) => a.id === assetId);
    },
    [audioAssets]
  );

  // Snapshot the current items onto the undo stack. Called at the start of each
  // editing mutation (before its optimistic change), so Undo can restore the
  // exact prior item set. Shallow-copies each item so later edits don't alias.
  const pushHistory = useCallback(() => {
    const snapshot = itemsRef.current.map((it) => ({ ...it }));
    const stack = historyRef.current;
    stack.push(snapshot);
    if (stack.length > HISTORY_LIMIT) stack.shift();
    setCanUndo(true);
  }, []);

  // Update item on server
  const updateItem = useCallback(
    async (itemId, updates) => {
      if (!sessionId) return;

      pushHistory();

      // Optimistically apply updates to local state immediately. When
      // startTime moves, also carry effectiveStartTime along with it -
      // TimelineItem.jsx renders position from effectiveStartTime ??
      // startTime, and effectiveStartTime is a real, present value (not
      // undefined) once the backend starts returning it, so leaving it
      // untouched here meant the clip rendered from its now-stale value the
      // instant a drag ended, i.e. visually snapped back to its old position
      // even though startTime itself was correctly updated. Assuming
      // effectiveStartTime simply equals the new startTime is exactly right
      // whenever no transition is involved (the common case, and the only
      // case this fix touches); the rarer case - a transition elsewhere on
      // the timeline making them genuinely diverge - self-corrects on the
      // next full reload, same as any other optimistic update would.
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                ...updates,
                ...(updates.startTime !== undefined ? { effectiveStartTime: updates.startTime } : null),
              }
            : item
        )
      );
      setHasUnexportedChanges(true);

      setSaving(true);
      try {
        const updated = await sessionService.updateTimelineItem(
          sessionId,
          itemId,
          updates
        );
        setItems((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, ...updated } : item))
        );
      } catch (err) {
        console.error("Failed to update item:", err);
        toast.error(describeError(err, "We couldn't save that change. Please try again.").userMessage);
        // Revert optimistic update by reloading
        await loadTimeline();
      } finally {
        setSaving(false);
      }
    },
    [sessionId, loadTimeline, pushHistory]
  );

  // Add item to timeline
  const addItem = useCallback(
    async (itemData) => {
      if (!sessionId || !timeline) return;

      pushHistory();
      setHasUnexportedChanges(true);
      setSaving(true);
      try {
        const newItem = await sessionService.addTimelineItem(sessionId, itemData);
        setItems((prev) => [...prev, newItem]);
        await loadTimeline(); // Refresh to get updated duration
      } catch (err) {
        console.error("Failed to add item:", err);
        toast.error(describeError(err, "We couldn't add that to the timeline. Please try again.").userMessage);
      } finally {
        setSaving(false);
      }
    },
    [sessionId, timeline, loadTimeline, pushHistory]
  );

  /**
   * Insert an item and push everything at or after it to the right, an insert
   * edit rather than a stack.
   *
   * ALL tracks shift, not just the one being inserted into. Each video clip has
   * its narration sitting over it, so moving the picture and leaving the voice
   * where it was would slide every line onto the wrong scene. Anything that
   * starts BEFORE the insert point stays put, which is what keeps a full-length
   * music bed anchored at zero.
   *
   * Sent as one bulk replace instead of a call per item: it is a single edit and
   * it lands atomically, and one pushHistory beforehand makes Undo restore the
   * whole row, inserted clip and all.
   */
  const rippleInsert = useCallback(
    async (itemData) => {
      if (!sessionId || !timeline) return;

      const at = Number(itemData.startTime) || 0;
      const shift = Number(itemData.duration) || 0;
      if (!(shift > 0)) return addItem(itemData);

      pushHistory();
      setHasUnexportedChanges(true);
      setSaving(true);

      // EPSILON: a clip starting exactly at the insert point must move, and
      // these values come off frame math, so an exact compare would leave a
      // butt-joined neighbour behind by a rounding error.
      const EPS = 0.005;
      const shifted = itemsRef.current.map((it) =>
        it.startTime >= at - EPS ? { ...it, startTime: it.startTime + shift } : it
      );
      // The server mints the real id (replaceItems generates one for any item
      // arriving without). The optimistic copy still needs SOME id, or it renders
      // with an undefined React key until the round trip lands.
      const inserted = { ...itemData, startTime: at };
      setItems([...shifted, { ...inserted, id: `pending_${Date.now()}` }]);

      try {
        const result = await sessionService.replaceTimelineItems(sessionId, [...shifted, inserted]);
        if (result?.items) setItems(result.items);
        if (typeof result?.duration === "number") setDuration(result.duration);
      } catch (err) {
        console.error("Failed to insert item:", err);
        toast.error(describeError(err, "We couldn't add that to the timeline. Please try again.").userMessage);
        await loadTimeline(); // back to server truth, the optimistic shift never happened
      } finally {
        setSaving(false);
      }
    },
    [sessionId, timeline, addItem, loadTimeline, pushHistory]
  );

  // Remove item from timeline
  const removeItem = useCallback(
    async (itemId) => {
      if (!sessionId) return;

      pushHistory();
      setHasUnexportedChanges(true);
      setSaving(true);
      try {
        await sessionService.removeTimelineItem(sessionId, itemId);
        setItems((prev) => prev.filter((item) => item.id !== itemId));
        if (selectedItem === itemId) {
          setSelectedItem(null);
        }
        await loadTimeline(); // Refresh to get updated duration
      } catch (err) {
        console.error("Failed to remove item:", err);
        toast.error(describeError(err, "We couldn't remove that clip. Please try again.").userMessage);
      } finally {
        setSaving(false);
      }
    },
    [sessionId, selectedItem, loadTimeline]
  );

  // Split item at playhead
  // Returns true/false so callers (the clip action pill) know whether to
  // dismiss the selection - a rejected split (bad playhead position) or a
  // failed request must NOT be treated the same as a completed one.
  const splitItem = useCallback(
    async (itemId) => {
      if (!sessionId) return false;

      const item = items.find((i) => i.id === itemId);
      if (!item) return false;

      // Check if playhead is within item bounds
      const itemEnd = item.startTime + item.duration;
      if (playheadPosition <= item.startTime || playheadPosition >= itemEnd) {
        toast.error("Playhead must be within the item to split");
        return false;
      }

      pushHistory();
      setHasUnexportedChanges(true);
      setSaving(true);
      try {
        const newItems = await sessionService.splitTimelineItem(
          sessionId,
          itemId,
          playheadPosition
        );
        // Replace old item with two new items
        setItems((prev) => {
          const filtered = prev.filter((i) => i.id !== itemId);
          return [...filtered, ...newItems];
        });
        return true;
      } catch (err) {
        console.error("Failed to split item:", err);
        toast.error(describeError(err, "We couldn't split that clip. Please try again.").userMessage);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [sessionId, items, playheadPosition, pushHistory]
  );

  // Undo the last editing action by restoring the previous item snapshot. The
  // whole snapshot is sent to the backend in one call (replaceTimelineItems),
  // which preserves item ids so repeated undos stay consistent. Playhead and
  // zoom are intentionally left untouched. Undo-only - there is no redo.
  const undo = useCallback(async () => {
    const stack = historyRef.current;
    if (stack.length === 0) return;

    const snapshot = stack.pop();
    setCanUndo(stack.length > 0);

    setItems(snapshot); // optimistic restore
    setSelectedItem(null);
    setHasUnexportedChanges(true);
    setSaving(true);
    try {
      const result = await sessionService.replaceTimelineItems(sessionId, snapshot);
      if (result?.items) setItems(result.items);
      if (typeof result?.duration === "number") setDuration(result.duration);
    } catch (err) {
      console.error("Failed to undo:", err);
      toast.error(describeError(err, "We couldn't undo that. Please try again.").userMessage);
      await loadTimeline(); // fall back to server truth
    } finally {
      setSaving(false);
    }
  }, [sessionId, loadTimeline]);

  // Upload audio
  const uploadAudio = useCallback(
    async (file) => {
      if (!sessionId) return;

      setSaving(true);
      try {
        const asset = await sessionService.uploadAudio(sessionId, file);
        setAudioAssets((prev) => [...prev, asset]);
        toast.success("Audio uploaded!");
        return asset;
      } catch (err) {
        console.error("Failed to upload audio:", err);
        toast.error(describeError(err, "We couldn't upload that audio. Please try again.").userMessage);
      } finally {
        setSaving(false);
      }
    },
    [sessionId]
  );

  // Generate TTS
  const generateTTS = useCallback(
    async (text, voiceId, name) => {
      if (!sessionId) return;

      setSaving(true);
      try {
        const asset = await sessionService.generateTTS(sessionId, {
          text,
          voiceId,
          name,
        });
        setAudioAssets((prev) => [...prev, asset]);
        toast.success("TTS generated!");
        return asset;
      } catch (err) {
        console.error("Failed to generate TTS:", err);
        toast.error(describeError(err, "We couldn't generate that narration. Please try again.").userMessage);
      } finally {
        setSaving(false);
      }
    },
    [sessionId]
  );

  // Delete audio asset
  const deleteAudio = useCallback(
    async (audioId) => {
      if (!sessionId) return;

      setHasUnexportedChanges(true);
      setSaving(true);
      try {
        await sessionService.deleteAudioAsset(sessionId, audioId);
        setAudioAssets((prev) => prev.filter((a) => a.id !== audioId));
        // Also remove any timeline items using this asset
        setItems((prev) => prev.filter((i) => i.audioAssetId !== audioId));
        toast.success("Audio deleted!");
      } catch (err) {
        console.error("Failed to delete audio:", err);
        toast.error(describeError(err, "We couldn't delete that audio. Please try again.").userMessage);
      } finally {
        setSaving(false);
      }
    },
    [sessionId]
  );

  // Flag work that changed the video but did not go through the item mutators
  // above: a reworked scene, a regenerated or rewritten narration. Those all
  // land on the server and come back through loadTimeline, so nothing here saw
  // an edit and the editor believed the finished video was still current. The
  // user could then leave with no warning and watch the OLD video on the result
  // page, with nothing saying an Export was needed to pick the change up.
  const markDirty = useCallback(() => setHasUnexportedChanges(true), []);

  // Throw away the undo stack, for when the server has rebuilt the timeline
  // underneath it rather than the user having edited it.
  //
  // An intro rework drops the Timeline row and every VideoSection and remints
  // their ids, so every id in a snapshot taken before it is dead. Undoing onto
  // that replaced the rebuilt rows with items pointing at sections that no
  // longer exist, and the export manifest silently drops those: the export came
  // back missing clips. Deliberately NOT done inside loadTimeline, which the
  // ordinary add/remove mutators call to refresh the duration - clearing there
  // would wipe the snapshot each of them had just pushed.
  const resetHistory = useCallback(() => {
    historyRef.current = [];
    setCanUndo(false);
  }, []);

  // Export timeline. `onProgress({ percentage, label })` is forwarded to the
  // service's job poller so the caller can drive a real progress bar.
  const exportTimeline = useCallback(async (onProgress) => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const video = await sessionService.exportTimeline(sessionId, onProgress);
      toast.success("Export complete!");
      setHasUnexportedChanges(false);
      return video;
    } catch (err) {
      console.error("Failed to export timeline:", err);
      // describeError keeps the backend's jobError text (the useful part of an
      // export failure) while suppressing axios's own "Request failed with..." string.
      toast.error(describeError(err, "We couldn't export your video. Please try again.").userMessage);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Keep the loop's view of items current without re-subscribing each frame.
  audioItemsRef.current = audioItems;
  videoItemsRef.current = videoItems;
  itemsRef.current = items;

  // Playback controls. The playhead is derived from real media time (loop below),
  // so these just move state; the loop follows the media.
  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setPlayheadPosition(0);
  }, []);

  const seek = useCallback((position) => {
    setPlayheadPosition(Math.max(0, position));
  }, []);

  // Central wall-clock playback loop. The playhead is the single source of truth:
  // it advances on real elapsed time, and every media element slaves itself to it
  // (see VideoPreview). There is no "master" element, so a finished narration or
  // missing background music can never freeze the clock, silent stretches simply
  // coast.
  //
  // Stall gate: if a track that *should* be sounding/showing right now is still
  // buffering or seeking, hold for that frame so the picture doesn't race ahead of
  // the sound on startup. A clip whose audio has already ended is past its content
  // and is never part of the gate, so it can't cause a hang.
  useEffect(() => {
    if (!isPlaying) return undefined;

    let raf;
    let lastWall = performance.now();

    const tick = () => {
      const now = performance.now();
      const wallDelta = (now - lastWall) / 1000;
      lastWall = now;

      setPlayheadPosition((prev) => {
        // Media that should be producing output at `prev` right now.
        const gating = [];

        const activeVideo = videoItemsRef.current.find(
          (i) => prev >= i.startTime && prev < i.startTime + i.duration
        );
        if (activeVideo) {
          const el = videoElsRef.current[activeVideo.id];
          if (el) gating.push(el);
        }

        audioItemsRef.current.forEach((i) => {
          if (prev < i.startTime || prev >= i.startTime + i.duration) return;
          const el = audioElsRef.current[i.id];
          if (!el) return;
          const sourceTime = prev - i.startTime + (i.trimStart || 0);
          // A clip whose audio has already ended isn't "should be sounding now".
          const hasContent = !Number.isFinite(el.duration) || sourceTime < el.duration - 0.05;
          if (hasContent) gating.push(el);
        });

        // Only a genuinely un-buffered element (readyState < 2) holds the clock.
        // We deliberately do NOT gate on `el.seeking`: a transient catch-up seek
        // shouldn't freeze the whole timeline - that was the "video sticks and the
        // marker stops but audio keeps playing" stutter. With per-frame re-seeking
        // now removed (see VideoPreview), a playing element stays readyState >= 2,
        // so this only pauses for real buffering. An element that has errored
        // (`el.error`) is excluded so a single failed source can't deadlock the
        // whole clock forever - we'd rather coast past it than hang.
        const stalled = gating.some((el) => el.readyState < 2 && !el.error);

        let next = stalled ? prev : prev + wallDelta;
        if (!Number.isFinite(next)) next = prev;
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return next < prev ? prev : next; // never run backward
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isPlaying, duration]);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(10, prev * 1.5));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(0.1, prev / 1.5));
  }, []);

  // Same 0.1-10 clamp as zoomIn/zoomOut, exposed so a slider can set an
  // arbitrary value directly (continuous drag) rather than only the fixed
  // 1.5x steps those two buttons take.
  const setZoomLevelClamped = useCallback((value) => {
    setZoomLevel(Math.max(0.1, Math.min(10, Number(value) || 1)));
  }, []);

  const resetZoom = useCallback(() => {
    setZoomLevel(1);
  }, []);

  // Convert time to pixel position
  const timeToPixel = useCallback(
    (time) => {
      return time * pixelsPerSecond;
    },
    [pixelsPerSecond]
  );

  // Convert pixel position to time
  const pixelToTime = useCallback(
    (pixel) => {
      return pixel / pixelsPerSecond;
    },
    [pixelsPerSecond]
  );

  // Get item at specific time for a track
  const getItemAtTime = useCallback(
    (time, trackType, trackIndex = 0) => {
      return items.find((item) => {
        if (item.trackType !== trackType || item.trackIndex !== trackIndex) {
          return false;
        }
        const itemEnd = item.startTime + item.duration;
        return time >= item.startTime && time < itemEnd;
      });
    },
    [items]
  );

  // Register the live media elements so the playback clock can read them.
  const registerVideoEl = useCallback((itemId, el) => {
    if (el) videoElsRef.current[itemId] = el;
    else delete videoElsRef.current[itemId];
  }, []);

  const registerAudioEl = useCallback((itemId, el) => {
    if (el) audioElsRef.current[itemId] = el;
    else delete audioElsRef.current[itemId];
  }, []);

  return {
    // Data
    timeline,
    items,
    videoItems,
    audioItems,
    sections,
    audioAssets,
    references,
    pipelineMode,
    duration,

    // Playback
    isPlaying,
    playheadPosition,
    play,
    pause,
    stop,
    seek,

    // View
    zoomLevel,
    pixelsPerSecond,
    scrollPosition,
    setScrollPosition,
    zoomIn,
    zoomOut,
    setZoomLevel: setZoomLevelClamped,
    resetZoom,

    // Selection
    selectedItem,
    setSelectedItem,

    // Item operations
    updateItem,
    addItem,
    rippleInsert,
    removeItem,
    splitItem,

    // Undo
    undo,
    canUndo,

    // Audio operations
    uploadAudio,
    generateTTS,
    deleteAudio,

    // Export
    exportTimeline,

    // Loading state
    loading,
    saving,
    hasUnexportedChanges,
    markDirty,
    resetHistory,
    loadTimeline,

    // Utilities
    getSection,
    getAudioAsset,
    timeToPixel,
    pixelToTime,
    getItemAtTime,
    registerVideoEl,
    registerAudioEl,
  };
}

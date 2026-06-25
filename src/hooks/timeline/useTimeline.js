import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import * as sessionService from "@/services/session";

const PIXELS_PER_SECOND_BASE = 50;

export function useTimeline(sessionId) {
  // Timeline data
  const [timeline, setTimeline] = useState(null);
  const [items, setItems] = useState([]);
  const [sections, setSections] = useState([]);
  const [audioAssets, setAudioAssets] = useState([]);

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

  // Refs for playback
  const animationFrameRef = useRef(null);
  const lastTimeRef = useRef(null);
  const videoRefs = useRef({});
  const audioRefs = useRef({});

  // Live media elements (registered by VideoPreview) — the playback clock reads
  // their real currentTime so the playhead never runs ahead of the sound.
  const videoElRef = useRef(null);
  const audioElsRef = useRef({});
  const audioItemsRef = useRef([]);
  const videoItemsRef = useRef([]);

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
      setDuration(data.duration || 0);
      setPlayheadPosition(data.playheadPos || 0);
      setZoomLevel(data.zoomLevel || 1);
    } catch (err) {
      console.error("Failed to load timeline:", err);
      toast.error("Failed to load timeline");
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

  // Update item on server
  const updateItem = useCallback(
    async (itemId, updates) => {
      if (!sessionId) return;

      // Optimistically apply updates to local state immediately
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
      );

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
        toast.error("Failed to update item");
        // Revert optimistic update by reloading
        await loadTimeline();
      } finally {
        setSaving(false);
      }
    },
    [sessionId, loadTimeline]
  );

  // Add item to timeline
  const addItem = useCallback(
    async (itemData) => {
      if (!sessionId || !timeline) return;

      setSaving(true);
      try {
        const newItem = await sessionService.addTimelineItem(sessionId, itemData);
        setItems((prev) => [...prev, newItem]);
        await loadTimeline(); // Refresh to get updated duration
      } catch (err) {
        console.error("Failed to add item:", err);
        toast.error("Failed to add item");
      } finally {
        setSaving(false);
      }
    },
    [sessionId, timeline, loadTimeline]
  );

  // Remove item from timeline
  const removeItem = useCallback(
    async (itemId) => {
      if (!sessionId) return;

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
        toast.error("Failed to remove item");
      } finally {
        setSaving(false);
      }
    },
    [sessionId, selectedItem, loadTimeline]
  );

  // Split item at playhead
  const splitItem = useCallback(
    async (itemId) => {
      if (!sessionId) return;

      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      // Check if playhead is within item bounds
      const itemEnd = item.startTime + item.duration;
      if (playheadPosition <= item.startTime || playheadPosition >= itemEnd) {
        toast.error("Playhead must be within the item to split");
        return;
      }

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
      } catch (err) {
        console.error("Failed to split item:", err);
        toast.error("Failed to split item");
      } finally {
        setSaving(false);
      }
    },
    [sessionId, items, playheadPosition]
  );

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
        toast.error("Failed to upload audio");
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
        toast.error("Failed to generate TTS");
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

      setSaving(true);
      try {
        await sessionService.deleteAudioAsset(sessionId, audioId);
        setAudioAssets((prev) => prev.filter((a) => a.id !== audioId));
        // Also remove any timeline items using this asset
        setItems((prev) => prev.filter((i) => i.audioAssetId !== audioId));
        toast.success("Audio deleted!");
      } catch (err) {
        console.error("Failed to delete audio:", err);
        toast.error("Failed to delete audio");
      } finally {
        setSaving(false);
      }
    },
    [sessionId]
  );

  // Export timeline
  const exportTimeline = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      toast.info("Exporting timeline...");
      const video = await sessionService.exportTimeline(sessionId);
      toast.success("Export complete!");
      return video;
    } catch (err) {
      console.error("Failed to export timeline:", err);
      toast.error("Failed to export timeline");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Keep the loop's view of items current without re-subscribing each frame.
  audioItemsRef.current = audioItems;
  videoItemsRef.current = videoItems;

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

  // Media-driven playback loop — single source of truth is the playing media's
  // own clock. The playhead follows the active media element's real currentTime,
  // so it can never lead the sound. While media at the playhead is still spinning
  // up, the playhead holds (no startup leap); a true gap coasts on wall-clock.
  useEffect(() => {
    if (!isPlaying) return undefined;

    let raf;
    let lastWall = performance.now();

    const tick = () => {
      const now = performance.now();
      const wallDelta = (now - lastWall) / 1000;
      lastWall = now;

      setPlayheadPosition((prev) => {
        const audioActive = audioItemsRef.current.find(
          (i) =>
            prev >= i.startTime &&
            prev < i.startTime + i.duration &&
            audioElsRef.current[i.id]
        );
        const videoActive = videoItemsRef.current.find(
          (i) => prev >= i.startTime && prev < i.startTime + i.duration && videoElRef.current
        );

        const master = audioActive
          ? { item: audioActive, el: audioElsRef.current[audioActive.id] }
          : videoActive
          ? { item: videoActive, el: videoElRef.current }
          : null;

        let next;
        if (master) {
          if (!master.el.paused && master.el.readyState >= 2) {
            next =
              master.item.startTime + (master.el.currentTime - (master.item.trimStart || 0));
          } else {
            next = prev; // media present but not playing yet — hold (no leap)
          }
        } else {
          next = prev + wallDelta; // genuine gap — coast
        }

        if (!Number.isFinite(next)) next = prev;
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }
        // Guard tiny backward jitter at clip transitions.
        return next < prev - 0.05 ? prev : next;
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
  const registerVideoEl = useCallback((el) => {
    videoElRef.current = el;
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
    resetZoom,

    // Selection
    selectedItem,
    setSelectedItem,

    // Item operations
    updateItem,
    addItem,
    removeItem,
    splitItem,

    // Audio operations
    uploadAudio,
    generateTTS,
    deleteAudio,

    // Export
    exportTimeline,

    // Loading state
    loading,
    saving,
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

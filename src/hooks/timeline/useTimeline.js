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
      } finally {
        setSaving(false);
      }
    },
    [sessionId]
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

  // Playback controls
  const play = useCallback(() => {
    setIsPlaying(true);
    lastTimeRef.current = performance.now();

    const animate = (currentTime) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      setPlayheadPosition((prev) => {
        const newPos = prev + deltaTime;
        if (newPos >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return newPos;
      });

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [duration, isPlaying]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const stop = useCallback(() => {
    pause();
    setPlayheadPosition(0);
  }, [pause]);

  const seek = useCallback((position) => {
    setPlayheadPosition(Math.max(0, position));
  }, []);

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Playback loop
  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        const currentTime = performance.now();
        if (!lastTimeRef.current) {
          lastTimeRef.current = currentTime;
        }

        const deltaTime = (currentTime - lastTimeRef.current) / 1000;
        lastTimeRef.current = currentTime;

        setPlayheadPosition((prev) => {
          const newPos = prev + deltaTime;
          if (newPos >= duration) {
            setIsPlaying(false);
            return duration;
          }
          return newPos;
        });

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
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

  // Register video/audio elements for playback sync
  const registerVideoRef = useCallback((itemId, ref) => {
    videoRefs.current[itemId] = ref;
  }, []);

  const registerAudioRef = useCallback((itemId, ref) => {
    audioRefs.current[itemId] = ref;
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
    registerVideoRef,
    registerAudioRef,
  };
}

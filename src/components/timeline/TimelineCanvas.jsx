import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import TimelineRuler from "./TimelineRuler";
import TimelinePlayhead from "./TimelinePlayhead";
import TimelineTrack from "./TimelineTrack";

const SNAP_THRESHOLD_PX = 8; // Snap within 8 pixels

export default function TimelineCanvas({
  videoItems,
  audioItems,
  duration,
  playheadPosition,
  pixelsPerSecond,
  selectedItem,
  onSelectItem,
  onSeek,
  onUpdateItem,
  onItemEdit,
  getSection,
  getAudioAsset,
  onAssetDrop,
}) {
  const containerRef = useRef(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null); // 'move', 'trim-start', 'trim-end'
  const [dragItem, setDragItem] = useState(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartValue, setDragStartValue] = useState(0);
  const [dragOffset, setDragOffset] = useState(0); // Current drag offset in pixels
  const [snapIndicator, setSnapIndicator] = useState(null); // { time: number } for visual snap line

  const timelineWidth = Math.max(duration * pixelsPerSecond + 200, 800);
  const trackHeight = 60;
  const totalTracks = 3;

  // Split audio items into narration (trackIndex 0) and music (trackIndex 1)
  const narrationItems = audioItems.filter((i) => i.trackIndex !== 1);
  const musicItems = audioItems.filter((i) => i.trackIndex === 1);

  // Get all snap points for the track the dragged item belongs to
  const getSnapPoints = useCallback(
    (draggedItem) => {
      const trackItems =
        draggedItem.trackType === "VIDEO"
          ? videoItems
          : draggedItem.trackIndex === 1
          ? musicItems
          : narrationItems;
      const points = new Set();

      // Add edges of other clips on the same track
      trackItems.forEach((item) => {
        if (item.id === draggedItem.id) return;
        points.add(item.startTime);
        points.add(item.startTime + item.duration);
      });

      // Add playhead position
      points.add(playheadPosition);

      // Add grid points (every 0.5s)
      for (let t = 0; t <= duration; t += 0.5) {
        points.add(t);
      }

      // Add timeline start
      points.add(0);

      return [...points];
    },
    [videoItems, narrationItems, musicItems, playheadPosition, duration]
  );

  // Find the nearest snap target for a given time value
  const findSnapTarget = useCallback(
    (time, draggedItem) => {
      const snapPoints = getSnapPoints(draggedItem);
      const thresholdTime = SNAP_THRESHOLD_PX / pixelsPerSecond;

      let closest = null;
      let closestDist = Infinity;

      for (const point of snapPoints) {
        const dist = Math.abs(time - point);
        if (dist < closestDist && dist <= thresholdTime) {
          closest = point;
          closestDist = dist;
        }
      }

      return closest;
    },
    [getSnapPoints, pixelsPerSecond]
  );

  // Find nearest non-overlapping position for an item
  const findNonOverlappingPosition = useCallback(
    (itemId, startTime, itemDuration, trackType, trackIdx = 0) => {
      const trackItems =
        trackType === "VIDEO"
          ? videoItems
          : trackIdx === 1
          ? musicItems
          : narrationItems;
      const others = trackItems.filter((it) => it.id !== itemId);

      const wouldOverlap = (st) => {
        const end = st + itemDuration;
        return others.some(
          (o) => st < o.startTime + o.duration && end > o.startTime
        );
      };

      if (!wouldOverlap(startTime)) return startTime;

      // Try snapping to the end of the overlapping item, or the start minus duration
      let bestPos = startTime;
      let bestDist = Infinity;

      for (const other of others) {
        // Place right after this item
        const afterPos = other.startTime + other.duration;
        if (!wouldOverlap(afterPos)) {
          const dist = Math.abs(afterPos - startTime);
          if (dist < bestDist) {
            bestDist = dist;
            bestPos = afterPos;
          }
        }

        // Place right before this item
        const beforePos = other.startTime - itemDuration;
        if (beforePos >= 0 && !wouldOverlap(beforePos)) {
          const dist = Math.abs(beforePos - startTime);
          if (dist < bestDist) {
            bestDist = dist;
            bestPos = beforePos;
          }
        }
      }

      return Math.max(0, bestPos);
    },
    [videoItems, narrationItems, musicItems]
  );

  // Detect overlapping items
  const detectOverlaps = useCallback((items) => {
    const overlaps = new Set();
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const aStart = a.startTime;
        const aEnd = a.startTime + a.duration;
        const bStart = b.startTime;
        const bEnd = b.startTime + b.duration;

        // Check if they overlap
        if (aStart < bEnd && aEnd > bStart) {
          overlaps.add(a.id);
          overlaps.add(b.id);
        }
      }
    }
    return overlaps;
  }, []);

  // Calculate overlaps for video, audio, and music tracks
  const videoOverlaps = useMemo(() => detectOverlaps(videoItems), [videoItems, detectOverlaps]);
  const audioOverlaps = useMemo(() => detectOverlaps(narrationItems), [narrationItems, detectOverlaps]);
  const musicOverlaps = useMemo(() => detectOverlaps(musicItems), [musicItems, detectOverlaps]);

  // Calculate drag preview position for the dragged item (with snapping)
  const getDragPreview = useCallback(() => {
    if (!isDragging || !dragItem) return null;

    const deltaTime = dragOffset / pixelsPerSecond;

    if (dragType === "move") {
      let newStartTime = Math.max(0, dragStartValue + deltaTime);

      // Try snapping the start edge
      const snapStart = findSnapTarget(newStartTime, dragItem);
      // Try snapping the end edge
      const endTime = newStartTime + dragItem.duration;
      const snapEnd = findSnapTarget(endTime, dragItem);

      // Pick whichever snap is closer
      if (snapStart !== null && snapEnd !== null) {
        const distStart = Math.abs(newStartTime - snapStart);
        const distEnd = Math.abs(endTime - snapEnd);
        if (distStart <= distEnd) {
          newStartTime = snapStart;
        } else {
          newStartTime = snapEnd - dragItem.duration;
        }
      } else if (snapStart !== null) {
        newStartTime = snapStart;
      } else if (snapEnd !== null) {
        newStartTime = snapEnd - dragItem.duration;
      }

      newStartTime = Math.max(0, newStartTime);

      return {
        itemId: dragItem.id,
        previewStartTime: newStartTime,
        previewDuration: dragItem.duration,
      };
    }

    return null;
  }, [isDragging, dragItem, dragType, dragOffset, dragStartValue, pixelsPerSecond, findSnapTarget]);

  const dragPreview = getDragPreview();

  // Update snap indicator whenever drag preview changes
  useEffect(() => {
    if (!dragPreview || !dragItem) {
      setSnapIndicator(null);
      return;
    }

    const deltaTime = dragOffset / pixelsPerSecond;
    const rawStartTime = Math.max(0, dragStartValue + deltaTime);

    // Check if we actually snapped (preview differs from raw position)
    const snappedStart = dragPreview.previewStartTime;
    const threshold = SNAP_THRESHOLD_PX / pixelsPerSecond;

    if (Math.abs(snappedStart - rawStartTime) > 0.001) {
      // We snapped the start edge
      const endSnap = snappedStart + dragItem.duration;
      const rawEnd = rawStartTime + dragItem.duration;
      // Show the snap line at whichever edge snapped
      if (Math.abs(snappedStart - rawStartTime) <= Math.abs(endSnap - rawEnd)) {
        setSnapIndicator({ time: snappedStart });
      } else {
        setSnapIndicator({ time: endSnap });
      }
    } else {
      setSnapIndicator(null);
    }
  }, [dragPreview, dragItem, dragOffset, dragStartValue, pixelsPerSecond]);

  // Handle scroll
  const handleScroll = (e) => {
    setScrollLeft(e.target.scrollLeft);
  };

  // Handle ruler click to seek
  const handleRulerClick = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft - 80; // subtract 80px track label width
    const time = x / pixelsPerSecond;
    onSeek(Math.max(0, Math.min(duration, time)));
  };

  // Handle item drag start
  const handleItemDragStart = (item, type, e) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragType(type);
    setDragItem(item);
    setDragStartX(e.clientX);
    setDragStartValue(
      type === "move"
        ? item.startTime
        : type === "trim-start"
        ? item.trimStart
        : item.duration
    );
  };

  // Handle drag move
  const handleDragMove = useCallback(
    (e) => {
      if (!isDragging || !dragItem) return;

      const deltaX = e.clientX - dragStartX;
      setDragOffset(deltaX); // Update drag offset for visual feedback
    },
    [isDragging, dragItem, dragStartX]
  );

  // Handle drag end (with snapping + overlap prevention)
  const handleDragEnd = useCallback(
    async (e) => {
      if (!isDragging || !dragItem) return;

      const deltaX = e.clientX - dragStartX;
      const deltaTime = deltaX / pixelsPerSecond;

      let updates = {};

      if (dragType === "move") {
        let newStartTime = Math.max(0, dragStartValue + deltaTime);

        // Apply snapping
        const snapStart = findSnapTarget(newStartTime, dragItem);
        const endTime = newStartTime + dragItem.duration;
        const snapEnd = findSnapTarget(endTime, dragItem);

        if (snapStart !== null && snapEnd !== null) {
          const distStart = Math.abs(newStartTime - snapStart);
          const distEnd = Math.abs(endTime - snapEnd);
          newStartTime = distStart <= distEnd ? snapStart : snapEnd - dragItem.duration;
        } else if (snapStart !== null) {
          newStartTime = snapStart;
        } else if (snapEnd !== null) {
          newStartTime = snapEnd - dragItem.duration;
        }

        newStartTime = Math.max(0, newStartTime);

        // Prevent overlap
        newStartTime = findNonOverlappingPosition(
          dragItem.id,
          newStartTime,
          dragItem.duration,
          dragItem.trackType,
          dragItem.trackIndex
        );

        updates.startTime = newStartTime;
      }

      // Clear drag state immediately so mouse movements stop being tracked
      setIsDragging(false);
      setDragType(null);
      setDragItem(null);
      setDragOffset(0);
      setSnapIndicator(null);

      if (Object.keys(updates).length > 0) {
        await onUpdateItem(dragItem.id, updates);
      }
    },
    [isDragging, dragItem, dragStartX, dragStartValue, dragType, pixelsPerSecond, onUpdateItem, findSnapTarget, findNonOverlappingPosition, videoItems, narrationItems, musicItems]
  );

  // Add mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Handle drop from asset panel (with overlap prevention)
  const handleDrop = (e, trackType, trackIndex) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("application/json");
    if (!data) return;

    try {
      const asset = JSON.parse(data);
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollLeft;
      let startTime = Math.max(0, x / pixelsPerSecond);

      // Estimate duration for overlap check (use asset duration or default)
      const assetDuration = asset.duration || 3;
      startTime = findNonOverlappingPosition(
        null, // no existing item id
        startTime,
        assetDuration,
        trackType,
        trackIndex
      );

      onAssetDrop(asset, trackType, startTime, trackIndex);
    } catch (err) {
      console.error("Failed to parse drop data:", err);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div
      ref={containerRef}
      data-timeline-container
      className="w-full h-full overflow-auto bg-muted"
      onScroll={handleScroll}
    >
      <div
        className="relative"
        style={{ width: timelineWidth, minHeight: "100%" }}
      >
        {/* Ruler */}
        <div
          className="sticky top-0 z-20 bg-card border-b border-border"
          onClick={handleRulerClick}
        >
          <TimelineRuler
            duration={duration}
            pixelsPerSecond={pixelsPerSecond}
            width={timelineWidth}
          />
        </div>

        {/* Tracks Container */}
        <div className="relative">
          {/* Video Track */}
          <TimelineTrack
            label="Video"
            trackType="VIDEO"
            trackIndex={0}
            items={videoItems}
            height={trackHeight}
            pixelsPerSecond={pixelsPerSecond}
            selectedItem={selectedItem}
            onSelectItem={onSelectItem}
            onItemDragStart={handleItemDragStart}
            onItemEdit={onItemEdit}
            getSection={getSection}
            getAudioAsset={getAudioAsset}
            onDrop={(e) => handleDrop(e, "VIDEO", 0)}
            onDragOver={handleDragOver}
            overlappingItems={videoOverlaps}
            dragPreview={dragPreview}
          />

          {/* Audio Track (Narration) */}
          <TimelineTrack
            label="Audio"
            trackType="AUDIO"
            trackIndex={0}
            items={narrationItems}
            height={trackHeight}
            pixelsPerSecond={pixelsPerSecond}
            selectedItem={selectedItem}
            onSelectItem={onSelectItem}
            onItemDragStart={handleItemDragStart}
            onItemEdit={onItemEdit}
            getSection={getSection}
            getAudioAsset={getAudioAsset}
            onDrop={(e) => handleDrop(e, "AUDIO", 0)}
            onDragOver={handleDragOver}
            overlappingItems={audioOverlaps}
            dragPreview={dragPreview}
          />

          {/* Music Track */}
          <TimelineTrack
            label="Music"
            trackType="AUDIO"
            trackIndex={1}
            items={musicItems}
            height={trackHeight}
            pixelsPerSecond={pixelsPerSecond}
            selectedItem={selectedItem}
            onSelectItem={onSelectItem}
            onItemDragStart={handleItemDragStart}
            onItemEdit={onItemEdit}
            getSection={getSection}
            getAudioAsset={getAudioAsset}
            onDrop={(e) => handleDrop(e, "AUDIO", 1)}
            onDragOver={handleDragOver}
            overlappingItems={musicOverlaps}
            dragPreview={dragPreview}
          />

          {/* Snap indicator line */}
          {snapIndicator && (
            <div
              className="absolute top-0 w-px bg-accent pointer-events-none z-30"
              style={{
                left: snapIndicator.time * pixelsPerSecond + 80, // +80 for track label width
                height: trackHeight * totalTracks,
                boxShadow: "0 0 4px hsl(var(--accent) / 0.6)",
              }}
            />
          )}

          {/* Playhead */}
          <TimelinePlayhead
            position={playheadPosition}
            pixelsPerSecond={pixelsPerSecond}
            height={trackHeight * totalTracks + 40}
            onSeek={onSeek}
          />
        </div>
      </div>
    </div>
  );
}

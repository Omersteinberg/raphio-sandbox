import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import TimelineRuler from "./TimelineRuler";
import TimelinePlayhead from "./TimelinePlayhead";
import TimelineTrack from "./TimelineTrack";

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
  onNarrationEdit,
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

  const timelineWidth = Math.max(duration * pixelsPerSecond + 200, 800);
  const trackHeight = 60;

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

  // Calculate overlaps for video and audio tracks
  const videoOverlaps = useMemo(() => detectOverlaps(videoItems), [videoItems, detectOverlaps]);
  const audioOverlaps = useMemo(() => detectOverlaps(audioItems), [audioItems, detectOverlaps]);

  // Calculate drag preview position for the dragged item
  const getDragPreview = useCallback(() => {
    if (!isDragging || !dragItem || dragType !== "move") return null;

    const deltaTime = dragOffset / pixelsPerSecond;
    const newStartTime = Math.max(0, dragStartValue + deltaTime);

    return {
      itemId: dragItem.id,
      previewStartTime: newStartTime,
    };
  }, [isDragging, dragItem, dragType, dragOffset, dragStartValue, pixelsPerSecond]);

  const dragPreview = getDragPreview();

  // Handle scroll
  const handleScroll = (e) => {
    setScrollLeft(e.target.scrollLeft);
  };

  // Handle ruler click to seek
  const handleRulerClick = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollLeft;
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

  // Handle drag end
  const handleDragEnd = useCallback(
    async (e) => {
      if (!isDragging || !dragItem) return;

      const deltaX = e.clientX - dragStartX;
      const deltaTime = deltaX / pixelsPerSecond;

      let updates = {};

      if (dragType === "move") {
        updates.startTime = Math.max(0, dragStartValue + deltaTime);
      } else if (dragType === "trim-start") {
        const newTrimStart = Math.max(0, dragStartValue + deltaTime);
        updates.trimStart = newTrimStart;
        // Adjust duration to compensate
        updates.duration = dragItem.duration - deltaTime;
        updates.startTime = dragItem.startTime + deltaTime;
      } else if (dragType === "trim-end") {
        updates.duration = Math.max(0.5, dragStartValue + deltaTime);
      }

      if (Object.keys(updates).length > 0) {
        await onUpdateItem(dragItem.id, updates);
      }

      setIsDragging(false);
      setDragType(null);
      setDragItem(null);
      setDragOffset(0);
    },
    [isDragging, dragItem, dragStartX, dragStartValue, dragType, pixelsPerSecond, onUpdateItem]
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

  // Handle drop from asset panel
  const handleDrop = (e, trackType, trackIndex) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("application/json");
    if (!data) return;

    try {
      const asset = JSON.parse(data);
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollLeft;
      const startTime = Math.max(0, x / pixelsPerSecond);
      onAssetDrop(asset, trackType, startTime);
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
      className="w-full h-full overflow-auto bg-gray-900"
      onScroll={handleScroll}
    >
      <div
        className="relative"
        style={{ width: timelineWidth, minHeight: "100%" }}
      >
        {/* Ruler */}
        <div
          className="sticky top-0 z-20 bg-gray-800 border-b border-gray-700"
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
            onNarrationEdit={onNarrationEdit}
            getSection={getSection}
            getAudioAsset={getAudioAsset}
            onDrop={(e) => handleDrop(e, "VIDEO", 0)}
            onDragOver={handleDragOver}
            overlappingItems={videoOverlaps}
            dragPreview={dragPreview}
          />

          {/* Audio Track */}
          <TimelineTrack
            label="Audio"
            trackType="AUDIO"
            trackIndex={0}
            items={audioItems}
            height={trackHeight}
            pixelsPerSecond={pixelsPerSecond}
            selectedItem={selectedItem}
            onSelectItem={onSelectItem}
            onItemDragStart={handleItemDragStart}
            onItemEdit={onItemEdit}
            onNarrationEdit={onNarrationEdit}
            getSection={getSection}
            getAudioAsset={getAudioAsset}
            onDrop={(e) => handleDrop(e, "AUDIO", 0)}
            onDragOver={handleDragOver}
            overlappingItems={audioOverlaps}
            dragPreview={dragPreview}
          />

          {/* Playhead */}
          <TimelinePlayhead
            position={playheadPosition}
            pixelsPerSecond={pixelsPerSecond}
            height={trackHeight * 2 + 40}
          />
        </div>
      </div>
    </div>
  );
}

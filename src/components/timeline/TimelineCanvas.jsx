import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import TimelineRuler from "./TimelineRuler";
import TimelinePlayhead from "./TimelinePlayhead";
import TimelineTrack from "./TimelineTrack";

const SNAP_THRESHOLD_PX = 10; // Snap within 10 pixels
const MIN_DURATION = 0.5; // Shortest a clip can be trimmed to (seconds)

// Width of the label column at the head of every track row (TimelineTrack's
// `w-20`). It sits INSIDE the scrolling content, so a pointer x measured against
// the scroll container is this much further right than the track's own time
// axis. Every conversion between pixels and seconds has to account for it: the
// drop handler used to skip it and dropped every asset 80px late (1.6s at zoom
// 1), while the snap indicator added it back by hand.
const TRACK_LABEL_WIDTH = 80;

// How far a dropped asset may be nudged to avoid an overlap, in pixels, so the
// nudge scales with zoom the way the user's sense of "about here" does. Past
// this the drop keeps the position it was made at and simply overlaps (the
// track flags overlapping clips in red).
//
// Without a limit, findNonOverlappingPosition returns the nearest free slot
// ANYWHERE on the row. A brand intro tiles its video track edge to edge with no
// gaps, so the only free slot is past the last clip: every drop silently landed
// at the end of the timeline, off screen, which read as the drag doing nothing.
const DROP_NUDGE_LIMIT_PX = 80;

// Clips that merely touch are not overlapping. Timeline rows are written from
// frame math and stored as doubles, so a butt joint lands a fraction either side
// of exact: a freshly assembled intro has a pair whose ends differ by 1.78e-15s.
// With no tolerance that reads as an overlap, which paints the pair red and lets
// the noise reject slots that are genuinely free. 5ms is well under a frame at
// 30fps and a quarter of a pixel at zoom 1, so nothing visible can hide in it.
const OVERLAP_EPSILON = 0.005;

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
  const [dropRow, setDropRow] = useState(null); // { trackType, trackIndex } row under an asset being dragged in

  const timelineWidth = Math.max(duration * pixelsPerSecond + 200, 800);
  const trackHeight = 60;
  const totalTracks = 4;

  // Group audio into three rows by source KIND (not stored trackIndex, so older
  // timelines map correctly): Narration (section narration + TTS voice), Audio
  // (uploaded files), Music (background music).
  const audioKind = (item) => {
    if (item.sectionId) return "narration";
    const a = item.audioAssetId ? getAudioAsset(item.audioAssetId) : null;
    if (a?.sourceType === "AI_MUSIC") return "music";
    if (a?.sourceType === "TTS") return "narration";
    return "audio"; // UPLOAD or anything else
  };
  const narrationItems = audioItems.filter((i) => audioKind(i) === "narration");
  const audioRowItems = audioItems.filter((i) => audioKind(i) === "audio");
  const musicItems = audioItems.filter((i) => audioKind(i) === "music");

  // The items on one ROW, addressed the way the rows are rendered below. Used
  // for drops, where there is no existing item to infer the row from.
  const rowItems = useCallback(
    (trackType, trackIndex) => {
      if (trackType === "VIDEO") return videoItems;
      if (trackIndex === 2) return musicItems;
      if (trackIndex === 1) return audioRowItems;
      return narrationItems;
    },
    [videoItems, narrationItems, audioRowItems, musicItems]
  );

  // The row an item lives on. An existing item knows its own by membership
  // (kind-based), so it is found regardless of the trackIndex stored against it.
  // Something being dropped has no item yet, and inferring from a null id used to
  // fall through every branch to the narration row: audio dropped on Audio or
  // Music was fitted around lines it could not collide with, and landed on top of
  // the clips that were really there.
  const rowFor = useCallback(
    (itemId, trackType, trackIndex = 0) => {
      if (!itemId) return rowItems(trackType, trackIndex);
      if (trackType === "VIDEO") return videoItems;
      if (musicItems.some((i) => i.id === itemId)) return musicItems;
      if (audioRowItems.some((i) => i.id === itemId)) return audioRowItems;
      return narrationItems;
    },
    [rowItems, videoItems, narrationItems, audioRowItems, musicItems]
  );

  // The clip boundary nearest `time` on a row: 0, or the start or end of one of
  // its clips. An insert goes BETWEEN clips, never through the middle of one, so
  // a drop that lands inside a clip is taken to the closer of its two edges.
  const nearestInsertPoint = useCallback(
    (time, trackType, trackIndex = 0) => {
      const edges = [0];
      for (const it of rowItems(trackType, trackIndex)) {
        edges.push(it.startTime, it.startTime + it.duration);
      }
      return edges.reduce((best, e) => (Math.abs(e - time) < Math.abs(best - time) ? e : best), 0);
    },
    [rowItems]
  );

  // Would an item of `itemDuration` starting at `st` collide with anything else
  // on its own row?
  const collidesOnRow = useCallback(
    (itemId, st, itemDuration, trackType, trackIndex = 0) =>
      rowFor(itemId, trackType, trackIndex).some(
        (o) =>
          o.id !== itemId &&
          st < o.startTime + o.duration - OVERLAP_EPSILON &&
          st + itemDuration > o.startTime + OVERLAP_EPSILON
      ),
    [rowFor]
  );

  // Underlying source length for a clip - used to clamp trimming.
  const getSourceDuration = (item) => {
    if (item.trackType === "VIDEO") {
      const s = item.sectionId ? getSection(item.sectionId) : null;
      return s?.clipDuration || (item.trimStart || 0) + item.duration;
    }
    const a = item.audioAssetId ? getAudioAsset(item.audioAssetId) : null;
    if (a?.duration) return a.duration;
    const s = item.sectionId ? getSection(item.sectionId) : null;
    return s?.narrationDuration ?? s?.clipDuration ?? ((item.trimStart || 0) + item.duration);
  };

  // Snap points: the edges of EVERY clip on EVERY track (so a clip lines up with
  // clips above/below it, like CapCut), plus the playhead, the timeline start,
  // and the timeline end. No fine grid - that made dragging feel steppy and
  // drowned out the meaningful alignment points.
  const getSnapPoints = useCallback(
    (draggedItem) => {
      const points = new Set();

      [...videoItems, ...narrationItems, ...audioRowItems, ...musicItems].forEach((item) => {
        if (item.id === draggedItem.id) return;
        points.add(item.startTime);
        points.add(item.startTime + item.duration);
      });

      points.add(playheadPosition);
      points.add(0);
      if (duration > 0) points.add(duration);

      return [...points];
    },
    [videoItems, narrationItems, audioRowItems, musicItems, playheadPosition, duration]
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

  // Find nearest non-overlapping position for an item.
  //
  // `maxNudge` caps how far the result may sit from `startTime`; past it the
  // request is returned untouched. Callers that are placing something at a
  // deliberate position (a drop) pass one, so a row with no gap near the pointer
  // overlaps in place instead of teleporting to the end of the timeline.
  const findNonOverlappingPosition = useCallback(
    (itemId, startTime, itemDuration, trackType, trackIdx = 0, maxNudge = Infinity) => {
      const others = rowFor(itemId, trackType, trackIdx).filter((it) => it.id !== itemId);

      const wouldOverlap = (st) => {
        const end = st + itemDuration;
        return others.some(
          (o) =>
            st < o.startTime + o.duration - OVERLAP_EPSILON &&
            end > o.startTime + OVERLAP_EPSILON
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

      if (bestDist > maxNudge) return startTime;
      return Math.max(0, bestPos);
    },
    [rowFor]
  );

  // Where a moved clip actually lands: snapped, then kept off its neighbours.
  //
  // Shared by the drag preview and the commit, so the clip stops where it was
  // drawn. They used to run their own copies of the snap and only the commit
  // avoided overlaps, so a clip visibly jumped on release.
  const resolveMoveStart = useCallback(
    (item, rawStart) => {
      const dur = item.duration;
      const snapStart = findSnapTarget(rawStart, item);
      const snapEnd = findSnapTarget(rawStart + dur, item);

      const candidates = [];
      if (snapStart !== null) candidates.push({ pos: snapStart, dist: Math.abs(rawStart - snapStart) });
      if (snapEnd !== null) candidates.push({ pos: snapEnd - dur, dist: Math.abs(rawStart + dur - snapEnd) });
      candidates.sort((a, b) => a.dist - b.dist);

      // Snap points are the edges of every clip on every track, which is what
      // lets a clip line up with one on the track above. On its OWN row that
      // means the nearest point can be a neighbour's START, and snapping to it
      // lays the clip straight on top of that neighbour: a collision, not an
      // alignment, and one the user saw flagged red the moment it landed. So a
      // snap that leaves the row clear wins over a nearer one that does not.
      const clear = candidates.find(
        (c) => c.pos >= 0 && !collidesOnRow(item.id, Math.max(0, c.pos), dur, item.trackType, item.trackIndex)
      );
      const chosen = clear || candidates[0];
      const snapped = Math.max(0, chosen ? chosen.pos : rawStart);

      return findNonOverlappingPosition(
        item.id,
        snapped,
        dur,
        item.trackType,
        item.trackIndex,
        DROP_NUDGE_LIMIT_PX / pixelsPerSecond
      );
    },
    [findSnapTarget, findNonOverlappingPosition, collidesOnRow, pixelsPerSecond]
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

        // Check if they overlap. Touching edges do not count - see OVERLAP_EPSILON.
        if (aStart < bEnd - OVERLAP_EPSILON && aEnd > bStart + OVERLAP_EPSILON) {
          overlaps.add(a.id);
          overlaps.add(b.id);
        }
      }
    }
    return overlaps;
  }, []);

  // Overlaps are only a problem on the VIDEO row. The export concatenates video
  // items in start order and black-fills the gaps, so two clips sharing a moment
  // do not composite, they play one after the other and the finished video comes
  // out longer than the timeline says. Audio items are delayed and amixed, which
  // is precisely what overlapping audio is FOR: a line over a music bed is the
  // normal case, not a fault. Painting those red said something was wrong when
  // nothing was.
  const videoOverlaps = useMemo(() => detectOverlaps(videoItems), [videoItems, detectOverlaps]);
  const noOverlaps = useMemo(() => new Set(), []);

  // Calculate drag preview position for the dragged item (with snapping)
  const getDragPreview = useCallback(() => {
    if (!isDragging || !dragItem) return null;

    const deltaTime = dragOffset / pixelsPerSecond;

    if (dragType === "move") {
      return {
        itemId: dragItem.id,
        previewStartTime: resolveMoveStart(dragItem, Math.max(0, dragStartValue + deltaTime)),
        previewDuration: dragItem.duration,
        dragType,
      };
    }

    if (dragType === "trim-end") {
      const sourceDuration = getSourceDuration(dragItem);
      const ts = dragItem.trimStart || 0;
      const newDuration = Math.max(MIN_DURATION, Math.min(dragStartValue + deltaTime, sourceDuration - ts));
      return { itemId: dragItem.id, previewStartTime: dragItem.startTime, previewDuration: newDuration, dragType };
    }

    if (dragType === "trim-start") {
      // Right edge stays fixed: trimming the in-point moves startTime and shrinks duration.
      const te = dragItem.trimEnd ?? ((dragItem.trimStart || 0) + dragItem.duration);
      const newTrimStart = Math.max(0, Math.min(dragStartValue + deltaTime, te - MIN_DURATION));
      const delta = newTrimStart - (dragItem.trimStart || 0);
      return {
        itemId: dragItem.id,
        previewStartTime: Math.max(0, dragItem.startTime + delta),
        previewDuration: te - newTrimStart,
        dragType,
      };
    }

    return null;
  }, [isDragging, dragItem, dragType, dragOffset, dragStartValue, pixelsPerSecond, resolveMoveStart, getSection, getAudioAsset]);

  const dragPreview = getDragPreview();

  // Update snap indicator whenever drag preview changes
  useEffect(() => {
    if (!dragPreview || !dragItem) {
      setSnapIndicator(null);
      return;
    }
    // Snapping only applies to move; trimming has no snap line.
    if (dragType !== "move") {
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

  // Read an X coordinate from either a mouse or a touch event.
  const eventClientX = (e) =>
    e.clientX ?? e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX ?? null;

  // Handle ruler click / tap to seek
  const handleRulerSeek = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = eventClientX(e);
    if (clientX == null) return;
    const x = clientX - rect.left + scrollLeft - TRACK_LABEL_WIDTH;
    const time = x / pixelsPerSecond;
    onSeek(Math.max(0, Math.min(duration, time)));
  };

  // Handle item drag start (mouse or touch)
  const handleItemDragStart = (item, type, e) => {
    e.stopPropagation();
    const clientX = eventClientX(e);
    setIsDragging(true);
    setDragType(type);
    setDragItem(item);
    setDragStartX(clientX ?? 0);
    setDragStartValue(
      type === "move"
        ? item.startTime
        : type === "trim-start"
        ? (item.trimStart || 0)
        : item.duration
    );
  };

  // Handle drag move
  const handleDragMove = useCallback(
    (e) => {
      if (!isDragging || !dragItem) return;
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      if (clientX == null) return;
      // Stop the timeline (and page) from scrolling while dragging a clip on touch.
      if (e.cancelable) e.preventDefault();
      const deltaX = clientX - dragStartX;
      setDragOffset(deltaX); // Update drag offset for visual feedback
    },
    [isDragging, dragItem, dragStartX]
  );

  // Handle drag end (with snapping + overlap prevention)
  const handleDragEnd = useCallback(
    async (e) => {
      if (!isDragging || !dragItem) return;

      const clientX = e.clientX ?? e.changedTouches?.[0]?.clientX ?? dragStartX;
      const deltaX = clientX - dragStartX;

      // A click/tap with no real movement must not persist anything - otherwise
      // selecting a clip re-saves its position and flashes a "Saving…" spinner.
      if (Math.abs(deltaX) < 3) {
        setIsDragging(false);
        setDragType(null);
        setDragItem(null);
        setDragOffset(0);
        setSnapIndicator(null);
        return;
      }

      const deltaTime = deltaX / pixelsPerSecond;

      let updates = {};

      if (dragType === "move") {
        // Snap, then keep off the neighbours, capped so a row with no room holds
        // the clip where it was released rather than flinging it to the end of
        // the timeline. Exactly what the preview drew, from the same call.
        updates.startTime = resolveMoveStart(dragItem, Math.max(0, dragStartValue + deltaTime));
      } else if (dragType === "trim-end") {
        const sourceDuration = getSourceDuration(dragItem);
        const ts = dragItem.trimStart || 0;
        const newDuration = Math.max(MIN_DURATION, Math.min(dragStartValue + deltaTime, sourceDuration - ts));
        updates.duration = newDuration;
        updates.trimEnd = ts + newDuration;
      } else if (dragType === "trim-start") {
        const te = dragItem.trimEnd ?? ((dragItem.trimStart || 0) + dragItem.duration);
        const newTrimStart = Math.max(0, Math.min(dragStartValue + deltaTime, te - MIN_DURATION));
        const delta = newTrimStart - (dragItem.trimStart || 0);
        updates.trimStart = newTrimStart;
        updates.startTime = Math.max(0, dragItem.startTime + delta);
        updates.duration = te - newTrimStart;
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
    [isDragging, dragItem, dragStartX, dragStartValue, dragType, pixelsPerSecond, onUpdateItem, resolveMoveStart, getSection, getAudioAsset]
  );

  // Add mouse + touch event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      // touchmove must be non-passive so we can preventDefault (stop scrolling).
      window.addEventListener("touchmove", handleDragMove, { passive: false });
      window.addEventListener("touchend", handleDragEnd);
      window.addEventListener("touchcancel", handleDragEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("touchend", handleDragEnd);
      window.removeEventListener("touchcancel", handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Handle drop from asset panel (with overlap prevention)
  const handleDrop = (e, trackType, trackIndex) => {
    e.preventDefault();
    setDropRow(null);
    const data = e.dataTransfer.getData("application/json");
    if (!data) return;

    try {
      const asset = JSON.parse(data);
      const rect = containerRef.current.getBoundingClientRect();
      // Minus the label column: the pointer is measured against the scroll
      // container, the time axis starts after the labels.
      const x = e.clientX - rect.left + scrollLeft - TRACK_LABEL_WIDTH;
      let startTime = Math.max(0, x / pixelsPerSecond);

      // The panel sends the asset's real length, so the gap this is fitted into
      // is the gap the item will actually occupy. It used to assume 3s for
      // everything, which fits where a 5s clip does not and dropped it
      // overlapping anyway.
      const assetDuration = Number(asset.duration) > 0 ? Number(asset.duration) : 3;
      startTime = findNonOverlappingPosition(
        null, // no existing item id
        startTime,
        assetDuration,
        trackType,
        trackIndex,
        DROP_NUDGE_LIMIT_PX / pixelsPerSecond
      );

      // A video row that has no room for the clip takes it as an INSERT rather
      // than a stack: everything from the insert point on shifts right by the
      // clip's length. Stacking is meaningless there (the export concatenates
      // video, so a stacked clip just makes the video longer somewhere the user
      // did not ask for), and a brand intro's row is tiled edge to edge, so
      // without this there is nowhere at all to put a clip. Audio rows are left
      // alone: they mix, so laying one under another is a real edit.
      const ripple =
        trackType === "VIDEO" &&
        collidesOnRow(null, startTime, assetDuration, trackType, trackIndex);
      if (ripple) startTime = nearestInsertPoint(startTime, trackType, trackIndex);

      onAssetDrop(asset, trackType, startTime, trackIndex, { ripple });
    } catch (err) {
      console.error("Failed to parse drop data:", err);
    }
  };

  // Highlight the row under the pointer while an asset is being dragged over it,
  // so it is clear where the drop will land (and that dropping is possible).
  const handleDragOver = (e, trackType, trackIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (dropRow?.trackType !== trackType || dropRow?.trackIndex !== trackIndex) {
      setDropRow({ trackType, trackIndex });
    }
  };

  // Fires when the pointer crosses out of a row, including into one of its own
  // children, so the row is only cleared when the pointer has genuinely left it.
  const handleDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDropRow(null);
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
          onClick={handleRulerSeek}
          onTouchEnd={handleRulerSeek}
        >
          <TimelineRuler
            duration={duration}
            pixelsPerSecond={pixelsPerSecond}
            width={timelineWidth}
          />
        </div>

        {/* Tracks Container - tapping empty space deselects (clips stopPropagation) */}
        <div className="relative" onClick={() => onSelectItem(null)}>
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
            onDragOver={(e) => handleDragOver(e, "VIDEO", 0)}
            onDragLeave={handleDragLeave}
            isDropTarget={dropRow?.trackType === "VIDEO"}
            overlappingItems={videoOverlaps}
            dragPreview={dragPreview}
          />

          {/* Narration Track (section narration + TTS voice) */}
          <TimelineTrack
            label="Narration"
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
            onDragOver={(e) => handleDragOver(e, "AUDIO", 0)}
            onDragLeave={handleDragLeave}
            isDropTarget={dropRow?.trackType === "AUDIO" && dropRow?.trackIndex === 0}
            overlappingItems={noOverlaps}
            dragPreview={dragPreview}
          />

          {/* Audio Track (uploaded audio) */}
          <TimelineTrack
            label="Audio"
            trackType="AUDIO"
            trackIndex={1}
            items={audioRowItems}
            height={trackHeight}
            pixelsPerSecond={pixelsPerSecond}
            selectedItem={selectedItem}
            onSelectItem={onSelectItem}
            onItemDragStart={handleItemDragStart}
            onItemEdit={onItemEdit}
            getSection={getSection}
            getAudioAsset={getAudioAsset}
            onDrop={(e) => handleDrop(e, "AUDIO", 1)}
            onDragOver={(e) => handleDragOver(e, "AUDIO", 1)}
            onDragLeave={handleDragLeave}
            isDropTarget={dropRow?.trackType === "AUDIO" && dropRow?.trackIndex === 1}
            overlappingItems={noOverlaps}
            dragPreview={dragPreview}
          />

          {/* Music Track (background music) */}
          <TimelineTrack
            label="Music"
            trackType="AUDIO"
            trackIndex={2}
            items={musicItems}
            height={trackHeight}
            pixelsPerSecond={pixelsPerSecond}
            selectedItem={selectedItem}
            onSelectItem={onSelectItem}
            onItemDragStart={handleItemDragStart}
            onItemEdit={onItemEdit}
            getSection={getSection}
            getAudioAsset={getAudioAsset}
            onDrop={(e) => handleDrop(e, "AUDIO", 2)}
            onDragOver={(e) => handleDragOver(e, "AUDIO", 2)}
            onDragLeave={handleDragLeave}
            isDropTarget={dropRow?.trackType === "AUDIO" && dropRow?.trackIndex === 2}
            overlappingItems={noOverlaps}
            dragPreview={dragPreview}
          />

          {/* Snap indicator line */}
          {snapIndicator && (
            <div
              className="absolute top-0 w-px bg-accent pointer-events-none z-30"
              style={{
                left: snapIndicator.time * pixelsPerSecond + TRACK_LABEL_WIDTH,
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
